import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sayariClient from '@/services/api/client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { matchId } = await params;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const projectEntityId = searchParams.get('project_entity_id');

    if (!projectId || !projectEntityId || !matchId) {
      return NextResponse.json(
        { error: 'Missing required parameters: project_id, project_entity_id, and match_id' },
        { status: 400 }
      );
    }

    // URL encode the match_id to handle special characters like colons
    const encodedMatchId = encodeURIComponent(matchId);

    try {
      // Delete the match
      try {
        await sayariClient.delete(`/v1/projects/${projectId}/entities/${projectEntityId}/matches/${encodedMatchId}`);
      } catch (deleteError: unknown) {
        // Handle 404 - match might already be deleted
        if (deleteError && typeof deleteError === 'object' && 'status' in deleteError && (deleteError as { status: number }).status === 404) {
          console.log('⚠️ Match not found (404) - possibly already deleted:', matchId);
          // Continue to refresh entity data to get current state
        } else {
          // Re-throw other errors
          throw deleteError;
        }
      }
      
      // Add a longer delay to ensure the deletion has fully propagated on the server
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Follow-up with refresh call to get current entity state
      const refreshedEntityResponse = await sayariClient.get(`/v1/projects/${projectId}/entities/${projectEntityId}`);
      const refreshedEntity = refreshedEntityResponse.data.data;
      
      return NextResponse.json({
        success: true,
        message: 'Match removed successfully',
        refreshedEntity: {
          matches: refreshedEntity.matches || [],
          risk_factors: refreshedEntity.risk_factors || [],
          match_count: refreshedEntity.matches?.length || 0,
          project_entity_id: refreshedEntity.project_entity_id,
          label: refreshedEntity.label
        }
      });
    } catch (error) {
      console.error('❌ Failed to remove match:', {
        error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : 'Not an Error instance',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        hasStatus: error && typeof error === 'object' && 'status' in error,
        hasResponse: error && typeof error === 'object' && 'response' in error
      });
      
      // Handle Sayari API errors (axios errors)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { status: number; data: unknown; statusText: string } };
        console.error('Axios response error:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data
        });
        
        return NextResponse.json(
          { 
            error: 'Failed to remove match from Sayari API', 
            details: axiosError.response?.statusText || 'API request failed',
            status: axiosError.response?.status
          },
          { status: axiosError.response?.status || 500 }
        );
      }
      
      // Handle custom Sayari API errors
      if (error && typeof error === 'object' && 'status' in error) {
        const apiError = error as { status: number; message: string; code?: string };
        return NextResponse.json(
          { 
            error: 'Failed to remove match from Sayari API', 
            details: apiError.message,
            code: apiError.code
          },
          { status: apiError.status }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to remove match',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Unexpected error in delete match handler:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}