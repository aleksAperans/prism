'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronRight, XCircle, CircleDashed, Trash2, ShieldAlert, Shield, Eye, User } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import React, { useState, useCallback, useEffect } from 'react';
import { RiskFactorsDisplay } from './RiskFactorsDisplay';
import { MatchedAttributesDisplay } from './MatchedAttributesDisplay';
import { MatchRiskDisplay } from './MatchRiskDisplay';
import { RiskLevelBadges } from '@/components/common/RiskLevelBadge';
import { CountryBadgeList } from '@/components/common/CountryBadge';
import { RiskScoreBadge } from '@/components/screening/RiskScoreBadge';
import { EntityTypeBadge } from '@/components/common/EntityTypeBadge';
import riskFactorsData from '@/lib/risk-factors-data.json';
// Import only client-safe functions and types
export interface RiskProfile {
  id: string;
  name: string;
  description: string;
  enabledFactors: string[];
  isDefault: boolean;
  createdAt: string;
  createdBy: string;
  riskScoringEnabled: boolean;
  riskThreshold: number;
  riskScores: Record<string, number>;
  categories: Record<string, { name: string; description: string; enabled: boolean }>;
}

// Client-safe risk profile loading function
async function clientLoadDefaultRiskProfile(): Promise<RiskProfile | null> {
  try {
    const response = await fetch('/api/risk-profiles/default');
    
    if (!response.ok) {
      console.warn('Failed to load default risk profile from API');
      return null;
    }
    
    const data = await response.json();
    return data.profile || null;
  } catch (error) {
    console.error('Failed to load default risk profile:', error);
    return null;
  }
}

// Client-safe risk factor filtering function
function filterRiskFactorsByProfile(
  riskFactors: Array<{ id: string }>,
  profile: RiskProfile | null
): Array<{ id: string }> {
  if (!profile) {
    // If no profile is loaded, return all risk factors
    return riskFactors;
  }
  
  // Filter to only include enabled factors
  return riskFactors.filter(rf => profile.enabledFactors.includes(rf.id));
}

interface RiskFactor {
  factor: string;
  description?: string;
  severity?: string;
}

interface ScreeningResult {
  id: string;
  entity_id?: string;
  entity_name: string;
  entity_type: string;
  match_strength?: string;
  risk_factors: RiskFactor[] | Record<string, unknown>;
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
      address?: string[];
      country: string[];
      identifier?: string[];
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

interface ScreeningResultsProps {
  results: ScreeningResult[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  onMatchRemoved?: (refreshedData?: { matches: unknown[]; risk_factors: unknown[]; match_count: number }) => void;
  alreadyExists?: boolean;
  selectedRiskProfile?: string; // Add the selected risk profile ID
}

export function ScreeningResults({ 
  results, 
  isLoading = false, 
  error, 
  onRetry,
  onMatchRemoved,
  alreadyExists = false,
  selectedRiskProfile
}: ScreeningResultsProps) {
  const [localResults, setLocalResults] = useState<ScreeningResult[]>(results);
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});
  const [expandedRiskFactors, setExpandedRiskFactors] = useState<Record<string, boolean>>({});
  const [expandedIndividualMatches, setExpandedIndividualMatches] = useState<Record<string, boolean>>({});
  const [removingMatches, setRemovingMatches] = useState<Record<string, boolean>>({});
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);

  // Sync with parent results when they change
  useEffect(() => {
    setLocalResults(results);
    // Force risk profile reload when new results come in
    if (results.length > 0) {
      console.log('📊 New screening results received, will reload risk profile');
    }
  }, [results]);

  // Load risk profile for filtering
  useEffect(() => {
    const loadRiskProfile = async () => {
      try {
        let profile = null;
        
        // Load the selected risk profile if provided
        if (selectedRiskProfile) {
          console.log('🎯 Loading selected risk profile for match filtering:', selectedRiskProfile);
          
          // Handle special case for "default" profile
          if (selectedRiskProfile === 'default') {
            console.log('📋 Selected profile is "default", loading default profile');
            profile = await clientLoadDefaultRiskProfile();
          } else {
            // Load specific profile by ID
            const response = await fetch(`/api/risk-profiles/${selectedRiskProfile}`);
            if (response.ok) {
              const data = await response.json();
              profile = data.profile;
            }
          }
        }
        
        // Fall back to default if no profile was selected or loading failed
        if (!profile) {
          console.log('📋 Loading default risk profile as final fallback');
          profile = await clientLoadDefaultRiskProfile();
        }
        
        setRiskProfile(profile);
        if (profile) {
          console.log('✅ Risk profile loaded for match filtering:', profile.name);
          console.log('📋 Enabled factors:', profile.enabledFactors.length, profile.enabledFactors);
        }
      } catch (error) {
        console.warn('Failed to load risk profile for match filtering:', error);
      }
    };
    loadRiskProfile();
  }, [selectedRiskProfile, results]);

  // Helper function to get filtered risk factor count for a match
  const getFilteredRiskFactorCount = useCallback((matchRiskFactors: Array<{ id: string }>) => {
    if (!matchRiskFactors) return 0;
    
    // If risk profile hasn't loaded yet, show raw count as fallback
    if (!riskProfile) return matchRiskFactors.length;
    
    // Filter risk factors based on the risk profile
    const filteredFactors = filterRiskFactorsByProfile(matchRiskFactors, riskProfile);
    return filteredFactors.length;
  }, [riskProfile]);

  const toggleMatches = useCallback((resultId: string) => {
    setExpandedMatches(prev => ({
      ...prev,
      [resultId]: !(prev[resultId] ?? false)
    }));
  }, []);

  const toggleRiskFactors = useCallback((resultId: string) => {
    setExpandedRiskFactors(prev => ({
      ...prev,
      [resultId]: !(prev[resultId] ?? false)
    }));
  }, []);

  const toggleIndividualMatch = useCallback((uniqueMatchKey: string) => {
    setExpandedIndividualMatches(prev => ({
      ...prev,
      [uniqueMatchKey]: !(prev[uniqueMatchKey] ?? false) // Default to false (collapsed)
    }));
  }, []);

  const removeMatch = async (matchId: string, projectId: string, projectEntityId: string) => {
    // Prevent multiple simultaneous requests for the same match
    if (removingMatches[matchId]) {
      console.log('🚫 Already removing match:', matchId);
      return;
    }
    
    console.log('🗑️ Starting optimistic match removal:', matchId);
    
    // Find which result contains this match
    const resultWithMatch = localResults.find(result => 
      result.matches?.some(match => match.match_id === matchId)
    );
    
    if (!resultWithMatch) {
      console.log('❌ Match not found in local results (may have been already removed):', matchId);
      return;
    }
    
    try {
      setRemovingMatches(prev => ({ ...prev, [matchId]: true }));
      
      // Optimistic update: remove match immediately from local state
      setLocalResults(prev => prev.map(result => {
        if (result.id === resultWithMatch.id) {
          const updatedMatches = result.matches?.filter(match => match.match_id !== matchId) || [];
          return {
            ...result,
            matches: updatedMatches,
            full_result: result.full_result ? {
              ...result.full_result,
              match_count: updatedMatches.length
            } : undefined
          };
        }
        return result;
      }));
      
      const response = await fetch(
        `/api/matches/${matchId}?project_id=${projectId}&project_entity_id=${projectEntityId}`,
        {
          method: 'DELETE',
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Match removal confirmed by server');
        // Don't call onMatchRemoved here - let the optimistic update stand
        // The parent will get updated through other means if needed
      } else {
        const error = await response.json();
        console.error('❌ Server failed to remove match:', error);
        
        // Handle 404 gracefully - match was already removed, keep optimistic update
        if (response.status === 404) {
          console.log('⚠️ Match was already removed on server - keeping optimistic update');
          // Don't rollback, the match is gone either way
        } else {
          console.log('🔄 Rolling back optimistic update due to server error');
          // Rollback optimistic update on non-404 errors
          setLocalResults(results);
          onMatchRemoved?.();
        }
      }
    } catch (error) {
      console.error('💥 Network error during match removal:', error);
      // Rollback optimistic update on network error
      setLocalResults(results);
      onMatchRemoved?.();
    } finally {
      // Clear the removing state after a slight delay to prevent flickering
      setTimeout(() => {
        setRemovingMatches(prev => {
          const newState = { ...prev };
          delete newState[matchId];
          return newState;
        });
      }, 100);
    }
  };

  // Helper function to calculate level counts for a result
  const calculateLevelCounts = (riskFactors: unknown) => {
    const riskFactorIds = Array.isArray(riskFactors) 
      ? riskFactors.map(rf => {
          if (typeof rf === 'object' && rf !== null && 'id' in rf) {
            return (rf as { id: string }).id;
          }
          if (typeof rf === 'object' && rf !== null && 'factor' in rf) {
            return (rf as { factor: string }).factor;
          }
          return rf as string;
        })
      : Object.keys(riskFactors || {});
    
    // Use the imported risk factors data
    
    const counts: Record<string, number> = {};
    riskFactorIds.forEach(id => {
      const csvData = riskFactorsData[id as keyof typeof riskFactorsData];
      let level = 'other';
      
      if (csvData) {
        level = csvData.level === 'Critical' ? 'critical' :
               csvData.level === 'High' ? 'high' :
               csvData.level === 'Elevated' ? 'elevated' :
               csvData.level === 'Standard' ? 'other' : 'other';
      }
      
      counts[level] = (counts[level] || 0) + 1;
    });
    
    return counts;
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-muted-foreground">Analyzing entities...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {onRetry && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRetry}
                  className="ml-4"
                >
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            <CheckCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No analysis results yet.</p>
            <p className="text-sm">Submit the form above to analyze entities.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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



  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Screening Results</h3>
      </div>

      {/* Already Exists Notification */}
      {alreadyExists && (
        <Alert>
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 flex-wrap">
              <span>This entity already exists in the project</span>
              {localResults[0]?.full_result?.project_entity_id && (
                <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono break-all">
                  {localResults[0].full_result.project_entity_id}
                </code>
              )}
              <span>-- showing existing result.</span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {localResults.map((result) => {
        // Determine if there are risks for card border styling
        const hasRisks = Array.isArray(result.risk_factors) 
          ? result.risk_factors.length > 0 
          : Object.keys(result.risk_factors || {}).length > 0;

        return (
          <Card key={result.id}>
            <CardHeader>
              <div className="space-y-3">
                {/* Entity name with badges and action button in same row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold truncate mb-1">{result.entity_name}</h3>
                  </div>
                  
                  {/* Badges and action button - aligned with entity name */}
                  <div className="flex items-center flex-wrap gap-2 flex-shrink-0">
                    {result.matches && result.matches.length > 0 && (
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {result.matches.length} match{result.matches.length !== 1 ? 'es' : ''}
                      </Badge>
                    )}
                    {result.match_strength && (
                      <Badge 
                        variant="outline" 
                        className={`${getMatchStrengthColor(result.match_strength)} whitespace-nowrap text-xs`}
                      >
                        {result.match_strength === 'strong' ? 'high confidence' : 
                         result.match_strength === 'partial' ? 'medium confidence' :
                         result.match_strength === 'medium' ? 'medium confidence' : 
                         result.match_strength === 'no_match' ? 'no match' :
                         result.match_strength === 'No_match' ? 'no match' :
                         result.match_strength}
                      </Badge>
                    )}
                    
                    
                    {/* Entity Profile Link */}
                    {result.full_result?.project_id && result.full_result?.project_entity_id && (
                      <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
                        <Link 
                          href={`/projects/${result.full_result.project_id}/entities/${result.full_result.project_entity_id}?from=screening`}
                          className="flex items-center space-x-1"
                        >
                          <Eye className="h-3 w-3" />
                          <span className="text-xs">View Profile</span>
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Entity type badge row */}
                <div className="flex items-center">
                  <EntityTypeBadge type={result.entity_type} />
                </div>
                
                {/* Metadata row */}
                <CardDescription className="space-y-2">
                  {result.full_result?.countries && result.full_result.countries.length > 0 && (
                    <div className="flex items-center flex-wrap gap-1">
                      <CountryBadgeList 
                        countryCodes={result.full_result.countries}
                        size="sm"
                        maxVisible={5}
                      />
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Analyzed {formatDistanceToNow(new Date(result.created_at))} ago
                  </div>
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* No Match Content */}
              {(result.match_strength?.toLowerCase() === 'no_match' || result.match_strength === 'No_match') && (
                <div className="flex items-center justify-center p-4 sm:p-8">
                  <div className="text-center max-w-sm mx-auto">
                    <CircleDashed className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                    <h3 className="text-base sm:text-lg font-medium mb-2">No Match Found</h3>
                    <p className="text-sm text-muted-foreground">
                      This entity was not found in our knowledge graph.
                    </p>
                  </div>
                </div>
              )}

              {/* Risk Factors Section - Only show when entity was matched */}
              {result.match_strength?.toLowerCase() !== 'no_match' && result.match_strength !== 'No_match' && (
                <Collapsible 
                  key={`risk-factors-${result.id}`}
                  open={expandedRiskFactors[result.id] ?? true} 
                  onOpenChange={() => toggleRiskFactors(result.id)}
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
                          <h4 className="text-sm font-medium flex items-center gap-2 min-w-0">
                            {hasRisks ? (
                              <>
                                <ShieldAlert className="h-4 w-4 text-black dark:text-white flex-shrink-0" />
                                <span className="truncate">Risk Assessment</span>
                                <Badge variant="outline" className="text-xs whitespace-nowrap flex-shrink-0">
                                  {Array.isArray(result.risk_factors) ? result.risk_factors.length : Object.keys(result.risk_factors || {}).length}
                                </Badge>
                                {/* Risk Score Display */}
                                {result.risk_score && (
                                  <RiskScoreBadge 
                                    riskScore={result.risk_score}
                                    size="sm"
                                  />
                                )}
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                <span>Risk Assessment</span>
                              </>
                            )}
                          </h4>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {hasRisks && (
                              <div className="hidden sm:block">
                                <RiskLevelBadges 
                                  counts={calculateLevelCounts(result.risk_factors)}
                                  size="sm"
                                />
                              </div>
                            )}
                            {(expandedRiskFactors[result.id] ?? true) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        {/* Risk level badges on mobile - show below title */}
                        {hasRisks && (
                          <div className="sm:hidden mt-2">
                            <RiskLevelBadges 
                              counts={calculateLevelCounts(result.risk_factors)}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="mt-3">
                      <RiskFactorsDisplay 
                        riskFactors={result.risk_factors}
                        showTitle={false}
                        riskScores={result.risk_score?.triggeredRiskFactors?.reduce((acc, rf) => {
                          acc[rf.id] = rf.score;
                          return acc;
                        }, {} as Record<string, number>)}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Matches Section - Collapsible */}
              {result.matches && result.matches.length > 0 && (
                <Collapsible 
                  key={`matches-${result.id}`}
                  open={expandedMatches[result.id] === true} 
                  onOpenChange={() => toggleMatches(result.id)}
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors gap-2">
                      <h4 className="text-sm font-medium flex items-center gap-2 min-w-0">
                        <ExternalLink className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="truncate">Matches Found</span>
                        <Badge variant="outline" className="text-xs whitespace-nowrap flex-shrink-0">
                          {result.matches.length}
                        </Badge>
                      </h4>
                      <div className="flex-shrink-0">
                        {expandedMatches[result.id] ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="space-y-3 mt-3">
                      {result.matches
                        .filter(match => {
                          // Validate match data integrity
                          const isValid = match && 
                                         match.match_id && 
                                         match.label && 
                                         match.sayari_entity_id &&
                                         typeof match.label === 'string' &&
                                         match.label.trim().length > 0;
                          
                          if (!isValid) {
                            console.log('🚫 Filtering out invalid match:', {
                              match,
                              hasMatchId: !!match?.match_id,
                              hasLabel: !!match?.label,
                              hasSayariId: !!match?.sayari_entity_id,
                              labelType: typeof match?.label,
                              labelLength: match?.label?.length
                            });
                          }
                          return isValid;
                        })
                        // No sorting - maintain API response order
                        .map((match, index) => {
                          const uniqueMatchKey = `${result.id}-${match.match_id}-${index}`;
                          return (
                          <div 
                            key={uniqueMatchKey} 
                            className={`bg-card border rounded-lg shadow-sm transition-all duration-200 overflow-hidden ${
                              removingMatches[match.match_id] ? 'opacity-75 scale-[0.98]' : 'opacity-100 scale-100'
                            }`}
                          >
                            <Collapsible 
                              open={expandedIndividualMatches[uniqueMatchKey] ?? false}
                              onOpenChange={() => toggleIndividualMatch(uniqueMatchKey)}
                            >
                              <CollapsibleTrigger asChild>
                                <div className="w-full p-4 rounded-t-lg hover:bg-accent transition-colors cursor-pointer">
                                  <div className="space-y-2">
                                    {/* Match name with action buttons */}
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <span className="font-medium text-sm truncate">{match.label}</span>
                                      </div>
                                      
                                      {/* Action buttons and collapse indicator */}
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
                                          <a 
                                            href={`https://graph.sayari.com/resource/entity/${match.sayari_entity_id}`}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center space-x-1"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                            <span className="text-xs">View in Graph</span>
                                          </a>
                                        </Button>
                                        {result.full_result?.project_entity_id && (
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const projectId = result.full_result?.project_id || '';
                                              const projectEntityId = result.full_result?.project_entity_id || '';
                                              
                                              if (!projectId || !projectEntityId) {
                                                console.error('Missing required IDs for match removal:', { projectId, projectEntityId });
                                                return;
                                              }
                                              
                                              removeMatch(match.match_id, projectId, projectEntityId);
                                            }}
                                            disabled={removingMatches[match.match_id]}
                                            className={`flex-shrink-0 transition-colors ${
                                              removingMatches[match.match_id] 
                                                ? 'text-gray-400 cursor-not-allowed'
                                                : ''
                                            }`}
                                          >
                                            {removingMatches[match.match_id] ? (
                                              <>
                                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                                                <span className="ml-1 text-xs">Removing...</span>
                                              </>
                                            ) : (
                                              <>
                                                <Trash2 className="h-3 w-3" />
                                                <span className="ml-1 text-xs">Remove</span>
                                              </>
                                            )}
                                          </Button>
                                        )}
                                        
                                        {/* Collapse indicator */}
                                        <div className="flex items-center">
                                          {(expandedIndividualMatches[uniqueMatchKey] ?? false) ? (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Countries row - elegant and subtle */}
                                    {match.countries && match.countries.length > 0 && (
                                      <div className="flex items-center gap-1 pl-1">
                                        <CountryBadgeList 
                                          countryCodes={match.countries}
                                          size="sm"
                                          maxVisible={4}
                                          className="opacity-75"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              
                              <CollapsibleContent>
                                <div className="px-4 pb-4 space-y-3">
                                  
                                  {/* Collapsible matched attributes display */}
                                  {match.matched_attributes && (
                                    <Collapsible 
                                      open={expandedIndividualMatches[`${uniqueMatchKey}-attributes`] ?? true}
                                      onOpenChange={() => {
                                        const key = `${uniqueMatchKey}-attributes`;
                                        setExpandedIndividualMatches(prev => ({
                                          ...prev,
                                          [key]: !(prev[key] ?? true)
                                        }));
                                      }}
                                    >
                                      <CollapsibleTrigger asChild>
                                        <button className="w-full flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent transition-colors">
                                          <div className="flex items-center gap-2 text-sm font-medium">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            Matched Attributes
                                          </div>
                                          {(expandedIndividualMatches[`${uniqueMatchKey}-attributes`] ?? true) ? (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                          )}
                                        </button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="pt-2">
                                          <MatchedAttributesDisplay 
                                            matchedAttributes={match.matched_attributes}
                                          />
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  )}
                                  
                                  {/* Match-level risk display */}
                                  <MatchRiskDisplay 
                                    matchId={match.match_id}
                                    riskFactors={filterRiskFactorsByProfile(match.risk_factors || [], riskProfile)}
                                    matchLabel={match.label}
                                    className="mt-3"
                                    riskScores={riskProfile?.riskScores}
                                  />
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                          );
                        })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}