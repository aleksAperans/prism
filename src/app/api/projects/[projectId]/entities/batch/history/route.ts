import { NextRequest, NextResponse } from 'next/server';
import { BatchProcessor } from '@/services/batch/batchProcessor';
import { auth } from '@/lib/auth';

// Global batch processor instance
const batchProcessor = new BatchProcessor();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Fetch batch history for the current user and project
    const history = await batchProcessor.getBatchHistory(session.user.id, projectId, limit);
    
    return NextResponse.json({
      success: true,
      data: history,
    });

  } catch (error) {
    console.error('Get batch history error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}