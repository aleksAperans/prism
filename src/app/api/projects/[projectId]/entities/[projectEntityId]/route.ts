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
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove entity from project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}