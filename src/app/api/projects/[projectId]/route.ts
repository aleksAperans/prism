import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/api/projects';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const updateProjectSchema = z.object({
  archived: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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

    const { projectId } = await params;
    const project = await projectService.getProject(projectId);

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Failed to fetch project:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateProjectSchema.parse(body);

    // Update project using Sayari API
    const { projectId } = await params;
    const project = await projectService.updateProject(projectId, validatedData);

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Failed to update project:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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

    // Delete project using Sayari API
    const { projectId } = await params;
    await projectService.deleteProject(projectId);

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete project:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}