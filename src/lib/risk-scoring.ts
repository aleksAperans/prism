/**
 * Risk scoring utilities for calculating entity risk scores based on risk factors
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { RiskProfile } from '@/lib/risk-profiles/yaml-loader';

export interface EntityRiskScore {
  totalScore: number;
  triggeredRiskFactors: Array<{
    id: string;
    score: number;
  }>;
  meetsThreshold: boolean;
  threshold: number;
}

/**
 * Calculate risk score for an entity based on risk profile and triggered risk factors
 */
export function calculateEntityRiskScore(
  triggeredRiskFactorIds: string[],
  riskProfile: RiskProfile
): EntityRiskScore {
  // If risk scoring is not enabled, return default values
  if (!riskProfile.riskScoringEnabled) {
    return {
      totalScore: 0,
      triggeredRiskFactors: [],
      meetsThreshold: false,
      threshold: 0,
    };
  }

  const riskScores = riskProfile.riskScores || {};
  const threshold = riskProfile.riskThreshold || 5;
  
  // Calculate triggered risk factors with their scores
  const triggeredRiskFactors = triggeredRiskFactorIds
    .map(factorId => ({
      id: factorId,
      score: riskScores[factorId] || 0
    }))
    .filter(factor => factor.score > 0); // Only include factors with assigned scores
  
  // Calculate total score
  const totalScore = triggeredRiskFactors.reduce((sum, factor) => sum + factor.score, 0);
  
  // Check if threshold is met
  const meetsThreshold = totalScore >= threshold;
  
  return {
    totalScore,
    triggeredRiskFactors,
    meetsThreshold,
    threshold,
  };
}

/**
 * Extract risk factor IDs from screening result matches
 */
export function extractRiskFactorIds(matches: Array<{ risk_factors?: Array<{ id: string }> }>): string[] {
  const riskFactorIds: string[] = [];
  
  matches.forEach(match => {
    if (match.risk_factors) {
      match.risk_factors.forEach(riskFactor => {
        if (riskFactor.id && !riskFactorIds.includes(riskFactor.id)) {
          riskFactorIds.push(riskFactor.id);
        }
      });
    }
  });
  
  return riskFactorIds;
}

/**
 * Format risk score for display
 */
export function formatRiskScore(score: number): string {
  return score.toString();
}

/**
 * Get risk level based on score and threshold
 */
export function getRiskLevel(score: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score === 0) return 'low';
  if (score < threshold) return 'medium';
  if (score < threshold * 1.5) return 'high';
  return 'critical';
}

/**
 * Load a specific risk profile by ID (server-side)
 */
export async function loadRiskProfileById(profileId: string): Promise<RiskProfile | null> {
  try {
    const profilesDir = path.join(process.cwd(), 'src', 'lib', 'risk-profiles');
    const filePath = path.join(profilesDir, `${profileId}.yaml`);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`Risk profile not found: ${profileId}`);
      return null;
    }

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
    
    const profile: RiskProfile = {
      id: profileId,
      name: yamlData.name,
      description: yamlData.description,
      enabledFactors: yamlData.enabled_factors || [],
      isDefault: yamlData.is_default || false,
      createdAt: yamlData.created_at,
      createdBy: yamlData.created_by || 'system',
      riskScoringEnabled: yamlData.risk_scoring_enabled || false,
      riskThreshold: yamlData.risk_threshold || 5,
      riskScores: yamlData.risk_scores || {},
      categories: yamlData.categories || {}
    };
    
    console.log('✅ Loaded risk profile:', profile.name);
    return profile;
  } catch (error) {
    console.error('Failed to load risk profile:', error);
    return null;
  }
}

/**
 * Load the default risk profile configuration (server-side)
 */
export async function loadDefaultRiskProfile(): Promise<RiskProfile | null> {
  try {
    const profilesDir = path.join(process.cwd(), 'src', 'lib', 'risk-profiles');
    
    if (!fs.existsSync(profilesDir)) {
      console.warn('Risk profiles directory not found');
      return null;
    }

    // Get all YAML files in the directory
    const files = fs.readdirSync(profilesDir).filter(file => file.endsWith('.yaml'));
    
    // First pass: validate that only one profile is marked as default
    const defaultProfiles: string[] = [];
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
        
        if (yamlData.is_default) {
          defaultProfiles.push(`${yamlData.name} (${file})`);
        }
      } catch (error) {
        console.warn(`Failed to parse risk profile ${file}:`, error);
      }
    }
    
    // Validate default profile configuration
    if (defaultProfiles.length === 0) {
      console.warn('⚠️ No risk profile marked as default (is_default: true)');
      return null;
    } else if (defaultProfiles.length > 1) {
      console.error('❌ CONFIGURATION ERROR: Multiple risk profiles marked as default:');
      defaultProfiles.forEach(profile => console.error(`   - ${profile}`));
      console.error('❌ Please ensure only ONE profile has is_default: true');
      return null;
    }
    
    // Second pass: load the single default profile
    for (const file of files) {
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
      
      if (yamlData.is_default) {
        const profile: RiskProfile = {
          id: file.replace('.yaml', ''),
          name: yamlData.name,
          description: yamlData.description,
          enabledFactors: yamlData.enabled_factors || [],
          isDefault: yamlData.is_default || false,
          createdAt: yamlData.created_at,
          createdBy: yamlData.created_by || 'system',
          riskScoringEnabled: yamlData.risk_scoring_enabled || false,
          riskThreshold: yamlData.risk_threshold || 5,
          riskScores: yamlData.risk_scores || {},
          categories: yamlData.categories || {}
        };
        
        console.log('✅ Loaded default risk profile:', profile.name);
        return profile;
      }
    }
    
    console.warn('No default risk profile found');
    return null;
  } catch (error) {
    console.error('Failed to load default risk profile:', error);
    return null;
  }
}

/**
 * Filter risk factors based on enabled factors in the risk profile
 */
export function filterRiskFactorsByProfile(
  riskFactors: Array<{ id: string }>,
  profile: RiskProfile | null
): Array<{ id: string }> {
  if (!profile) {
    // If no profile is loaded, return all risk factors
    return riskFactors;
  }
  
  // Filter to only include enabled factors
  return riskFactors.filter(rf => profile.enabledFactors.includes(rf.id));
}

/**
 * Client-side version of loadDefaultRiskProfile for frontend use
 */
export async function clientLoadDefaultRiskProfile(): Promise<RiskProfile | null> {
  try {
    const response = await fetch('/api/risk-profiles/default');
    
    if (!response.ok) {
      console.warn('Failed to load default risk profile from API');
      return null;
    }
    
    const data = await response.json();
    return data.profile || null;
  } catch (error) {
    console.error('Failed to load default risk profile:', error);
    return null;
  }
}