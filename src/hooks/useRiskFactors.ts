import { useState } from 'react';
import type { RiskFactor } from '@/types/api.types';

interface UseRiskFactorsResult {
  getRiskFactor: (id: string) => Promise<RiskFactor | null>;
  getRiskFactors: (ids: string[]) => Promise<RiskFactor[]>;
  isLoading: boolean;
  error: string | null;
}

export function useRiskFactors(): UseRiskFactorsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<Map<string, RiskFactor>>(new Map());

  const getRiskFactor = async (id: string): Promise<RiskFactor | null> => {
    // Check cache first
    if (cache.has(id)) {
      return cache.get(id) || null;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/risk-factors?id=${encodeURIComponent(id)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch risk factor');
      }
      
      const data: { success: boolean; data: RiskFactor | null } = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch risk factor');
      }
      
      // Cache the result
      if (data.data) {
        setCache(prev => new Map(prev.set(id, data.data!)));
      }
      
      return data.data;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching risk factor:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskFactors = async (ids: string[]): Promise<RiskFactor[]> => {
    // Check which IDs are already cached
    const cached: RiskFactor[] = [];
    const uncached: string[] = [];
    
    ids.forEach(id => {
      const cachedFactor = cache.get(id);
      if (cachedFactor) {
        cached.push(cachedFactor);
      } else {
        uncached.push(id);
      }
    });
    
    // If all are cached, return immediately
    if (uncached.length === 0) {
      return cached;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/risk-factors?ids=${uncached.map(id => encodeURIComponent(id)).join(',')}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch risk factors');
      }
      
      const data: { success: boolean; data: RiskFactor[] } = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch risk factors');
      }
      
      // Cache the results
      const newCache = new Map(cache);
      data.data.forEach(factor => {
        newCache.set(factor.id, factor);
      });
      setCache(newCache);
      
      // Return all results (cached + newly fetched)
      return [...cached, ...data.data];
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching risk factors:', err);
      return cached; // Return what we have cached
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getRiskFactor,
    getRiskFactors,
    isLoading,
    error,
  };
}