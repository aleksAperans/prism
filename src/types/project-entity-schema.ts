/**
 * Comprehensive TypeScript interfaces for Project Entity Screening Schema
 * These interfaces match the Prisma database schema for complete API coverage
 */

// ============================================================================
// CORE ENTITY INTERFACES
// ============================================================================

export interface ProjectEntity {
  id: string;
  project_id: string;
  project_entity_id: string; // Your internal entity ID
  organization_id?: string; // For multi-tenant support
  sayari_entity_id?: string; // Sayari's entity ID
  
  // Core entity information
  entity_name: string;
  entity_label?: string;
  entity_type?: string;
  match_strength?: number; // 0.00 to 1.00
  
  // Status and workflow
  screening_status: 'pending' | 'screened' | 'reviewed' | 'approved' | 'rejected';
  workflow_state: string; // 'initial', 'in_review', 'escalated', etc.
  assigned_to?: string;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  screened_at?: Date;
  last_api_sync?: Date;
  
  // Relations (populated when included)
  risk_assessments?: EntityRiskAssessment[];
  addresses?: EntityAddress[];
  attributes?: EntityAttribute[];
  matches?: EntityMatch[];
  supply_chain?: EntitySupplyChain[];
  trade_flows?: EntityTradeFlow[];
  country_exposures?: EntityCountryExposure[];
  data_sources?: EntityDataSource[];
  audit_logs?: EntityScreeningAudit[];
  cases?: EntityCase[];
}

export interface EntityRiskAssessment {
  id: string;
  project_entity_id: string;
  
  // Risk profile used
  risk_profile_id: string; // e.g., 'sanctions-non-psa'
  risk_profile_version?: string;
  
  // Overall risk calculation
  total_risk_score: number;
  risk_threshold: number;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  exceeds_threshold: boolean;
  
  // Risk factors summary
  total_factors_checked: number;
  positive_factors_count: number;
  critical_factors_count: number;
  
  created_at: Date;
  updated_at: Date;
  
  // Relations
  project_entity?: ProjectEntity;
  risk_factors?: EntityRiskFactor[];
}

export interface EntityRiskFactor {
  id: string;
  risk_assessment_id: string;
  
  // Risk factor details
  factor_id: string; // e.g., 'controlled_by_aus_sanctioned'
  factor_name: string;
  factor_category: string;
  factor_level: 'Critical' | 'High' | 'Elevated' | 'Standard';
  factor_type: string; // entity, network, etc.
  factor_description?: string;
  
  // Scoring
  risk_points: number;
  is_positive: boolean;
  confidence_level?: number; // 0.00 to 1.00
  
  // Metadata from API
  source_count: number;
  last_seen?: Date;
  first_seen?: Date;
  
  created_at: Date;
  
  // Relations
  risk_assessment?: EntityRiskAssessment;
}

// ============================================================================
// BUSINESS CONTEXT INTERFACES
// ============================================================================

export interface EntityAddress {
  id: string;
  project_entity_id: string;
  
  // Address components
  address_line?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country_code?: string; // ISO 3-letter code
  country_name?: string;
  
  // Geographical coordinates
  latitude?: number;
  longitude?: number;
  
  // Address metadata
  address_type?: 'registered' | 'operational' | 'mailing' | 'other';
  is_primary: boolean;
  confidence_score?: number;
  source_count: number;
  
  created_at: Date;
  
  // Relations
  project_entity?: ProjectEntity;
}

export interface EntityAttribute {
  id: string;
  project_entity_id: string;
  
  // Business classification
  industry_code?: string;
  industry_classification_system?: 'ISIC4' | 'NACE2' | 'SIC' | 'other';
  business_purpose?: string;
  entity_status?: 'active' | 'inactive' | 'dissolved' | 'other';
  
  // Corporate structure
  incorporation_date?: Date;
  incorporation_country?: string;
  legal_form?: string;
  
  // Financial information
  annual_revenue?: bigint;
  employee_count?: number;
  currency_code?: string;
  
  // Additional attributes (flexible key-value)
  attribute_key: string;
  attribute_value?: string;
  attribute_type?: 'string' | 'number' | 'date' | 'boolean';
  source_count: number;
  
  created_at: Date;
  
  // Relations
  project_entity?: ProjectEntity;
}

export interface EntityMatch {
  id: string;
  project_entity_id: string;
  
  // Match information
  matched_name: string;
  match_type?: 'exact' | 'fuzzy' | 'phonetic' | 'alias';
  match_confidence?: number; // 0.00 to 1.00
  
  // Alternative identifiers
  alternative_id?: string;
  alternative_id_type?: 'tax_id' | 'registration_number' | 'lei' | 'other';
  
  // Source of the match
  source_id?: string;
  source_record_id?: string;
  
  created_at: Date;
  
  // Relations
  project_entity?: ProjectEntity;
}

// ============================================================================
// SUPPLY CHAIN AND TRADE INTERFACES
// ============================================================================

export interface EntitySupplyChain {
  id: string;
  project_entity_id: string;
  
  // Relationship details
  related_entity_id?: string; // Sayari ID of related entity
  related_entity_name?: string;
  relationship_type?: 'supplier' | 'buyer' | 'subsidiary' | 'parent' | 'affiliate';
  relationship_direction?: 'upstream' | 'downstream';
  
  // Supply chain tier
  tier_level?: number; // 1, 2, 3, etc.
  connection_strength?: number; // 0.00 to 1.00
  
  // Trade statistics
  total_shipments: number;
  shipments_as_buyer: number;
  shipments_as_supplier: number;
  
  // Temporal data
  first_trade_date?: Date;
  last_trade_date?: Date;
  relationship_status?: 'active' | 'inactive' | 'historical';
  
  created_at: Date;
  
  // Relations
  project_entity?: ProjectEntity;
}

export interface EntityTradeFlow {
  id: string;
  project_entity_id: string;
  
  // Trade direction
  trade_type: 'import' | 'export';
  partner_entity_id?: string;
  partner_entity_name?: string;
  partner_country_code?: string;
  
  // Product information
  hs_code?: string; // Harmonized System code
  product_description?: string;
  product_category?: string;
  
  // Trade statistics
  shipment_count: number;
  total_value?: bigint; // in cents/smallest currency unit
  currency_code: string;
  
  // Time period
  trade_year?: number;
  trade_month?: number;
  date_range_start?: Date;
  date_range_end?: Date;
  
  created_at: Date;
  
  // Relations
  project_entity?: ProjectEntity;
}

export interface EntityCountryExposure {
  id: string;
  project_entity_id: string;
  
  // Country information
  country_code: string; // ISO 3-letter
  country_name: string;
  
  // Exposure types
  exposure_type: 'operations' | 'trade' | 'ownership' | 'registration';
  exposure_level?: 'primary' | 'secondary' | 'minor';
  
  // Risk assessment for this country
  country_risk_score: number;
  sanctions_risk: boolean;
  export_control_risk: boolean;
  
  // Trade volume with this country
  import_shipments: number;
  export_shipments: number;
  total_trade_value: bigint;
  
  created_at: Date;
  
  // Relations
  project_entity?: ProjectEntity;
}

// ============================================================================
// AUDIT AND CASE MANAGEMENT INTERFACES
// ============================================================================

export interface EntityDataSource {
  id: string;
  project_entity_id: string;
  
  // Source information
  source_id: string;
  source_name?: string;
  source_type?: 'government' | 'commercial' | 'public' | 'regulatory';
  source_country?: string;
  source_reliability_score?: number;
  
  // Data coverage
  record_count: number;
  data_types: string[]; // Array of data types this source provides
  
  // Temporal coverage
  data_date_start?: Date;
  data_date_end?: Date;
  last_updated?: Date;
  
  created_at: Date;
  
  // Relations
  project_entity?: ProjectEntity;
}

export interface EntityScreeningAudit {
  id: string;
  project_entity_id: string;
  
  // Action details
  action_type: 'screened' | 'reviewed' | 'approved' | 'rejected' | 'rescreened' | 'updated';
  action_by?: string;
  action_reason?: string;
  
  // Previous and new values for changes
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  
  // Risk assessment changes
  previous_risk_score?: number;
  new_risk_score?: number;
  risk_factors_added: string[];
  risk_factors_removed: string[];
  
  // API call metadata
  api_request_id?: string;
  processing_time_ms?: number;
  
  created_at: Date;
  
  // Relations
  project_entity?: ProjectEntity;
  action_user?: any; // User interface
}

export interface EntityCase {
  id: string;
  project_entity_id: string;
  
  // Case details
  case_number: string;
  case_priority: 'low' | 'medium' | 'high' | 'critical';
  case_status: 'open' | 'under_review' | 'resolved' | 'closed';
  
  // Assignment
  assigned_to?: string;
  assigned_at?: Date;
  
  // Resolution
  resolution_notes?: string;
  resolution_action?: 'approved' | 'rejected' | 'requires_monitoring' | 'escalated';
  resolved_by?: string;
  resolved_at?: Date;
  
  // SLA tracking
  due_date?: Date;
  escalation_level: number;
  
  created_at: Date;
  updated_at: Date;
  
  // Relations
  project_entity?: ProjectEntity;
  assigned_user?: any; // User interface
  resolver_user?: any; // User interface
}

// ============================================================================
// API REQUEST/RESPONSE INTERFACES
// ============================================================================

export interface CreateProjectEntityRequest {
  project_id: string;
  project_entity_id: string;
  organization_id?: string;
  entity_name: string;
  entity_label?: string;
  entity_type?: string;
  
  // Include full Sayari API response data
  sayari_response?: SayariEntityResponse;
}

export interface SayariEntityResponse {
  entity_id: string;
  label: string;
  type: string;
  match_strength?: number;
  
  // Risk factors from Sayari
  risk_factors: SayariRiskFactor[];
  
  // Address information
  addresses: SayariAddress[];
  
  // Business attributes
  attributes: SayariAttribute[];
  
  // Supply chain data
  supply_chain: SayariSupplyChainRelation[];
  
  // Trade flows
  trade_data: SayariTradeFlow[];
  
  // Source attribution
  sources: SayariDataSource[];
  
  // Additional metadata
  metadata: {
    created_at: string;
    updated_at: string;
    confidence_score?: number;
    data_completeness?: number;
  };
}

export interface SayariRiskFactor {
  id: string;
  name: string;
  category: string;
  level: string;
  type: string;
  description: string;
  positive: boolean;
  confidence?: number;
  source_count: number;
  first_seen?: string;
  last_seen?: string;
}

export interface SayariAddress {
  address_line?: string;
  city?: string;
  state?: string;
  country_code?: string;
  country_name?: string;
  postal_code?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  type?: string;
  confidence?: number;
}

export interface SayariAttribute {
  key: string;
  value: string;
  type: string;
  source_count: number;
  confidence?: number;
}

export interface SayariSupplyChainRelation {
  related_entity_id: string;
  related_entity_name: string;
  relationship_type: string;
  direction: string;
  tier?: number;
  connection_strength?: number;
  trade_statistics: {
    total_shipments: number;
    as_buyer: number;
    as_supplier: number;
    first_trade?: string;
    last_trade?: string;
  };
}

export interface SayariTradeFlow {
  trade_type: 'import' | 'export';
  partner_entity_id?: string;
  partner_entity_name?: string;
  partner_country?: string;
  hs_code?: string;
  product_description?: string;
  shipment_count: number;
  total_value?: number;
  currency?: string;
  time_period: {
    year?: number;
    month?: number;
    start_date?: string;
    end_date?: string;
  };
}

export interface SayariDataSource {
  source_id: string;
  source_name: string;
  source_type: string;
  country?: string;
  reliability_score?: number;
  record_count: number;
  data_types: string[];
  coverage_period?: {
    start_date?: string;
    end_date?: string;
    last_updated?: string;
  };
}

// ============================================================================
// QUERY AND FILTER INTERFACES
// ============================================================================

export interface ProjectEntityFilters {
  project_id?: string;
  organization_id?: string;
  screening_status?: string[];
  risk_level?: string[];
  country_exposure?: string[];
  assigned_to?: string;
  date_range?: {
    start: Date;
    end: Date;
  };
  risk_score_min?: number;
  risk_score_max?: number;
  has_trade_data?: boolean;
  exceeds_threshold?: boolean;
}

export interface ProjectEntityQueryOptions {
  include?: {
    risk_assessments?: boolean;
    addresses?: boolean;
    attributes?: boolean;
    matches?: boolean;
    supply_chain?: boolean;
    trade_flows?: boolean;
    country_exposures?: boolean;
    data_sources?: boolean;
    audit_logs?: boolean;
    cases?: boolean;
  };
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface RiskAssessmentSummary {
  total_entities: number;
  high_risk_entities: number;
  threshold_breaches: number;
  avg_risk_score: number;
  top_risk_factors: Array<{
    factor_id: string;
    factor_name: string;
    entity_count: number;
  }>;
  country_risk_breakdown: Array<{
    country_code: string;
    country_name: string;
    entity_count: number;
    avg_risk_score: number;
  }>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type EntityStatus = 'pending' | 'screened' | 'reviewed' | 'approved' | 'rejected';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type CaseStatus = 'open' | 'under_review' | 'resolved' | 'closed';
export type CasePriority = 'low' | 'medium' | 'high' | 'critical';
export type TradeType = 'import' | 'export';
export type ExposureType = 'operations' | 'trade' | 'ownership' | 'registration';

// Export all interfaces for use in the application
export * from './project-entity-schema';