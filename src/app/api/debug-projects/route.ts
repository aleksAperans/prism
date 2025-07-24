import { NextResponse } from 'next/server';
import sayariClient from '@/services/api/client';

export async function GET() {
  try {
    console.log('Making raw request to Sayari API...');
    
    // Make raw request to Sayari API
    const response = await sayariClient.get('/v1/projects', {
      params: {
        limit: 50,
        archived: false,
      },
    });
    
    console.log('Raw Sayari API Response:', JSON.stringify(response.data, null, 2));
    
    return NextResponse.json({
      success: true,
      rawResponse: response.data,
      responseKeys: Object.keys(response.data),
    });
  } catch (error) {
    console.error('Debug projects failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Debug request failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}