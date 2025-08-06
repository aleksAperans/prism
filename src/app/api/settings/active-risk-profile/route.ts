import { NextRequest, NextResponse } from 'next/server';
import { loadDefaultRiskProfile, loadRiskProfileById } from '@/lib/risk-scoring';
import { auth } from '@/lib/auth';
import { readGlobalSettings, writeGlobalSettings } from '@/lib/global-settings';

export async function GET() {
  try {
    // Load global settings
    const globalSettings = await readGlobalSettings();
    
    let profile;
    if (globalSettings?.active_risk_profile_id) {
      // Try to load the specified active profile
      profile = await loadRiskProfileById(globalSettings.active_risk_profile_id);
    }
    
    // Fallback to default profile if no global setting or profile not found
    if (!profile) {
      profile = await loadDefaultRiskProfile();
    }
    
    if (!profile) {
      return NextResponse.json(
        { error: 'No risk profile could be loaded' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      profile,
      isGlobalSetting: !!globalSettings?.active_risk_profile_id
    });
  } catch (error) {
    console.error('Error loading active risk profile:', error);
    return NextResponse.json(
      { error: 'Failed to load active risk profile' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { profileId } = await request.json();
    
    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    // Verify the profile exists
    const profile = await loadRiskProfileById(profileId);
    if (!profile) {
      return NextResponse.json(
        { error: 'Risk profile not found' },
        { status: 404 }
      );
    }

    // Save global settings
    const globalSettings = {
      active_risk_profile_id: profileId,
      default_match_profile: 'corporate' as const,
      updated_at: new Date().toISOString(),
      updated_by: session.user.id || session.user.email || 'unknown'
    };

    await writeGlobalSettings(globalSettings);

    console.log(`✅ Global active risk profile set to: ${profile.name} (${profileId})`);

    return NextResponse.json({
      success: true,
      message: 'Active risk profile updated successfully',
      profile,
      profileId
    });
    
  } catch (error) {
    console.error('Error setting active risk profile:', error);
    return NextResponse.json(
      { error: 'Failed to set active risk profile' },
      { status: 500 }
    );
  }
}