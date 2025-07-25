import { NextRequest, NextResponse } from 'next/server';
import { loadRiskProfileById } from '@/lib/risk-scoring';
import { auth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const profileId = params.id;
    
    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    // Load the risk profile by ID
    const profile = await loadRiskProfileById(profileId);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Risk profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('Get risk profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch risk profile' },
      { status: 500 }
    );
  }
}