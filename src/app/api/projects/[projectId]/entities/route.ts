import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sayariClient, { withRateLimit } from '@/services/api/client';
import { z } from 'zod';

// const querySchema = z.object({
//   limit: z.coerce.number().max(100).optional(),
//   next: z.string().optional(),
//   prev: z.string().optional(),
//   entity_types: z.array(z.string()).optional(),
//   geo_facets: z.coerce.boolean().optional(),
//   hs_codes: z.array(z.string()).optional(),
//   received_hs_codes: z.array(z.string()).optional(),
//   shipped_hs_codes: z.array(z.string()).optional(),
//   combined_hs_codes: z.array(z.string()).optional(),
//   translation: z.string().optional(),
//   sort: z.string().optional(),
//   filters: z.array(z.string()).optional(),
// }).optional();

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
    
    // Simplified parameter parsing
    const limitParam = searchParams.get('limit');
    const validatedParams = limitParam ? { limit: parseInt(limitParam) } : undefined;

    // Await params and fetch project entities from Sayari API
    const { projectId } = await params;
    
    try {
      const response = await withRateLimit(async () => {
        const basicParams = validatedParams?.limit ? { limit: validatedParams.limit } : {};
        
        return await sayariClient.get(`/v1/projects/${projectId}/entities`, {
          params: basicParams
        });
      });
      

      return NextResponse.json({
        success: true,
        data: response.data,
      });
    } catch (apiError) {
      throw apiError;
    }
  } catch (error) {
    
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
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}