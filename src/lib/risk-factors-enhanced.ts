export interface RiskFactorInfo {
  label: string;
  category: string;
  severity: 'critical' | 'high' | 'elevated' | 'other';
  description?: string;
  type?: string; // e.g., 'psa', 'seed', 'network'
  level?: string; // Alternative to severity for display
}

export interface RiskCategory {
  name: string;
  description: string;
  icon: string;
  severity: 'critical' | 'high' | 'elevated' | 'other';
}

export const RISK_CATEGORIES: Record<string, RiskCategory> = {
  adverse_media: {
    name: 'Adverse Media',
    description: 'Adverse media coverage and reports',
    icon: '⚡',
    severity: 'elevated',
  },
  environmental_risk: {
    name: 'Environmental Risk',
    description: 'Environmental violations and sustainability risks',
    icon: '🌱',
    severity: 'elevated',
  },
  export_controls: {
    name: 'Sanctions & Export Controls',
    description: 'Export controls and trade restrictions',
    icon: '🔒',
    severity: 'critical',
  },
  forced_labor: {
    name: 'Forced Labor & Human Rights',
    description: 'Forced labor and human rights violations',
    icon: '⚖️',
    severity: 'elevated',
  },
  political_exposure: {
    name: 'Political Exposure',
    description: 'Political figures and their associates',
    icon: '👤',
    severity: 'high',
  },
  regulatory_action: {
    name: 'Regulatory Action',
    description: 'Regulatory enforcement actions and violations',
    icon: '📋',
    severity: 'elevated',
  },
  relevant: {
    name: 'Relevant',
    description: 'Additional relevant risk indicators',
    icon: '⚠️',
    severity: 'elevated',
  },
  sanctions: {
    name: 'Sanctions & Export Controls',
    description: 'Government sanctions and enforcement actions',
    icon: '🔒',
    severity: 'critical',
  },
  sanctions_and_export_control_lists: {
    name: 'Sanctions & Export Controls',
    description: 'Sanctions and export control lists',
    icon: '🔒',
    severity: 'critical',
  },
};

export const ENHANCED_RISK_FACTORS: Record<string, RiskFactorInfo> = {
  // Sanctions & Export Controls
  'psa_owned_by_sanctioned_eu_ec_sanctions_map_entity': {
    label: 'Controlled by EU Sanctioned Entity',
    category: 'sanctions',
    severity: 'critical',
    description: 'Entity is owned or controlled by an entity on EU sanctions lists',
    type: 'psa',
  },
  'psa_owned_by_sanctioned_usa_ofac_sdn_entity': {
    label: 'Controlled by OFAC SDN Entity',
    category: 'sanctions',
    severity: 'critical',
    description: 'Entity is owned or controlled by an OFAC Specially Designated National',
    type: 'psa',
  },
  'psa_owned_by_usa_bis_entity': {
    label: 'Controlled by BIS Listed Entity',
    category: 'export_controls',
    severity: 'critical',
    description: 'Entity is owned or controlled by a US Bureau of Industry and Security listed entity',
    type: 'psa',
  },
  'psa_usa_bis_50_percent_rule': {
    label: 'Subject to 50% Rule (BIS)',
    category: 'export_controls',
    severity: 'critical',
    description: 'Entity meets the 50% ownership rule for BIS sanctions compliance',
    type: 'psa',
  },
  'psa_owned_by_sanctioned_nzl_mfat_rus_entity': {
    label: 'Controlled by NZ MFAT Sanctioned Entity',
    category: 'sanctions',
    severity: 'critical',
    description: 'Entity is owned or controlled by a New Zealand MFAT sanctioned Russian entity',
  },
  'owned_by_sanctioned_can_gac_entity': {
    label: 'Controlled by Canadian Sanctioned Entity',
    category: 'sanctions',
    severity: 'critical',
    description: 'Entity is owned or controlled by a Canadian Global Affairs sanctioned entity',
  },
  'psa_owned_by_sanctioned_eu_dg_fisma_ec_entity': {
    label: 'Controlled by EU DG FISMA Sanctioned Entity',
    category: 'sanctions',
    severity: 'critical',
    description: 'Entity is owned or controlled by an EU DG FISMA sanctioned entity',
  },
  'psa_owned_by_entity_in_export_controls': {
    label: 'Controlled by Export Control Listed Entity',
    category: 'export_controls',
    severity: 'high',
    description: 'Entity is owned or controlled by an entity subject to export controls',
    type: 'psa',
  },
  'owned_by_entity_in_export_controls': {
    label: 'Connected to Export Control Entity',
    category: 'export_controls',
    severity: 'high',
    description: 'Entity has connections to entities subject to export controls',
    type: 'network',
  },
  'owned_by_sanctioned_ukr_nsdc_entity': {
    label: 'Controlled by Ukrainian NSDC Sanctioned Entity',
    category: 'sanctions',
    severity: 'critical',
    description: 'Entity is owned or controlled by a Ukrainian NSDC sanctioned entity',
  },
  'owned_by_sanctioned_eu_ec_sanctions_map_entity': {
    label: 'Connected to EU Sanctioned Entity',
    category: 'sanctions',
    severity: 'critical',
    description: 'Entity has ownership connections to EU sanctioned entities',
  },
  'usa_bis_50_percent_rule': {
    label: 'BIS 50% Ownership Rule',
    category: 'export_controls',
    severity: 'critical',
    description: 'Entity subject to BIS 50% ownership rule for sanctions compliance',
  },
  'owned_by_sanctioned_nzl_mfat_rus_entity': {
    label: 'Connected to NZ Sanctioned Entity',
    category: 'sanctions',
    severity: 'critical',
    description: 'Entity has connections to New Zealand MFAT sanctioned Russian entities',
  },

  // Sanctioned Adjacent (Network connections to sanctioned entities)
  'sanctioned_adjacent': {
    label: 'Related to Sanctioned Entity',
    category: 'sanctions',
    severity: 'elevated',
    level: 'Elevated',
    description: 'Entity is connected to sanctioned entities through network relationships',
    type: 'network',
  },
  'ofac_sdn_mex_dto_sanctioned_adjacent': {
    label: 'Adjacent to Mexico Drug Trafficking OFAC Entity',
    category: 'sanctions',
    severity: 'elevated',
    level: 'Elevated',
    description: 'Entity is 1 hop away from Mexico Drug Trafficking OFAC SDN entities',
    type: 'network',
  },
  'psa_ofac_sdn_mex_dto_sanctioned_adjacent': {
    label: 'Adjacent to Mexico Drug Trafficking OFAC Entity (PSA)',
    category: 'sanctions',
    severity: 'elevated',
    level: 'Elevated',
    description: 'Entity is connected to Mexico Drug Trafficking OFAC SDN entities through ownership',
    type: 'network',
  },

  // Political Exposure
  'pep': {
    label: 'Politically Exposed Person',
    category: 'political_exposure',
    severity: 'high',
    description: 'Individual is a politically exposed person',
  },
  'pep_family': {
    label: 'PEP Family Member',
    category: 'political_exposure',
    severity: 'high',
    description: 'Individual is a family member of a politically exposed person',
  },
  'pep_associate': {
    label: 'PEP Associate',
    category: 'political_exposure',
    severity: 'elevated',
    description: 'Individual is a known associate of a politically exposed person',
  },

  // Regulatory Actions
  'regulatory_action': {
    label: 'Regulatory Enforcement Action',
    category: 'regulatory_action',
    severity: 'elevated',
    description: 'Subject to regulatory enforcement actions',
  },
  'export_control_violation': {
    label: 'Export Control Violation',
    category: 'regulatory_action',
    severity: 'high',
    description: 'Violated export control regulations',
  },

  // Adverse Media
  'adverse_media': {
    label: 'Adverse Media Coverage',
    category: 'adverse_media',
    severity: 'elevated',
    description: 'Negative media coverage or reports',
  },
  'reputation_risk': {
    label: 'Reputational Risk',
    category: 'adverse_media',
    severity: 'elevated',
    description: 'General reputational risk concerns',
  },

  // Key risk factors from CSV - comprehensive mappings
  'psa_ofac_50_percent_rule': {
    label: 'Majority Owned by OFAC SDN (May Include \'PSA\' Path)',
    category: 'sanctions',
    severity: 'high',
    description: 'The entity is possibly majority owned by one or more entities currently subject to trade, transport, immigration, or financial sanctions in the USA OFAC SDN Sanctions List up to 6 hops away with an aggregate of 50% or more controlling interest (per OFAC\'s 50% rule) via direct shareholding relationships.',
    type: 'network',
    level: 'High',
  },
  'ofac_50_percent_rule': {
    label: 'Majority Owned by OFAC SDN',
    category: 'sanctions',
    severity: 'high',
    description: 'The entity is majority owned by one or more entities currently subject to trade, transport, immigration, or financial sanctions in the USA OFAC SDN Sanctions List.',
    type: 'network',
    level: 'High',
  },
  'formerly_sanctioned': {
    label: 'Former Sanctions',
    category: 'sanctions',
    severity: 'high',
    description: 'The entity was formerly subject to trade, transport, immigration, or financial sanctions in international sanctions lists.',
    type: 'seed',
    level: 'High',
  },
  'formerly_sanctioned_usa_ofac_sdn': {
    label: 'Formerly Sanctioned under USA OFAC SDN List',
    category: 'sanctions_and_export_control_lists',
    severity: 'elevated',
    description: 'The entity was formerly subject to sanctions in the USA OFAC Specially Designated Nationals and Blocked Persons (SDN) List.',
    type: 'seed',
    level: 'Elevated',
  },
  'ofac_sdn_sanctioned': {
    label: 'USA OFAC SDN',
    category: 'sanctions',
    severity: 'critical',
    description: 'The entity is subject to sanctions in the USA OFAC Specially Designated Nationals and Blocked Persons (SDN) List.',
    type: 'seed',
    level: 'Critical',
  },
  'ofac_sdn_adjacent': {
    label: 'Adjacent to USA OFAC SDN',
    category: 'sanctions',
    severity: 'elevated',
    description: 'The entity is 1 hop away from entities currently subject to sanctions in the USA OFAC SDN Sanctions List.',
    type: 'network',
    level: 'Elevated',
  },
  'reputational_risk_bribery_and_corruption': {
    label: 'Bribery and Corruption (from Adverse Media)',
    category: 'adverse_media',
    severity: 'elevated',
    description: 'The entity has been mentioned by official government websites or mass media outlets as wanted, charged, indicted, prosecuted, convicted, or sentenced for criminal activity related to bribery and corruption.',
    type: 'seed',
    level: 'Elevated',
  },
  'law_enforcement_action': {
    label: 'Law Enforcement Action (from Adverse Media)',
    category: 'adverse_media',
    severity: 'elevated',
    description: 'The entity has been mentioned by official government websites or mass media outlets as wanted, charged, indicted, prosecuted, convicted, or sentenced in relation to a law enforcement action.',
    type: 'seed',
    level: 'Elevated',
  },
  'reputational_risk_financial_crime': {
    label: 'Financial Crime (from Adverse Media)',
    category: 'adverse_media',
    severity: 'elevated',
    description: 'The entity has been mentioned by official government websites or mass media outlets as wanted, charged, indicted, prosecuted, convicted, or sentenced for criminal activity related to financial crime.',
    type: 'seed',
    level: 'Elevated',
  },
  'pep_head_of_state': {
    label: 'Head of State',
    category: 'political_exposure',
    severity: 'high',
    description: 'The individual is a head of state or government.',
    type: 'seed',
    level: 'High',
  },
  'pep_government_minister': {
    label: 'Government Minister',
    category: 'political_exposure',
    severity: 'high',
    description: 'The individual is a government minister or senior official.',
    type: 'seed',
    level: 'High',
  },

  // Fallback for unknown risk factors
  'unknown': {
    label: 'Unknown Risk Factor',
    category: 'relevant',
    severity: 'elevated',
    description: 'Risk factor not yet categorized',
  },
};

export async function getRiskFactorInfo(riskFactorId: string): Promise<RiskFactorInfo> {
  // Try to get from CSV data via API first
  try {
    const response = await fetch(`/api/risk-factors?id=${encodeURIComponent(riskFactorId)}`);
    
    if (response.ok) {
      const data: { success: boolean; data: { name: string; category: string; level: string; description: string; type: string } | null } = await response.json();
      
      if (data.success && data.data) {
        const csvFactor = data.data;
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
    }
  } catch (error) {
    console.warn('Failed to fetch risk factor from API, falling back to static mappings:', error);
  }

  // Check if we have a predefined mapping as fallback
  if (ENHANCED_RISK_FACTORS[riskFactorId]) {
    return ENHANCED_RISK_FACTORS[riskFactorId];
  }

  // Auto-detect type from ID prefix and content as final fallback
  let detectedType: string | undefined;
  let detectedCategory = 'relevant';
  
  // Check for specific patterns first
  if (riskFactorId.includes('_adjacent')) {
    detectedType = 'network';
    detectedCategory = 'sanctions';
  } else if (riskFactorId.startsWith('psa_')) {
    detectedType = 'psa';
    detectedCategory = 'sanctions';
  } else if (riskFactorId.startsWith('seed_')) {
    detectedType = 'seed';
    detectedCategory = 'regulatory_action';
  } else if (riskFactorId.startsWith('network_')) {
    detectedType = 'network';
    detectedCategory = 'relevant';
  } else if (riskFactorId.includes('sanction')) {
    detectedCategory = 'sanctions';
  } else if (riskFactorId.includes('export_control')) {
    detectedCategory = 'export_controls';
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
  const severity = isAdjacent ? 'elevated' : // Adjacent entities are Elevated
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

export async function groupRiskFactorsByCategory(riskFactorIds: string[]): Promise<Record<string, Array<{ id: string; info: RiskFactorInfo }>>> {
  const grouped: Record<string, Array<{ id: string; info: RiskFactorInfo }>> = {};
  
  // Process all risk factors asynchronously
  const riskFactorPromises = riskFactorIds.map(async id => {
    const info = await getRiskFactorInfo(id);
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
  
  // Ensure 1:1 mapping with defined categories only
  // Only return categories that exist in our RISK_CATEGORIES mapping
  const validGrouped: Record<string, Array<{ id: string; info: RiskFactorInfo }>> = {};
  
  Object.keys(grouped).forEach(categoryKey => {
    if (RISK_CATEGORIES[categoryKey]) {
      validGrouped[categoryKey] = grouped[categoryKey];
    } else {
      // If category doesn't exist in our mapping, put it in "relevant"
      if (!validGrouped['relevant']) {
        validGrouped['relevant'] = [];
      }
      validGrouped['relevant'].push(...grouped[categoryKey]);
    }
  });
  
  return validGrouped;
}