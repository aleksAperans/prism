import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface YamlRiskProfile {
  name: string;
  description: string;
  version: string;
  created_at: string;
  created_by: string;
  is_default: boolean;
  risk_scoring_enabled: boolean;
  risk_threshold: number;
  enabled_factors: string[];
  risk_scores: Record<string, number>;
  categories: Record<string, {
    name: string;
    description: string;
    enabled: boolean;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const { profileId } = await request.json();
    
    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    const profilesDir = path.join(process.cwd(), 'src', 'lib', 'risk-profiles');
    
    if (!fs.existsSync(profilesDir)) {
      return NextResponse.json(
        { error: 'Profiles directory not found' },
        { status: 404 }
      );
    }

    // Get all YAML files in the directory
    const files = fs.readdirSync(profilesDir).filter(file => file.endsWith('.yaml'));
    
    // First, set all profiles to not default
    for (const file of files) {
      const filePath = path.join(profilesDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const yamlData = yaml.load(fileContent) as YamlRiskProfile;
      
      if (yamlData.is_default) {
        yamlData.is_default = false;
        const updatedYaml = yaml.dump(yamlData, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false
        });
        fs.writeFileSync(filePath, updatedYaml, 'utf8');
      }
    }
    
    // Set the specified profile as default
    const targetFilePath = path.join(profilesDir, `${profileId}.yaml`);
    
    if (!fs.existsSync(targetFilePath)) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    const targetFileContent = fs.readFileSync(targetFilePath, 'utf8');
    const targetYamlData = yaml.load(targetFileContent) as YamlRiskProfile;
    
    targetYamlData.is_default = true;
    
    const updatedYaml = yaml.dump(targetYamlData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
    
    fs.writeFileSync(targetFilePath, updatedYaml, 'utf8');
    
    return NextResponse.json(
      { 
        message: 'Default profile updated successfully',
        profileId: profileId
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error setting default profile:', error);
    return NextResponse.json(
      { error: 'Failed to set default profile' },
      { status: 500 }
    );
  }
}