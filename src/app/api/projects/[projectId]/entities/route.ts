import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/api/projects';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const querySchema = z.object({
  limit: z.coerce.number().max(10000).optional(),
  next: z.string().optional(),
  prev: z.string().optional(),
  entity_types: z.array(z.string()).optional(),
  geo_facets: z.coerce.boolean().optional(),
  hs_codes: z.array(z.string()).optional(),
  received_hs_codes: z.array(z.string()).optional(),
  shipped_hs_codes: z.array(z.string()).optional(),
  combined_hs_codes: z.array(z.string()).optional(),
  translation: z.string().optional(),
  sort: z.string().optional(),
  filters: z.array(z.string()).optional(),
}).optional();

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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      limit: searchParams.get('limit'),
      next: searchParams.get('next'),
      prev: searchParams.get('prev'),
      entity_types: searchParams.getAll('entity_types'),
      geo_facets: searchParams.get('geo_facets'),
      hs_codes: searchParams.getAll('hs_codes'),
      received_hs_codes: searchParams.getAll('received_hs_codes'),
      shipped_hs_codes: searchParams.getAll('shipped_hs_codes'),
      combined_hs_codes: searchParams.getAll('combined_hs_codes'),
      translation: searchParams.get('translation'),
      sort: searchParams.get('sort'),
      filters: searchParams.getAll('filters'),
    };

    // Filter out null values and empty arrays
    const cleanedParams = Object.fromEntries(
      Object.entries(queryParams).filter(([, value]) => {
        if (value === null) return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      })
    );

    // Validate parameters
    const validatedParams = querySchema.parse(cleanedParams);

    // Await params and fetch project entities from Sayari API
    const { projectId } = await params;
    const response = await projectService.getProjectEntities(projectId, validatedParams);

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Failed to fetch project entities:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.issues,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch project entities',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}