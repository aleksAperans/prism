import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'src/lib/global-settings.json');

interface GlobalSettings {
  active_risk_profile_id: string;
  default_match_profile: 'corporate' | 'suppliers' | 'search' | 'screen';
  updated_at: string;
  updated_by: string;
}

export async function readGlobalSettings(): Promise<GlobalSettings> {
  try {
    const settingsContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
    const settings = JSON.parse(settingsContent);
    
    // Ensure we have a valid default_match_profile
    if (!settings.default_match_profile || !['corporate', 'suppliers', 'search', 'screen'].includes(settings.default_match_profile)) {
      settings.default_match_profile = 'corporate';
    }
    
    return settings;
  } catch (error) {
    console.error('Failed to read global settings:', error);
    // Return default settings if file doesn't exist or has errors
    return {
      active_risk_profile_id: 'core',
      default_match_profile: 'corporate',
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    };
  }
}

export async function writeGlobalSettings(settings: GlobalSettings): Promise<void> {
  try {
    await fs.writeFile(
      SETTINGS_FILE_PATH,
      JSON.stringify(settings, null, 2)
    );
  } catch (error) {
    console.error('Failed to write global settings:', error);
    throw error;
  }
}