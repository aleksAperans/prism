import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Debug API called');
    
    // Check environment variables
    const envCheck = {
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_SECRET_LENGTH: process.env.NEXTAUTH_SECRET?.length || 0,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
      DATABASE_URL: !!process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    };

    console.log('🔍 Environment check:', envCheck);

    // Test Prisma connection (skip for now due to potential issues)
    const prismaStatus = 'skipped for debugging';

    // Test NextAuth import
    let nextAuthStatus = 'not tested';
    try {
      const { auth } = await import('@/lib/auth');
      nextAuthStatus = 'imported successfully';
    } catch (authError) {
      nextAuthStatus = `error: ${authError instanceof Error ? authError.message : 'unknown'}`;
    }

    return NextResponse.json({
      success: true,
      environment: envCheck,
      prisma: prismaStatus,
      nextAuth: nextAuthStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('🚨 Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}