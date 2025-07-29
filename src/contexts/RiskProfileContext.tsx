'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { RiskProfile } from '@/lib/risk-profiles/yaml-loader';

interface RiskProfileContextValue {
  activeProfile: RiskProfile | null;
  isLoading: boolean;
  error: string | null;
  setActiveProfile: (profileId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const RiskProfileContext = createContext<RiskProfileContextValue | undefined>(undefined);

interface RiskProfileProviderProps {
  children: ReactNode;
}

export function RiskProfileProvider({ children }: RiskProfileProviderProps) {
  const [activeProfile, setActiveProfileState] = useState<RiskProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActiveProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/settings/active-risk-profile');
      if (!response.ok) {
        throw new Error('Failed to load active risk profile');
      }

      const data = await response.json();
      setActiveProfileState(data.profile);
    } catch (err) {
      console.error('Error loading active risk profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load active risk profile');
      
      // Fallback to default profile if global setting fails
      try {
        const fallbackResponse = await fetch('/api/risk-profiles/default');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setActiveProfileState(fallbackData.profile);
          console.log('🔄 Falling back to default risk profile');
        }
      } catch (fallbackErr) {
        console.error('Fallback to default profile also failed:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveProfile = async (profileId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/settings/active-risk-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profileId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set active risk profile');
      }

      const data = await response.json();
      setActiveProfileState(data.profile);
      console.log('✅ Active risk profile updated:', data.profile.name);
    } catch (err) {
      console.error('Error setting active risk profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to set active risk profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    await loadActiveProfile();
  };

  useEffect(() => {
    loadActiveProfile();
  }, []);

  const value: RiskProfileContextValue = {
    activeProfile,
    isLoading,
    error,
    setActiveProfile,
    refreshProfile,
  };

  return (
    <RiskProfileContext.Provider value={value}>
      {children}
    </RiskProfileContext.Provider>
  );
}

export function useGlobalRiskProfile(): RiskProfileContextValue {
  const context = useContext(RiskProfileContext);
  if (context === undefined) {
    throw new Error('useGlobalRiskProfile must be used within a RiskProfileProvider');
  }
  return context;
}