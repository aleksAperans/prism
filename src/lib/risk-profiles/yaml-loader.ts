import yaml from 'js-yaml';

export interface YamlRiskProfile {
  name: string;
  description: string;
  version: string;
  created_at: string;
  created_by: string;
  is_default: boolean;
  risk_scoring_enabled?: boolean;
  risk_threshold?: number;
  enabled_factors: string[];
  risk_scores?: Record<string, number>;
  risk_points?: Record<string, number>;
  categories: Record<string, {
    name: string;
    description: string;
    enabled: boolean;
  }>;
}

export interface RiskProfile {
  id: string;
  name: string;
  description: string;
  enabledFactors: string[];
  isDefault: boolean;
  createdAt: string;
  createdBy: string;
  riskScoringEnabled?: boolean;
  riskThreshold?: number;
  riskScores?: Record<string, number>;
  categories: Record<string, {
    name: string;
    description: string;
    enabled: boolean;
  }>;
}

// Client-side only functions
export async function loadYamlProfiles(): Promise<RiskProfile[]> {
  try {
    const response = await fetch('/api/risk-profiles');
    if (!response.ok) {
      throw new Error('Failed to fetch risk profiles');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to load YAML profiles from API:', error);
    return [];
  }
}

export async function saveYamlProfile(profile: Omit<RiskProfile, 'id'> & { id?: string }): Promise<void> {
  const profileId = profile.id || profile.name.toLowerCase().replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  
  console.log('Saving profile with ID:', profileId);
  console.log('Profile name:', profile.name);
  
  const yamlData: YamlRiskProfile = {
    name: profile.name,
    description: profile.description,
    version: "1.0",
    created_at: new Date().toISOString(),
    created_by: "user",
    is_default: profile.isDefault,
    risk_scoring_enabled: profile.riskScoringEnabled || false,
    risk_threshold: profile.riskThreshold || 5,
    enabled_factors: profile.enabledFactors,
    risk_scores: profile.riskScores || {},
    categories: profile.categories,
  };
  
  const yamlContent = yaml.dump(yamlData, {
    indent: 2,
    lineWidth: -1,
  });
  
  // Client-side: save via API
  console.log('Making API request to save profile...');
  console.log('Profile ID after sanitization:', profileId);
  console.log('YAML content size:', yamlContent.length);
  
  try {
    const response = await fetch('/api/risk-profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: profileId,
        yaml: yamlContent,
      }),
    });
    
    console.log('API response status:', response.status);
    console.log('API response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('API error response:', errorData);
      throw new Error(`Failed to save risk profile: ${response.status} ${errorData}`);
    }
    
    const result = await response.json();
    console.log('API success response:', result);
  } catch (networkError) {
    console.error('Network error during API call:', networkError);
    throw new Error(`Network error: ${networkError instanceof Error ? networkError.message : 'Unknown error'}`);
  }
}

// Client-side versions using fetch
export const clientLoadYamlProfiles = () => loadYamlProfiles();
export const clientSaveYamlProfile = (profile: Omit<RiskProfile, 'id'> & { id?: string }) => saveYamlProfile(profile);