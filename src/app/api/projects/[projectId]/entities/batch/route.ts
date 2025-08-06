import { NextRequest, NextResponse } from 'next/server';
import { BatchProcessor } from '@/services/batch/batchProcessor';
import { CSVParser } from '@/services/batch/csvParser';
import type { BatchEntityInput, BatchProcessingOptions } from '@/services/batch/types';
import { auth } from '@/lib/auth';
import { readGlobalSettings } from '@/lib/global-settings';

// Global batch processor instance
const batchProcessor = new BatchProcessor();

export async function POST(
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
    const body = await request.json();
    
    const { csvContent, riskProfile, chunkSize = 10 } = body;
    
    if (!csvContent || !riskProfile) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: csvContent, riskProfile' },
        { status: 400 }
      );
    }

    // Read global settings to get the default match profile
    const globalSettings = await readGlobalSettings();
    const profile = globalSettings.default_match_profile;
    console.log('📋 Batch upload using match profile from global settings:', profile);

    // Parse CSV
    const parseResult = CSVParser.parse(csvContent);
    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'CSV parsing failed',
          parseErrors: parseResult.errors 
        },
        { status: 400 }
      );
    }

    // Debug: Log parsed entities to check address handling
    console.log('🔍 CSV parsed entities (first 3):');
    parseResult.data.slice(0, 3).forEach((entity, index) => {
      console.log(`  Entity ${index + 1}:`, {
        name: entity.name,
        address: entity.address,
        country: entity.country,
        type: entity.type,
        identifier: entity.identifier
      });
    });

    // Validate entity count
    if (parseResult.data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid entities found in CSV' },
        { status: 400 }
      );
    }

    if (parseResult.data.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Batch size too large. Maximum 1000 entities allowed.' },
        { status: 400 }
      );
    }

    // Process batch
    const options: BatchProcessingOptions = {
      projectId,
      riskProfile,
      profile,
      chunkSize: Math.min(chunkSize, 20), // Cap chunk size
    };

    const result = await batchProcessor.processBatch(parseResult.data, options, session.user.id);

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Batch processing error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest
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

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }

    const status = batchProcessor.getJobStatus(jobId);
    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    const results = batchProcessor.getJobResults(jobId);

    return NextResponse.json({
      success: true,
      data: {
        status,
        results: results || [],
      },
    });

  } catch (error) {
    console.error('Get batch status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest
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

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }

    const cancelled = batchProcessor.cancelJob(jobId);
    
    return NextResponse.json({
      success: true,
      data: { cancelled },
    });

  } catch (error) {
    console.error('Cancel batch job error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}