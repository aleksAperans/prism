import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Extend the request config to include retry flag
interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}
import { sayariAuthService } from './auth';
import { config } from '@/lib/config';

// Create axios instance for Sayari API
console.log('🌍 Sayari API Configuration:', {
  baseUrl: config.sayari.baseUrl,
  env: process.env.SAYARI_ENV,
  clientId: config.sayari.clientId?.substring(0, 10) + '...'
});

const sayariClient = axios.create({
  baseURL: config.sayari.baseUrl,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication
sayariClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await sayariAuthService.getAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
      
      // Log request for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚀 Sayari API Request: ${config.method?.toUpperCase()} ${config.url}`);
      }
      
      return config;
    } catch (error) {
      console.error('Failed to add authentication token:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and retries
sayariClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful response (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Sayari API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableAxiosRequestConfig;

    // Handle 401 Unauthorized - retry with new token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Clear and refresh token
        const newToken = await sayariAuthService.refreshToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        return sayariClient(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return Promise.reject(refreshError);
      }
    }

    // Log error for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ Sayari API Error: ${error.response?.status} ${error.config?.url}`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    return Promise.reject(transformError(error));
  }
);

// Transform axios errors to our error format
function transformError(error: AxiosError): SayariAPIError {
  if (error.response) {
    const { status, data } = error.response;
    const errorData = data as Record<string, unknown>;

    const errorInfo = errorData?.error as Record<string, unknown> | undefined;
    return new SayariAPIError(
      status,
      (errorInfo?.code as string) || `HTTP_${status}`,
      (errorInfo?.message as string) || error.message || 'API request failed',
      errorInfo?.details
    );
  }

  if (error.request) {
    return new SayariAPIError(
      0,
      'NETWORK_ERROR',
      'Network error - no response received'
    );
  }

  return new SayariAPIError(
    0,
    'REQUEST_ERROR',
    error.message || 'Request configuration error'
  );
}

// Custom error class
export class SayariAPIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SayariAPIError';
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isBadRequest(): boolean {
    return this.status === 400;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get retryAfter(): number | null {
    if (this.isRateLimited && this.details && typeof this.details === 'object') {
      const details = this.details as Record<string, unknown>;
      if (details.retryAfter && typeof details.retryAfter === 'string') {
        return parseInt(details.retryAfter, 10);
      }
    }
    return null;
  }
}

// Rate limiting helper
export async function withRateLimit<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let attempt = 0;
  let lastError: SayariAPIError;

  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as SayariAPIError;
      
      if (!lastError.isRateLimited || attempt === maxRetries - 1) {
        throw lastError;
      }

      // Calculate delay (exponential backoff with jitter)
      const retryAfter = lastError.retryAfter || (baseDelay * Math.pow(2, attempt));
      const jitter = Math.random() * 1000; // Add up to 1 second of jitter
      const delay = retryAfter + jitter;

      console.log(`Rate limited. Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }

  throw lastError!;
}

export default sayariClient;