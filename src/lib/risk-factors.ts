export const RISK_FACTORS: Record<string, string> = {
  // Sanctions and Enforcement
  'OFAC_SDN': 'OFAC Specially Designated Nationals List',
  'OFAC_CONSOLIDATED': 'OFAC Consolidated Sanctions List',
  'UN_SANCTIONS': 'UN Security Council Sanctions List',
  'EU_SANCTIONS': 'European Union Sanctions List',
  'HMT_SANCTIONS': 'HM Treasury Sanctions List',
  'AUSTRAC_SANCTIONS': 'AUSTRAC Sanctions List',
  'DFAT_SANCTIONS': 'Australian DFAT Sanctions List',
  
  // Politically Exposed Persons
  'PEP_HEAD_OF_STATE': 'Head of State or Government',
  'PEP_GOVERNMENT_MINISTER': 'Government Minister',
  'PEP_SENIOR_OFFICIAL': 'Senior Government Official',
  'PEP_JUDICIAL': 'Senior Judicial Official',
  'PEP_MILITARY': 'Senior Military Official',
  'PEP_PARTY_OFFICIAL': 'Senior Political Party Official',
  'PEP_SOE_EXECUTIVE': 'State-Owned Enterprise Executive',
  'PEP_FAMILY': 'Family Member of PEP',
  'PEP_CLOSE_ASSOCIATE': 'Close Associate of PEP',
  
  // Law Enforcement and Investigations
  'FBI_MOST_WANTED': 'FBI Most Wanted List',
  'INTERPOL_WANTED': 'INTERPOL Red Notice',
  'DEA_FUGITIVE': 'DEA Fugitive List',
  'ICE_MOST_WANTED': 'ICE Most Wanted',
  'CRIMINAL_CHARGES': 'Active Criminal Charges',
  'CRIMINAL_CONVICTION': 'Criminal Conviction',
  'INVESTIGATION': 'Under Investigation',
  
  // Financial Crime
  'MONEY_LAUNDERING': 'Money Laundering Activity',
  'FRAUD': 'Fraud Activity',
  'EMBEZZLEMENT': 'Embezzlement',
  'BRIBERY_CORRUPTION': 'Bribery and Corruption',
  'TAX_EVASION': 'Tax Evasion',
  'FINANCIAL_SANCTIONS': 'Financial Sanctions Violation',
  
  // Terrorism and Security
  'TERRORISM': 'Terrorism Related',
  'TERRORIST_ORGANIZATION': 'Terrorist Organization',
  'PROLIFERATION': 'Weapons Proliferation',
  'CYBER_CRIME': 'Cyber Crime Activity',
  'ORGANIZED_CRIME': 'Organized Crime',
  
  // Business and Regulatory
  'REGULATORY_ACTION': 'Regulatory Enforcement Action',
  'BUSINESS_RESTRICTIONS': 'Business Activity Restrictions',
  'EXPORT_CONTROLS': 'Export Control Violations',
  'TRADE_RESTRICTIONS': 'Trade Restrictions',
  'DEBARMENT': 'Government Debarment',
  'LICENSE_REVOCATION': 'License Revocation',
  
  // Geographic Risk
  'HIGH_RISK_GEOGRAPHY': 'High Risk Geographic Location',
  'CONFLICT_ZONE': 'Operating in Conflict Zone',
  'EMBARGO_COUNTRY': 'Country Under Embargo',
  
  // Adverse Media
  'ADVERSE_MEDIA': 'Negative Media Coverage',
  'REPUTATION_RISK': 'Reputational Risk',
  'REGULATORY_SCRUTINY': 'Under Regulatory Scrutiny',
  
  // Corporate Risk
  'SHELL_COMPANY': 'Shell Company Indicators',
  'NOMINEE_SERVICES': 'Use of Nominee Services',
  'COMPLEX_OWNERSHIP': 'Complex Ownership Structure',
  'DISSOLVED_ENTITY': 'Dissolved or Inactive Entity',
  'JURISDICTION_RISK': 'High Risk Jurisdiction',
  
  // Other Risk Categories
  'ARMS_DEALING': 'Arms Dealing Activity',
  'HUMAN_TRAFFICKING': 'Human Trafficking',
  'DRUG_TRAFFICKING': 'Drug Trafficking',
  'ENVIRONMENTAL_CRIME': 'Environmental Crime',
  'INTELLECTUAL_PROPERTY': 'Intellectual Property Violations',
  
  // Custom Risk Factors
  'HIGH_RISK_BUSINESS': 'High Risk Business Activity',
  'SANCTIONS_EVASION': 'Sanctions Evasion Activity',
  'COMPLIANCE_VIOLATION': 'Compliance Violations',
  'DUE_DILIGENCE_CONCERN': 'Due Diligence Concerns',
};