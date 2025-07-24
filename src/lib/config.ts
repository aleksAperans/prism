// Application Configuration
export const config = {
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
    timeout: 30000,
  },

  // Sayari API Configuration
  sayari: {
    baseUrl: getSayariBaseUrl(),
    clientId: getSayariClientId(),
    clientSecret: getSayariClientSecret(),
    audience: 'sayari.com',
    grantType: 'client_credentials',
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
  },

  // Application Settings
  app: {
    name: 'Sayari Screening Application',
    version: '1.0.0',
    description: 'Entity screening and compliance management',
    environment: process.env.NODE_ENV || 'development',
  },

  // Pagination Defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },

  // Session Configuration
  session: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 24 * 60 * 60, // 24 hours
  },

  // Feature Flags
  features: {
    enableBatchProcessing: true,
    enableRealTimeUpdates: false,
    enableAdvancedFiltering: true,
    enableExport: true,
  },

  // UI Configuration
  ui: {
    theme: {
      primary: '#0066CC',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
    },
    animations: {
      enabled: true,
      duration: 200,
    },
  },
} as const;

// Helper functions for environment-specific configuration
function getSayariBaseUrl(): string {
  const env = process.env.SAYARI_ENV || 'development';
  
  switch (env) {
    case 'production':
      return process.env.SAYARI_BASE_URL || 'https://api.sayari.com';
    case 'staging':
    case 'development':
      return process.env.SAYARI_DEV_BASE_URL || 'https://api.develop.sayari.com';
    case 'internal':
      return process.env.SAYARI_INTERNAL_BASE_URL || 'https://api.internal.sayari.com';
    default:
      return 'https://api.develop.sayari.com';
  }
}

function getSayariClientId(): string {
  const env = process.env.SAYARI_ENV || 'development';
  
  switch (env) {
    case 'production':
      return process.env.SAYARI_CLIENT_ID || '';
    case 'staging':
    case 'development':
      return process.env.SAYARI_DEV_CLIENT_ID || '';
    case 'internal':
      return process.env.SAYARI_INTERNAL_CLIENT_ID || '';
    default:
      return process.env.SAYARI_DEV_CLIENT_ID || '';
  }
}

function getSayariClientSecret(): string {
  const env = process.env.SAYARI_ENV || 'development';
  
  switch (env) {
    case 'production':
      return process.env.SAYARI_CLIENT_SECRET || '';
    case 'staging':
    case 'development':
      return process.env.SAYARI_DEV_CLIENT_SECRET || '';
    case 'internal':
      return process.env.SAYARI_INTERNAL_CLIENT_SECRET || '';
    default:
      return process.env.SAYARI_DEV_CLIENT_SECRET || '';
  }
}

// Validation helpers
export function validateConfig(): void {
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (!getSayariClientId() || !getSayariClientSecret()) {
    console.warn('Sayari API credentials not configured. Some features may not work.');
  }
}

// Export environment checker
export const isDevelopment = config.app.environment === 'development';
export const isProduction = config.app.environment === 'production';
export const isServer = typeof window === 'undefined';