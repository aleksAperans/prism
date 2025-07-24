import { config } from '@/lib/config';
import type { SayariTokenResponse } from '@/types/api.types';

interface TokenCache {
  token: SayariTokenResponse | null;
  expiresAt: number;
}

class SayariAuthService {
  private tokenCache: TokenCache = {
    token: null,
    expiresAt: 0,
  };

  async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token (with 5-minute buffer)
    if (this.tokenCache.token && Date.now() < this.tokenCache.expiresAt - 300000) {
      return this.tokenCache.token.access_token;
    }

    // Request new token
    try {
      const response = await fetch(`${config.sayari.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: config.sayari.clientId,
          client_secret: config.sayari.clientSecret,
          audience: config.sayari.audience,
          grant_type: config.sayari.grantType,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication failed: ${response.status} ${errorText}`);
      }

      const tokenData: SayariTokenResponse = await response.json();
      
      // Cache the token
      this.tokenCache = {
        token: tokenData,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
      };

      return tokenData.access_token;
    } catch (error) {
      console.error('Failed to authenticate with Sayari API:', error);
      throw new Error('Authentication failed');
    }
  }

  async refreshToken(): Promise<string> {
    // Force token refresh by clearing cache
    this.tokenCache = {
      token: null,
      expiresAt: 0,
    };
    
    return this.getAccessToken();
  }

  isTokenValid(): boolean {
    return this.tokenCache.token !== null && Date.now() < this.tokenCache.expiresAt;
  }

  getTokenExpirationTime(): number | null {
    return this.tokenCache.expiresAt || null;
  }

  clearToken(): void {
    this.tokenCache = {
      token: null,
      expiresAt: 0,
    };
  }
}

// Create a singleton instance
export const sayariAuthService = new SayariAuthService();