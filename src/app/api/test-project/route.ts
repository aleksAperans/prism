import { NextResponse } from 'next/server';
import { projectService } from '@/services/api/projects';

export async function GET() {
  try {
    console.log('Testing project creation...');
    
    // Test authentication and project creation
    const project = await projectService.createProject('test-project-' + Date.now());
    
    console.log('Project created successfully:', project);
    
    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        label: project.label,
        created: project.created,
      },
    });
    
  } catch (error) {
    console.error('Project test failed:', error);
    return NextResponse.json(
      { 
        error: 'Project test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    console.log('Testing project listing...');
    
    // Test getting projects
    const projects = await projectService.getProjects();
    
    console.log('Projects retrieved:', projects.data.length);
    
    return NextResponse.json({
      success: true,
      projects: projects.data.map(p => ({
        id: p.id,
        label: p.label,
        created: p.created,
      })),
    });
    
  } catch (error) {
    console.error('Project listing test failed:', error);
    return NextResponse.json(
      { 
        error: 'Project listing test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}