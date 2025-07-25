import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface YamlRiskProfile {
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

interface RiskProfile {
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

const PROFILES_DIR = path.join(process.cwd(), 'src/lib/risk-profiles');

async function loadYamlProfiles(): Promise<RiskProfile[]> {
  try {
    const files = await fs.readdir(PROFILES_DIR);
    const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
    
    const profiles: RiskProfile[] = [];
    
    for (const file of yamlFiles) {
      try {
        const filePath = path.join(PROFILES_DIR, file);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const yamlData = yaml.load(fileContent) as YamlRiskProfile;
        
        const profile: RiskProfile = {
          id: path.basename(file, path.extname(file)),
          name: yamlData.name,
          description: yamlData.description,
          enabledFactors: yamlData.enabled_factors,
          isDefault: yamlData.is_default,
          createdAt: yamlData.created_at,
          createdBy: yamlData.created_by,
          riskScoringEnabled: yamlData.risk_scoring_enabled || false,
          riskThreshold: yamlData.risk_threshold || 5,
          riskScores: yamlData.risk_scores || yamlData.risk_points || {},
          categories: yamlData.categories,
        };
        
        profiles.push(profile);
      } catch (error) {
        console.error(`Failed to load profile ${file}:`, error);
      }
    }
    
    // Sort profiles with default first
    return profiles.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Failed to load YAML profiles:', error);
    return [];
  }
}

export async function GET() {
  try {
    const profiles = await loadYamlProfiles();
    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Failed to load risk profiles:', error);
    return NextResponse.json(
      { error: 'Failed to load risk profiles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('=== POST /api/risk-profiles called ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  
  try {
    const contentType = request.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    const body = await request.json();
    console.log('Request body keys:', Object.keys(body));
    console.log('ID value:', body.id);
    console.log('YAML length:', body.yaml?.length);
    
    const { id, yaml } = body;
    
    if (!id || !yaml) {
      console.error('Missing required fields:', { id: !!id, yaml: !!yaml });
      return NextResponse.json(
        { error: 'Missing required fields: id and yaml' },
        { status: 400 }
      );
    }
    
    // Validate the filename - ensure it's safe and not empty
    const safeId = id.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!safeId) {
      console.error('Invalid profile ID after sanitization:', id);
      return NextResponse.json(
        { error: 'Invalid profile ID' },
        { status: 400 }
      );
    }
    const filePath = path.join(PROFILES_DIR, `${safeId}.yaml`);
    
    console.log('Writing to file:', filePath);
    console.log('YAML content length:', yaml.length);
    
    // Write the YAML file
    await fs.writeFile(filePath, yaml, 'utf8');
    
    console.log('File written successfully');
    return NextResponse.json({ success: true, id: safeId });
  } catch (error) {
    console.error('Failed to save risk profile:', error);
    return NextResponse.json(
      { error: 'Failed to save risk profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing profile id' },
        { status: 400 }
      );
    }
    
    const safeId = id.replace(/[^a-z0-9-]/gi, '-');
    const filePath = path.join(PROFILES_DIR, `${safeId}.yaml`);
    
    // Check if file exists and read its content to check created_by
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const yamlData = yaml.load(fileContent) as YamlRiskProfile;
      
      // Prevent deleting system profiles (created_by: "system")
      if (yamlData.created_by === 'system') {
        return NextResponse.json(
          { error: 'Cannot delete system profiles' },
          { status: 403 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    // Delete the file
    await fs.unlink(filePath);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete risk profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete risk profile' },
      { status: 500 }
    );
  }
}