import { riskFactorService } from '@/services/api/riskFactors';
import type { RiskFactorInfo } from '@/lib/risk-factors-enhanced';

// Server-side risk factor loading
export async function getRiskFactorInfoServer(riskFactorId: string): Promise<RiskFactorInfo> {
  try {
    const csvFactor = await riskFactorService.getRiskFactor(riskFactorId);
    
    if (csvFactor) {
      // Convert CSV level to severity
      const severity = csvFactor.level === 'Critical' ? 'critical' :
                      csvFactor.level === 'High' ? 'high' :
                      csvFactor.level === 'Elevated' ? 'elevated' :
                      'other';
      
      return {
        label: csvFactor.name,
        category: csvFactor.category,
        severity,
        description: csvFactor.description,
        type: csvFactor.type,
        level: csvFactor.level,
      };
    }
  } catch (error) {
    console.warn('Failed to get risk factor from server:', error);
  }

  // Fallback to pattern detection
  let detectedCategory = 'relevant';
  let detectedType: string | undefined;
  
  if (riskFactorId.includes('_adjacent')) {
    detectedType = 'network';
    detectedCategory = 'sanctions';
  } else if (riskFactorId.startsWith('psa_')) {
    detectedType = 'psa';
    detectedCategory = 'sanctions';
  } else if (riskFactorId.startsWith('seed_')) {
    detectedType = 'seed';
    detectedCategory = 'regulatory_action';
  } else if (riskFactorId.includes('sanction')) {
    detectedCategory = 'sanctions';
  } else if (riskFactorId.includes('pep')) {
    detectedCategory = 'political_exposure';
  } else if (riskFactorId.includes('adverse_media')) {
    detectedCategory = 'adverse_media';
  } else if (riskFactorId.includes('regulatory')) {
    detectedCategory = 'regulatory_action';
  } else if (riskFactorId.includes('environmental')) {
    detectedCategory = 'environmental_risk';
  } else if (riskFactorId.includes('forced_labor')) {
    detectedCategory = 'forced_labor';
  }
  
  const isAdjacent = riskFactorId.includes('_adjacent');
  const severity = isAdjacent ? 'elevated' :
                  ['sanctions', 'export_controls', 'forced_labor'].includes(detectedCategory) ? 'critical' :
                  detectedCategory === 'political_exposure' ? 'high' : 'other';
  
  return {
    label: riskFactorId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    category: detectedCategory,
    severity,
    ...(detectedType ? { type: detectedType } : {}),
    ...(isAdjacent ? { level: 'Elevated' } : {}),
  };
}

export async function groupRiskFactorsByCategoryServer(riskFactorIds: string[]): Promise<Record<string, Array<{ id: string; info: RiskFactorInfo }>>> {
  const grouped: Record<string, Array<{ id: string; info: RiskFactorInfo }>> = {};
  
  // Process all risk factors
  const riskFactorPromises = riskFactorIds.map(async id => {
    const info = await getRiskFactorInfoServer(id);
    return { id, info };
  });
  
  const riskFactorResults = await Promise.all(riskFactorPromises);
  
  riskFactorResults.forEach(({ id, info }) => {
    let categoryKey = info.category;
    
    // Consolidate all sanctions-related categories into 'sanctions'
    if (categoryKey === 'export_controls' || categoryKey === 'sanctions_and_export_control_lists') {
      categoryKey = 'sanctions';
    }
    
    if (!grouped[categoryKey]) {
      grouped[categoryKey] = [];
    }
    grouped[categoryKey].push({ id, info });
  });
  
  return grouped;
}