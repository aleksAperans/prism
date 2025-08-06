// In-memory store for global settings
// This is a temporary solution for serverless environments where filesystem is read-only
// In production, this should be replaced with a database or external storage service

interface GlobalSettings {
  active_risk_profile_id: string;
  default_match_profile: 'corporate' | 'suppliers' | 'search' | 'screen';
  updated_at: string;
  updated_by: string;
}

// In-memory cache for settings
let settingsCache: GlobalSettings | null = null;

// Default settings
const DEFAULT_SETTINGS: GlobalSettings = {
  active_risk_profile_id: 'core',
  default_match_profile: 'corporate',
  updated_at: new Date().toISOString(),
  updated_by: 'system',
};

export function getInMemorySettings(): GlobalSettings {
  if (!settingsCache) {
    // Initialize with defaults or from environment variables
    settingsCache = {
      ...DEFAULT_SETTINGS,
      active_risk_profile_id: process.env.DEFAULT_RISK_PROFILE_ID || 'core',
      default_match_profile: (process.env.DEFAULT_MATCH_PROFILE as GlobalSettings['default_match_profile']) || 'corporate',
    };
  }
  return { ...settingsCache };
}

export function setInMemorySettings(settings: GlobalSettings): void {
  settingsCache = { ...settings };
  console.log('Settings updated in memory:', settingsCache);
}

export function resetInMemorySettings(): void {
  settingsCache = null;
}