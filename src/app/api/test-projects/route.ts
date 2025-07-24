import { NextResponse } from 'next/server';
import { projectService } from '@/services/api/projects';

export async function GET() {
  try {
    console.log('Testing project service directly...');
    
    // Test direct call to project service
    const result = await projectService.getProjects({
      limit: 10,
      archived: false,
    });
    
    console.log('Project service result:', JSON.stringify(result, null, 2));
    
    return NextResponse.json({
      success: true,
      result,
      resultKeys: Object.keys(result),
      dataLength: result.data?.length || 0,
    });
  } catch (error) {
    console.error('Project service test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Project service test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}