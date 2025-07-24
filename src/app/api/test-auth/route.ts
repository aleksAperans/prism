import { NextResponse } from 'next/server';
import { sayariAuthService } from '@/services/api/auth';
import { config } from '@/lib/config';

export async function GET() {
  try {
    console.log('Testing Sayari API authentication...');
    console.log('Base URL:', config.sayari.baseUrl);
    console.log('Client ID:', config.sayari.clientId);
    console.log('Has Client Secret:', !!config.sayari.clientSecret);
    
    // Test authentication
    const token = await sayariAuthService.getAccessToken();
    
    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      tokenLength: token.length,
      baseUrl: config.sayari.baseUrl,
    });
  } catch (error) {
    console.error('Authentication test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        baseUrl: config.sayari.baseUrl,
        clientId: config.sayari.clientId,
        hasClientSecret: !!config.sayari.clientSecret,
      },
      { status: 500 }
    );
  }
}