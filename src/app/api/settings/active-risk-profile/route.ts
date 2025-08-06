import { NextRequest, NextResponse } from 'next/server';
import { loadDefaultRiskProfile, loadRiskProfileById } from '@/lib/risk-scoring';
import { auth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
// import yaml from 'js-yaml';

// interface YamlRiskProfile {
//   name: string;
//   description: string;
//   version: string;
//   created_at: string;
//   created_by: string;
//   is_default: boolean;
//   risk_scoring_enabled: boolean;
//   risk_threshold: number;
//   enabled_factors: string[];
//   risk_scores: Record<string, number>;
//   categories: Record<string, {
//     name: string;
//     description: string;
//     enabled: boolean;
//   }>;
// }

// Global settings storage (in production, this would be in a database)
const GLOBAL_SETTINGS_FILE = path.join(process.cwd(), 'src', 'lib', 'global-settings.json');

interface GlobalSettings {
  active_risk_profile_id: string;
  updated_at: string;
  updated_by: string;
}

function loadGlobalSettings(): GlobalSettings | null {
  try {
    if (fs.existsSync(GLOBAL_SETTINGS_FILE)) {
      const content = fs.readFileSync(GLOBAL_SETTINGS_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading global settings:', error);
  }
  return null;
}

function saveGlobalSettings(settings: GlobalSettings): void {
  try {
    fs.writeFileSync(GLOBAL_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving global settings:', error);
    throw error;
  }
}

export async function GET() {
  try {
    // Load global settings
    const globalSettings = loadGlobalSettings();
    
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
    const globalSettings: GlobalSettings = {
      active_risk_profile_id: profileId,
      updated_at: new Date().toISOString(),
      updated_by: session.user.id || session.user.email || 'unknown'
    };

    saveGlobalSettings(globalSettings);

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