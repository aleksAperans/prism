'use client';

import { Clock, Building, User, ArrowRight, Search, ShieldAlert, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CountryBadge } from '@/components/common/CountryBadge';
import { RiskScoreBadge } from '@/components/screening/RiskScoreBadge';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import type { EntityFormData } from '@/types/app.types';

interface RecentSearch extends EntityFormData {
  id: string;
  timestamp: string;
  // Result data
  matchStrength?: string;
  riskScore?: {
    totalScore: number;
    meetsThreshold: boolean;
    threshold?: number;
  };
}

interface RecentSearchesProps {
  onSelectSearch: (search: EntityFormData) => void;
  className?: string;
}

const RECENT_SEARCHES_KEY = 'prism_recent_searches';
const MAX_RECENT_SEARCHES = 5;

// Helper functions to match ScreeningResults component exactly
const getMatchStrengthColor = (strength?: string) => {
  switch (strength?.toLowerCase()) {
    case 'strong': return 'bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20';
    case 'partial': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20';
    case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20';
    case 'weak': return 'bg-muted text-muted-foreground border-muted';
    case 'no_match': return 'bg-muted text-muted-foreground border-muted';
    default: return 'bg-muted text-muted-foreground border-muted';
  }
};

const getMatchStrengthIcon = (strength?: string) => {
  switch (strength?.toLowerCase()) {
    case 'strong': return <ShieldAlert className="h-4 w-4" />;
    case 'partial': return <ShieldAlert className="h-4 w-4" />;
    case 'medium': return <ShieldAlert className="h-4 w-4" />;
    case 'weak': return <Clock className="h-4 w-4" />;
    case 'no_match': return <XCircle className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};


export function RecentSearches({ onSelectSearch, className = '' }: RecentSearchesProps) {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const loadRecentSearches = () => {
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          const searches = JSON.parse(stored) as RecentSearch[];
          // Ensure we only show the most recent 5
          setRecentSearches(searches.slice(0, MAX_RECENT_SEARCHES));
        }
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      }
    };

    loadRecentSearches();
    
    // Listen for storage events to sync across tabs
    window.addEventListener('storage', loadRecentSearches);
    
    // Custom event for same-tab updates
    window.addEventListener('recentSearchesUpdated', loadRecentSearches);
    
    return () => {
      window.removeEventListener('storage', loadRecentSearches);
      window.removeEventListener('recentSearchesUpdated', loadRecentSearches);
    };
  }, []);

  const handleSelectSearch = (search: RecentSearch) => {
    // Remove id, timestamp, and result data before passing to form
    const { 
      id: _id, 
      timestamp: _timestamp, 
      matchStrength: _matchStrength,
      riskScore: _riskScore,
      ...formData 
    } = search;
    onSelectSearch(formData);
  };

  if (recentSearches.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Most Recent
          </CardTitle>
          <CardDescription>
            Your recent searches will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Search className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No recent searches yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          <Clock className="mr-2 h-4 w-4" />
          Most Recent
        </CardTitle>
        <CardDescription>
          Click to re-run a previous screening
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentSearches.map((search) => (
          <Button
            key={search.id}
            variant="ghost"
            className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-accent border border-border/40 rounded-md"
            onClick={() => handleSelectSearch(search)}
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {search.type === 'company' ? (
                    <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-medium text-sm truncate">{search.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {search.country && (
                    <CountryBadge 
                      countryCode={search.country}
                      size="sm"
                      variant="secondary"
                    />
                  )}
                  {search.matchStrength && (
                    <Badge 
                      variant="outline" 
                      className={getMatchStrengthColor(search.matchStrength)}
                    >
                      <span>
                        {search.matchStrength === 'strong' ? 'high confidence' : 
                         search.matchStrength === 'partial' ? 'medium confidence' :
                         search.matchStrength === 'medium' ? 'medium confidence' : 
                         search.matchStrength === 'no_match' ? 'no match' :
                         search.matchStrength === 'No_match' ? 'no match' :
                         search.matchStrength}
                      </span>
                    </Badge>
                  )}
                  {search.riskScore && search.riskScore.threshold !== undefined && search.riskScore.threshold > 0 && (
                    <RiskScoreBadge 
                      riskScore={{
                        totalScore: search.riskScore.totalScore,
                        meetsThreshold: search.riskScore.meetsThreshold,
                        threshold: search.riskScore.threshold,
                        triggeredRiskFactors: []
                      }}
                      size="sm"
                      showThresholdExceeded={false}
                    />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(search.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

// Helper function to save a search to recent searches
export function saveRecentSearch(
  searchData: EntityFormData, 
  resultData?: { 
    matchStrength?: string; 
    riskScore?: { totalScore: number; meetsThreshold: boolean; threshold?: number } 
  }
) {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    const searches: RecentSearch[] = stored ? JSON.parse(stored) : [];
    
    // Create new search entry
    const newSearch: RecentSearch = {
      ...searchData,
      id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...(resultData && {
        matchStrength: resultData.matchStrength,
        riskScore: resultData.riskScore
      })
    };
    
    // Remove duplicates based on key fields
    const filtered = searches.filter(s => 
      !(s.name === searchData.name && 
        s.type === searchData.type && 
        s.country === searchData.country &&
        s.profile === searchData.profile)
    );
    
    // Add new search at the beginning
    const updated = [newSearch, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    
    // Save to localStorage
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('recentSearchesUpdated'));
  } catch (error) {
    console.error('Failed to save recent search:', error);
  }
}