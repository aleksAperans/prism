import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'src/lib/global-settings.json');

const VALID_PROFILES = ['corporate', 'suppliers', 'search', 'screen'] as const;
type MatchProfile = typeof VALID_PROFILES[number];

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Read current settings
    const settingsContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
    const settings = JSON.parse(settingsContent);

    return NextResponse.json({
      default_match_profile: settings.default_match_profile || 'corporate',
      updated_at: settings.updated_at,
      updated_by: settings.updated_by,
    });
  } catch (error) {
    console.error('Failed to read match profile settings:', error);
    
    // Return default if file doesn't exist or has errors
    return NextResponse.json({
      default_match_profile: 'corporate',
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { default_match_profile } = body;

    // Validate profile
    if (!default_match_profile || !VALID_PROFILES.includes(default_match_profile)) {
      return NextResponse.json(
        { error: 'Invalid match profile. Must be one of: corporate, suppliers, search, screen' },
        { status: 400 }
      );
    }

    // Read current settings
    let settings;
    try {
      const settingsContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
      settings = JSON.parse(settingsContent);
    } catch (error) {
      // If file doesn't exist, create default settings
      settings = {
        active_risk_profile_id: 'core',
      };
    }

    // Update settings
    settings.default_match_profile = default_match_profile;
    settings.updated_at = new Date().toISOString();
    settings.updated_by = session.user?.id || session.user?.email || 'unknown';

    // Write updated settings
    await fs.writeFile(
      SETTINGS_FILE_PATH,
      JSON.stringify(settings, null, 2)
    );

    return NextResponse.json({
      success: true,
      default_match_profile: settings.default_match_profile,
      updated_at: settings.updated_at,
      updated_by: settings.updated_by,
    });
  } catch (error) {
    console.error('Failed to update match profile settings:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to update match profile settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}