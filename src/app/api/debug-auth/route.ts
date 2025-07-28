import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
      DATABASE_URL: !!process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
    };

    // Test Prisma connection
    let prismaStatus = 'not tested';
    try {
      const { prisma } = await import('@/lib/prisma');
      await prisma.$connect();
      prismaStatus = 'connected';
      await prisma.$disconnect();
    } catch (prismaError) {
      prismaStatus = `error: ${prismaError instanceof Error ? prismaError.message : 'unknown'}`;
    }

    return NextResponse.json({
      success: true,
      environment: envCheck,
      prisma: prismaStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}