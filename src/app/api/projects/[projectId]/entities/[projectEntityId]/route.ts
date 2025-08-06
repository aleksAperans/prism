import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/api/projects';
import { auth } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; projectEntityId: string }> }
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

    // Get params
    const { projectId, projectEntityId } = await params;

    // Delete entity from project via Sayari API
    await projectService.deleteProjectEntity(projectId, projectEntityId);

    return NextResponse.json({
      success: true,
      message: 'Entity successfully removed from project',
    });
  } catch (error) {
    console.error('Failed to delete project entity:', error);
    
    // Check if it's a Sayari API error
    let statusCode = 500;
    let errorMessage = 'Failed to remove entity from project';
    
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as any;
      if (apiError.response?.status === 429) {
        statusCode = 429;
        errorMessage = 'Rate limit exceeded. Please try again in a moment.';
      } else if (apiError.response?.status === 404) {
        statusCode = 404;
        errorMessage = 'Entity not found in project';
      } else if (apiError.response?.data?.message) {
        errorMessage = apiError.response.data.message;
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: statusCode }
    );
  }
}