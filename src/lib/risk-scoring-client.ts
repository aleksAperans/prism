/**
 * Client-safe risk scoring utilities
 * These functions can be used in client components without Node.js dependencies
 */

import type { RiskProfile } from '@/lib/risk-profiles/yaml-loader';

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
 * Filter risk factors based on enabled factors in the risk profile
 * Client-safe version that doesn't depend on Node.js modules
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
 * Calculate risk score for an entity based on risk profile and triggered risk factors
 * Client-safe version
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
      threshold: riskProfile.riskThreshold || 0,
    };
  }

  const triggeredRiskFactors: Array<{ id: string; score: number }> = [];
  let totalScore = 0;

  // Calculate score for each triggered risk factor
  triggeredRiskFactorIds.forEach(riskFactorId => {
    const score = riskProfile.riskScores?.[riskFactorId] || 0;
    if (score > 0) {
      triggeredRiskFactors.push({ id: riskFactorId, score });
      totalScore += score;
    }
  });

  const threshold = riskProfile.riskThreshold || 0;
  const meetsThreshold = totalScore >= threshold;

  return {
    totalScore,
    triggeredRiskFactors,
    meetsThreshold,
    threshold,
  };
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