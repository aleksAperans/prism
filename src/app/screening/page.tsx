'use client';

import { useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { EntityForm } from '@/components/screening/EntityForm';
import { ScreeningResults } from '@/components/screening/ScreeningResults';
import { RecentSearches, saveRecentSearch } from '@/components/screening/RecentSearches';
import { EmptyState } from '@/components/common/EmptyStates';
import { LoadingCard } from '@/components/common/LoadingStates';
import { ExportButton } from '@/components/common/ExportButton';
import type { EntityFormData } from '@/types/app.types';

interface ScreeningResult {
  id: string;
  entity_id?: string;
  entity_name: string;
  entity_type: string;
  match_strength?: string;
  risk_factors: Record<string, unknown>;
  risk_score?: {
    totalScore: number;
    triggeredRiskFactors: Array<{
      id: string;
      score: number;
    }>;
    meetsThreshold: boolean;
    threshold: number;
  };
  matches?: Array<{
    match_id: string;
    sayari_entity_id: string;
    label: string;
    type: string;
    risk_factors: Array<{ id: string }>;
    matched_attributes: {
      name: string[];
      country: string[];
    };
    countries: string[];
  }>;
  created_at: string;
  sayari_url?: string;
  full_result?: {
    project_id: string;
    project_entity_id: string;
    label: string;
    strength: string;
    countries: string[];
    parent_risk_factors: Array<{ id: string }>;
    match_count: number;
  };
}

export default function ScreeningPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyExists, setAlreadyExists] = useState<boolean>(false);
  const [selectedRiskProfile, setSelectedRiskProfile] = useState<string | undefined>(undefined);
  const formSetValueRef = useRef<((field: string, value: unknown) => void) | null>(null);

  const handleScreening = async (data: EntityFormData) => {
    setIsLoading(true);
    setError(null);
    // Hard reset - clear previous result
    setResult(null);
    setAlreadyExists(false);
    // Capture the selected risk profile for match filtering
    setSelectedRiskProfile(data.risk_profile);
    
    try {
      const response = await fetch('/api/screening', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Screening failed');
      }

      if (responseData.success && responseData.result) {
        // Set single result instead of array
        setResult(responseData.result);
        setAlreadyExists(responseData.already_exists || false);
        
        // Save to recent searches with result data
        saveRecentSearch(data, {
          matchStrength: responseData.result.match_strength,
          riskScore: responseData.result.risk_score ? {
            totalScore: responseData.result.risk_score.totalScore,
            meetsThreshold: responseData.result.risk_score.meetsThreshold,
            threshold: responseData.result.risk_score.threshold
          } : {
            // Default when no risk score is calculated (e.g., no risk factors found)
            totalScore: 0,
            meetsThreshold: false,
            threshold: 5 // Default threshold, could be fetched from config
          }
        });
      }
      
    } catch (error) {
      console.error('Screening failed:', error);
      setError(error instanceof Error ? error.message : 'Screening failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
  };

  const handleSelectRecentSearch = (searchData: EntityFormData) => {
    if (formSetValueRef.current) {
      // Populate all form fields with the recent search data
      Object.entries(searchData).forEach(([field, value]) => {
        if (value !== undefined) {
          formSetValueRef.current!(field, value);
        }
      });
    }
  };

  const handleMatchRemoved = (refreshedData?: { matches: unknown[]; risk_factors: unknown[] | Record<string, unknown>; match_count: number }) => {
    setError(null);
    
    // Only update if we have refreshed data from server
    if (refreshedData && result) {
      console.log('🔄 Updating with server data after match removal:', {
        before: {
          matchCount: result.matches?.length || 0,
          matchIds: result.matches?.map(m => m?.match_id).filter(Boolean) || []
        },
        after: {
          matchCount: refreshedData.matches?.length || 0,
          matchIds: refreshedData.matches?.map((m: unknown) => (m as { match_id?: string })?.match_id).filter(Boolean) || []
        }
      });
      
      setResult(prevResult => {
        if (!prevResult) return prevResult;
        
        return {
          ...prevResult,
          matches: refreshedData.matches || [],
          risk_factors: Array.isArray(refreshedData.risk_factors) 
            ? refreshedData.risk_factors 
            : (refreshedData.risk_factors || {}),
          full_result: prevResult.full_result ? {
            ...prevResult.full_result,
            match_count: refreshedData.match_count || 0
          } : undefined
        } as ScreeningResult;
      });
    }
  };


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Screen Entities
          </h2>
          <p className="text-muted-foreground">
            Screen entities to identify potential risks.
          </p>
        </div>
        
        {result && (
          <ExportButton data={[result]} filename="entity-analysis" size="sm" />
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-5 items-start">
        {/* Input Form and Recent Searches - Left Side */}
        <div className="lg:col-span-2 space-y-4">
          <EntityForm 
            onSubmit={handleScreening} 
            isLoading={isLoading}
            onFormReady={(setValue) => { formSetValueRef.current = setValue; }}
          />
          
          {/* Recent Searches */}
          <RecentSearches 
            onSelectSearch={handleSelectRecentSearch}
          />
        </div>
        
        {/* Results - Right Side */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <LoadingCard 
              title="Analyzing Entity..."
              description="Processing entity data through Prism's intelligence engine"
            />
          ) : result ? (
            <ScreeningResults 
              results={[result]}
              error={error || undefined}
              onRetry={handleRetry}
              onMatchRemoved={handleMatchRemoved}
              alreadyExists={alreadyExists}
              selectedRiskProfile={selectedRiskProfile}
            />
          ) : (
            <EmptyState 
              icon={Search}
              title="No analysis performed"
              description="Enter entity details in the form and click 'Screen Entity' to see results"
            />
          )}
        </div>
      </div>
    </div>
  );
}