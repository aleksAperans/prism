import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/api/projects';
import { auth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    console.log('🔍 DEBUG: Starting debug entities API call');
    
    // Check authentication
    const session = await auth();
    console.log('🔍 DEBUG: Session check:', session ? 'authenticated' : 'not authenticated');
    
    if (!session) {
      console.log('❌ DEBUG: No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get project ID
    const { projectId } = await params;
    console.log('🔍 DEBUG: Project ID:', projectId);

    // Make the API call with minimal parameters
    console.log('🔍 DEBUG: Making API call to Sayari...');
    const response = await projectService.getProjectEntities(projectId, { limit: 10 });
    console.log('🔍 DEBUG: API response received:', {
      dataLength: response.data?.length || 0,
      hasData: !!response.data
    });

    return NextResponse.json({
      success: true,
      debug: {
        projectId,
        authenticated: true,
        responseCount: response.data?.length || 0
      },
      data: response,
    });
  } catch (error) {
    console.error('❌ DEBUG: Error in debug API:', error);
    console.error('❌ DEBUG: Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
    });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Debug API failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}