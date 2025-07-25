import { NextResponse } from 'next/server';
import { loadDefaultRiskProfile } from '@/lib/risk-scoring';

export async function GET() {
  try {
    const profile = await loadDefaultRiskProfile();
    
    if (!profile) {
      return NextResponse.json(
        { error: 'No default risk profile found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Error loading default risk profile:', error);
    return NextResponse.json(
      { error: 'Failed to load default risk profile' },
      { status: 500 }
    );
  }
}