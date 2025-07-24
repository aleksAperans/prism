// Application Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  created_at: string;
  updated_at: string;
}

export interface AppProject {
  id: string;
  sayari_project_id: string;
  name: string;
  description?: string;
  created_by: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  members?: ProjectMember[];
}

export interface ProjectMember {
  user_id: string;
  role: 'viewer' | 'editor' | 'admin';
  user?: User;
}

export interface ScreeningResult {
  id: string;
  project_id: string;
  sayari_entity_id?: string;
  entity_name: string;
  entity_type: 'company' | 'person';
  match_strength?: 'strong' | 'partial' | 'no_match';
  risk_factors: RiskFactorWithDetails[];
  full_response: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

export interface RiskFactorWithDetails {
  id: string;
  name: string;
  description: string;
  category: string;
  level: 'Critical' | 'High' | 'Elevated' | 'Standard';
  type: string;
  url?: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

// Form Types
export interface EntityFormData {
  project_id: string;
  name: string;
  type?: 'company' | 'person';
  profile: 'corporate' | 'suppliers' | 'search' | 'screen';
  identifier?: string;
  address?: string;
  country?: string;
  date_of_birth?: string;
}

// UI State Types
export interface ScreeningState {
  isLoading: boolean;
  results: ScreeningResult | null;
  error: string | null;
}

export interface ProjectState {
  currentProject: AppProject | null;
  projects: AppProject[];
  isLoading: boolean;
  error: string | null;
}

// Navigation Types
export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  description?: string;
}

// Error Types
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Pagination
export interface PaginationParams {
  limit?: number;
  offset?: number;
  next?: string;
  prev?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
    next?: string;
    prev?: string;
  };
}

// Filter Types
export interface EntityFilters {
  entity_type?: ('company' | 'person')[];
  match_strength?: ('strong' | 'partial' | 'no_match')[];
  risk_level?: ('Critical' | 'High' | 'Elevated' | 'Standard')[];
  countries?: string[];
  date_range?: {
    start: string;
    end: string;
  };
}

// Component Props Types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  error: Error | null;
  retry?: () => void;
}

// Country Types
export interface Country {
  code: string;
  name: string;
  flag?: string;
}

// Constants
export const ENTITY_TYPES = ['company', 'person'] as const;
export const MATCH_STRENGTHS = ['strong', 'partial', 'no_match'] as const;
export const RISK_LEVELS = ['Critical', 'High', 'Elevated', 'Standard'] as const;
export const USER_ROLES = ['admin', 'user', 'viewer'] as const;
export const PROJECT_ROLES = ['admin', 'editor', 'viewer'] as const;