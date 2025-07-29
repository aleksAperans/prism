// Sayari API Types
export interface SayariTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

export interface SayariProject {
  id: string;
  label: string;
  created: string;
  updated: string;
  archived: boolean;
  counts: {
    entity: number;
    graph: number;
    record: number;
    search: number;
  };
  is_scrm?: boolean;
  upload_count?: number;
  members?: Array<{
    type: 'user' | 'group';
    id: string;
    role: 'admin' | 'editor' | 'viewer';
    created: string;
    updated: string;
  }>;
}

export interface ProjectMember {
  user_id: string;
  role: 'viewer' | 'editor' | 'admin';
}

export interface EntityAttributes {
  name: string[];
  type: 'company' | 'person';
  addresses?: string[];
  country?: string[];
  identifier?: string[];
  date_of_birth?: string; // YYYY-MM-DD format
}

// Current ProjectEntity structure (from API response)
export interface ProjectEntity {
  project_entity_id: string;
  project_id: string;
  label: string;
  strength: 'strong' | 'partial' | 'no_match' | 'manual';
  created_at: string;
  attributes: {
    name: { resolve: boolean; values: string[] };
    country: { resolve: boolean; values: string[] };
    type: { resolve: boolean; values: string[] };
  };
  countries: string[];
  risk_factors: Array<{ id: string }>;
  upstream: {
    countries: string[];
    risk_factors: unknown[];
    products: string[];
    has_upstream: boolean;
  };
  tags: string[];
  case: {
    id: string;
    status: 'not_assigned' | 'in_review' | 'approved' | 'rejected';
    created_at: string;
  };
  matches: EntityMatch[];
}


export interface EntityMatch {
  match_id: string;
  sayari_entity_id: string;
  type: string;
  label: string;
  matched_attributes: {
    name: string[];
    address?: string[];
    country: string[];
    identifier?: string[];
  };
  countries: string[];
  risk_factors: Array<{ id: string }>;
  upstream: {
    risk_factors: unknown[];
    countries: string[];
    trade_counts: {
      shipper_of: number;
      receiver_of: number;
    };
    has_upstream: boolean;
    products: string[];
  };
  business_purpose: unknown[];
  addresses: Array<{ value: string }>;
  sources: Array<{
    id: string;
    label: string;
    source_type: string;
    country: string;
  }>;
  hs_codes: string[];
  created_at: string;
  updated_at: string;
  relationship_count: Record<string, number>;
}

export interface Address {
  text: string;
  country?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

export interface MatchedAttribute {
  attribute: string;
  query_value: string;
  match_value: string;
  highlighted_match_value?: string;
}

export interface RiskFactor {
  id: string;
  name: string;
  description: string;
  category: string;
  level: 'Critical' | 'High' | 'Elevated' | 'Standard';
  type: string;
  url?: string;
}

// API Response Types
export interface SayariResponse<T> {
  data: T;
  limit?: number;
  next?: string;
  prev?: string;
  size?: number;
  count?: number;
}

export interface SayariError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Request Types
export interface CreateProjectRequest {
  label: string;
  share?: {
    org: 'viewer' | 'editor' | 'admin';
  };
}

export interface CreateEntityRequest {
  attributes: EntityAttributes[];
  profile: 'corporate' | 'suppliers' | 'search' | 'screen';
}

export interface GetProjectEntitiesParams {
  limit?: number;
  next?: string;
  prev?: string;
  entity_type?: string[];
  match_strength?: string[];
  risk?: string[];
  countries?: string[];
  archived?: boolean;
}

// Screening Profile Types
export type ScreeningProfile = 'corporate' | 'suppliers' | 'search' | 'screen';

export const SCREENING_PROFILES: Record<ScreeningProfile, { label: string; description: string }> = {
  corporate: {
    label: 'Corporate Screening',
    description: 'Optimized for corporate entity matching and compliance'
  },
  suppliers: {
    label: 'Supplier Screening',
    description: 'Focused on supply chain risk assessment'
  },
  search: {
    label: 'General Search',
    description: 'Broad search across all entity types'
  },
  screen: {
    label: 'Compliance Screening',
    description: 'Comprehensive compliance and sanctions screening'
  }
} as const;