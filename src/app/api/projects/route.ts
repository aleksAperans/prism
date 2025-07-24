import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/api/projects';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const querySchema = z.object({
  limit: z.coerce.number().optional(),
  archived: z.string().transform(val => val === 'true').optional(),
  next: z.string().optional(),
  prev: z.string().optional(),
}).optional();

const createProjectSchema = z.object({
  label: z.string().min(1, 'Project name is required'),
  share: z.object({
    org: z.enum(['viewer', 'editor', 'admin'])
  }).optional()
});

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      limit: searchParams.get('limit'),
      archived: searchParams.get('archived'),
      next: searchParams.get('next'),
      prev: searchParams.get('prev'),
    };

    // Validate and transform query parameters
    const validatedParams = querySchema.parse(
      Object.fromEntries(
        Object.entries(queryParams).filter(([, value]) => value !== null)
      )
    );

    // Fetch projects from Sayari API
    const response = await projectService.getProjects(validatedParams);

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const validatedData = createProjectSchema.parse(body);

    // Create project using Sayari API
    const project = await projectService.createProject(
      validatedData.label,
      validatedData.share
    );

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Failed to create project:', error);
    
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
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}