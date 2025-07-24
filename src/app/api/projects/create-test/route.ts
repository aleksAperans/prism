import { NextResponse } from 'next/server';
import { projectService } from '@/services/api/projects';

export async function POST() {
  try {
    // Create a test project
    const testProject = await projectService.createProject(
      'Default Screening Project',
      { org: 'admin' }
    );

    return NextResponse.json({
      success: true,
      data: testProject,
      message: 'Test project created successfully',
    });
  } catch (error) {
    console.error('Failed to create test project:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create test project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}