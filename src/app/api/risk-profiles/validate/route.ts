import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface RiskProfileValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  defaultProfiles: Array<{
    name: string;
    file: string;
    isDefault: boolean;
  }>;
}

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const validation: RiskProfileValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      defaultProfiles: []
    };

    const profilesDir = path.join(process.cwd(), 'src', 'lib', 'risk-profiles');
    
    if (!fs.existsSync(profilesDir)) {
      validation.isValid = false;
      validation.errors.push('Risk profiles directory not found');
      return NextResponse.json(validation);
    }

    // Get all YAML files in the directory
    const files = fs.readdirSync(profilesDir).filter(file => file.endsWith('.yaml'));
    
    if (files.length === 0) {
      validation.isValid = false;
      validation.errors.push('No risk profile files found');
      return NextResponse.json(validation);
    }

    // Check each profile file
    for (const file of files) {
      try {
        const filePath = path.join(profilesDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const yamlData = yaml.load(fileContent) as {
          name: string;
          description: string;
          is_default: boolean;
          enabled_factors: string[];
          created_at: string;
          created_by: string;
          risk_scoring_enabled: boolean;
          risk_threshold: number;
          risk_scores: Record<string, number>;
          categories: Record<string, { name: string; description: string; enabled: boolean }>;
        };
        
        // Track all profiles and their default status
        validation.defaultProfiles.push({
          name: yamlData.name || file,
          file: file,
          isDefault: yamlData.is_default || false
        });

        // Basic validation
        if (!yamlData.name) {
          validation.warnings.push(`Profile ${file} missing 'name' field`);
        }
        if (!yamlData.enabled_factors || yamlData.enabled_factors.length === 0) {
          validation.warnings.push(`Profile ${file} has no enabled factors`);
        }
        
      } catch (error) {
        validation.isValid = false;
        validation.errors.push(`Failed to parse ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Validate default profile configuration
    const defaultProfiles = validation.defaultProfiles.filter(p => p.isDefault);
    
    if (defaultProfiles.length === 0) {
      validation.isValid = false;
      validation.errors.push('No risk profile marked as default (is_default: true)');
    } else if (defaultProfiles.length > 1) {
      validation.isValid = false;
      validation.errors.push(`Multiple risk profiles marked as default: ${defaultProfiles.map(p => p.name).join(', ')}`);
      validation.errors.push('Please ensure only ONE profile has is_default: true');
    }

    return NextResponse.json({
      success: true,
      validation
    });

  } catch (error) {
    console.error('Risk profile validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate risk profiles' },
      { status: 500 }
    );
  }
}