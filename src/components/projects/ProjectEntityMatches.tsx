'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ExternalLink, Building, Trash2, ChevronRight, FileText, ShieldAlert, User, Database, Network } from 'lucide-react';
import { CountryBadgeList, CountryBadge } from '@/components/common/CountryBadge';
import { MatchedAttributesDisplay } from '@/components/screening/MatchedAttributesDisplay';
import { MatchRiskDisplay } from '@/components/screening/MatchRiskDisplay';
import { RiskLevelBadges } from '@/components/common/RiskLevelBadge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import riskFactorsData from '@/lib/risk-factors-data.json';
import { filterRiskFactorsByProfile } from '@/lib/risk-scoring-client';
import type { RiskProfile } from '@/lib/risk-profiles/yaml-loader';

interface Match {
  match_id: string;
  label: string;
  countries?: string[];
  matched_attributes?: {
    name?: string[];
    address?: string[];
    country: string[];
    identifier?: string[];
  };
  risk_factors?: Array<{ id: string }>;
  sayari_entity_id?: string;
  source_count?: number;
  sources?: Array<{
    id: string;
    label: string;
    source_type: string;
    country: string;
  }>;
  relationship_count?: Record<string, number>;
}

interface ProjectEntityMatchesProps {
  matches: Match[];
  projectId: string;
  projectEntityId: string;
  onMatchesUpdate?: (matches: Match[]) => void;
  riskScores?: Record<string, number>;
  riskProfile?: RiskProfile | null;
}

export function ProjectEntityMatches({ 
  matches: initialMatches, 
  projectId, 
  projectEntityId,
  onMatchesUpdate,
  riskScores,
  riskProfile
}: ProjectEntityMatchesProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [removingMatches, setRemovingMatches] = useState<Record<string, boolean>>({});
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});
  const [expandedAttributes, setExpandedAttributes] = useState<Record<string, boolean>>({});
  const [expandedRiskSections, setExpandedRiskSections] = useState<Record<string, boolean>>({});
  const [expandedSourcesSections, setExpandedSourcesSections] = useState<Record<string, boolean>>({});
  const [expandedRelationshipsSections, setExpandedRelationshipsSections] = useState<Record<string, boolean>>({});

  const toggleMatch = useCallback((matchId: string) => {
    setExpandedMatches(prev => ({
      ...prev,
      [matchId]: !prev[matchId]
    }));
  }, []);

  const toggleAttributes = useCallback((matchId: string) => {
    setExpandedAttributes(prev => ({
      ...prev,
      [matchId]: !prev[matchId]
    }));
  }, []);

  const toggleRiskSection = useCallback((matchId: string) => {
    setExpandedRiskSections(prev => ({
      ...prev,
      [matchId]: !prev[matchId]
    }));
  }, []);

  const toggleSourcesSection = useCallback((matchId: string) => {
    setExpandedSourcesSections(prev => ({
      ...prev,
      [matchId]: !prev[matchId]
    }));
  }, []);

  const toggleRelationshipsSection = useCallback((matchId: string) => {
    setExpandedRelationshipsSections(prev => ({
      ...prev,
      [matchId]: !prev[matchId]
    }));
  }, []);

  const removeMatch = async (matchId: string) => {
    // Prevent multiple simultaneous requests for the same match
    if (removingMatches[matchId]) {
      console.log('🚫 Already removing match:', matchId);
      return;
    }
    
    console.log('🗑️ Starting match removal:', matchId);
    
    try {
      setRemovingMatches(prev => ({ ...prev, [matchId]: true }));
      
      // Optimistic update: remove match immediately from local state
      const updatedMatches = matches.filter(match => match.match_id !== matchId);
      setMatches(updatedMatches);
      onMatchesUpdate?.(updatedMatches);
      
      // Make API call to delete match
      const response = await fetch(`/api/matches/${encodeURIComponent(matchId)}?project_id=${projectId}&project_entity_id=${projectEntityId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Match removal confirmed by server');
        
        // Update with refreshed data from server if available
        if (data.refreshedEntity?.matches) {
          setMatches(data.refreshedEntity.matches);
          onMatchesUpdate?.(data.refreshedEntity.matches);
        }
      } else {
        const error = await response.json();
        console.error('❌ Server failed to remove match:', error);
        
        // Handle 404 gracefully - match was already removed
        if (response.status === 404) {
          console.log('⚠️ Match was already removed on server - keeping optimistic update');
        } else {
          console.log('🔄 Rolling back optimistic update due to server error');
          // Rollback optimistic update on non-404 errors
          setMatches(initialMatches);
          onMatchesUpdate?.(initialMatches);
        }
      }
    } catch (error) {
      console.error('❌ Network error removing match:', error);
      // Rollback optimistic update
      setMatches(initialMatches);
      onMatchesUpdate?.(initialMatches);
    } finally {
      // Clear the removing state after a slight delay
      setTimeout(() => {
        setRemovingMatches(prev => {
          const newState = { ...prev };
          delete newState[matchId];
          return newState;
        });
      }, 100);
    }
  };

  // Helper function to calculate level counts for risk factors
  const calculateLevelCounts = (riskFactors: Array<{ id: string }>) => {
    const counts: Record<string, number> = {};
    riskFactors.forEach(rf => {
      const csvData = riskFactorsData[rf.id as keyof typeof riskFactorsData];
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

  if (!matches || matches.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Matches Found</h3>
            <p className="text-sm text-muted-foreground">
              This entity has no matches in the knowledge graph.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match, index) => {
        const isExpanded = expandedMatches[match.match_id] ?? false;
        const isRemoving = removingMatches[match.match_id] ?? false;
        
        // Filter risk factors based on risk profile
        const filteredRiskFactors = riskProfile 
          ? filterRiskFactorsByProfile(match.risk_factors || [], riskProfile)
          : match.risk_factors || [];
        
        const hasRisks = filteredRiskFactors && filteredRiskFactors.length > 0;
        const areAttributesExpanded = expandedAttributes[match.match_id] ?? true;
        const isRiskSectionExpanded = expandedRiskSections[match.match_id] ?? true;
        const isSourcesSectionExpanded = expandedSourcesSections[match.match_id] ?? false;
        const isRelationshipsSectionExpanded = expandedRelationshipsSections[match.match_id] ?? false;

        return (
          <Card key={match.match_id || index} className={cn("transition-opacity", isRemoving && "opacity-50")}>
            <Collapsible open={isExpanded}>
              <div className="px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMatch(match.match_id)}
                          className="h-5 w-5 p-0 hover:bg-transparent mt-0.5"
                        >
                          <ChevronRight 
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "rotate-90"
                            )} 
                          />
                          <span className="sr-only">Toggle match details</span>
                        </Button>
                      </CollapsibleTrigger>
                      <div className="flex-1 space-y-1">
                        <h3 className="text-sm font-medium leading-none truncate">
                          {match.label}
                        </h3>
                        {match.countries && match.countries.length > 0 && (
                          <div className="flex items-center gap-2">
                            <CountryBadgeList 
                              countryCodes={match.countries}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 px-2 text-xs"
                      asChild
                    >
                      <a 
                        href={`https://graph.sayari.com/resource/entity/${match.sayari_entity_id}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>View in Graph</span>
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs hover:text-destructive"
                      onClick={() => removeMatch(match.match_id)}
                      disabled={isRemoving}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
              
              <CollapsibleContent>
                <Separator />
                <div className="p-4 space-y-3">
                  {/* Matched Attributes */}
                  {match.matched_attributes && (
                    <Collapsible open={areAttributesExpanded}>
                      <CollapsibleTrigger asChild>
                        <button 
                          className="w-full flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent transition-colors"
                          onClick={() => toggleAttributes(match.match_id)}
                        >
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <User className="h-4 w-4 text-muted-foreground" />
                            Matched Attributes
                          </div>
                          <ChevronRight 
                            className={cn(
                              "h-4 w-4 transition-transform text-muted-foreground",
                              areAttributesExpanded && "rotate-90"
                            )} 
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 pb-2 pt-2">
                          <MatchedAttributesDisplay 
                            matchedAttributes={match.matched_attributes}
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Risk Assessment */}
                  {hasRisks && (
                    <Collapsible open={isRiskSectionExpanded}>
                      <CollapsibleTrigger asChild>
                        <button 
                          className="w-full flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent transition-colors"
                          onClick={() => toggleRiskSection(match.match_id)}
                        >
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                            Risk Assessment
                            <Badge variant="outline" className="ml-1">
                              {filteredRiskFactors.length}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <RiskLevelBadges 
                              counts={calculateLevelCounts(filteredRiskFactors)}
                              size="sm"
                            />
                            <ChevronRight 
                              className={cn(
                                "h-4 w-4 transition-transform text-muted-foreground",
                                isRiskSectionExpanded && "rotate-90"
                              )} 
                            />
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 pb-2 pt-2">
                          <MatchRiskDisplay 
                            matchId={match.match_id}
                            riskFactors={filteredRiskFactors}
                            matchLabel={match.label}
                            showTitle={false}
                            riskScores={riskScores}
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Sources */}
                  {match.sources && match.sources.length > 0 && (
                    <Collapsible open={isSourcesSectionExpanded}>
                      <CollapsibleTrigger asChild>
                        <button 
                          className="w-full flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent transition-colors"
                          onClick={() => toggleSourcesSection(match.match_id)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Database className="h-4 w-4 text-muted-foreground" />
                              Sources
                              <Badge variant="outline" className="text-xs">
                                {match.sources.length}
                              </Badge>
                            </div>
                            {/* Source type badges - right aligned with overflow handling */}
                            <div className="flex items-center gap-2 ml-auto">
                              {(() => {
                                // Group sources by type and count them
                                const sourceTypeCounts = match.sources.reduce((acc, source) => {
                                  const formattedType = source.source_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                  acc[formattedType] = (acc[formattedType] || 0) + 1;
                                  return acc;
                                }, {} as Record<string, number>);
                                
                                const entries = Object.entries(sourceTypeCounts)
                                  .sort(([, a], [, b]) => b - a); // Sort by count descending
                                const maxBadges = 3;
                                const displayEntries = entries.slice(0, maxBadges);
                                const remainingCount = entries.length - maxBadges;
                                
                                return (
                                  <>
                                    {displayEntries.map(([type, count]) => (
                                      <Badge key={type} variant="secondary" className="text-xs whitespace-nowrap">
                                        {count} {type}
                                      </Badge>
                                    ))}
                                    {remainingCount > 0 && (
                                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                                        +{remainingCount} more
                                      </Badge>
                                    )}
                                  </>
                                );
                              })()}
                              <ChevronRight 
                                className={cn(
                                  "h-4 w-4 transition-transform text-muted-foreground flex-shrink-0",
                                  isSourcesSectionExpanded && "rotate-90"
                                )} 
                              />
                            </div>
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 pb-2 pt-2 space-y-2">
                          {/* Sort sources by source_type for grouping */}
                          {match.sources
                            .sort((a, b) => a.source_type.localeCompare(b.source_type))
                            .map((source, sourceIndex) => (
                              <div key={source.id || sourceIndex} className="bg-card border rounded-md p-3 space-y-2">
                                {/* Source Label */}
                                <div className="font-medium text-sm">
                                  {source.label}
                                </div>
                                
                                {/* Source Type and Country */}
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {source.source_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </Badge>
                                  <CountryBadge 
                                    countryCode={source.country}
                                    size="sm"
                                  />
                                </div>
                              </div>
                            ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Relationships */}
                  {match.relationship_count && Object.keys(match.relationship_count).length > 0 && (
                    <Collapsible open={isRelationshipsSectionExpanded}>
                      <CollapsibleTrigger asChild>
                        <button 
                          className="w-full flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent transition-colors"
                          onClick={() => toggleRelationshipsSection(match.match_id)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Network className="h-4 w-4 text-muted-foreground" />
                              Relationships
                              <Badge variant="outline" className="text-xs">
                                {Object.values(match.relationship_count).reduce((sum, count) => sum + count, 0)}
                              </Badge>
                            </div>
                            {/* Relationship type badges - right aligned with overflow handling */}
                            <div className="flex items-center gap-2 ml-auto">
                              {(() => {
                                const entries = Object.entries(match.relationship_count)
                                  .sort(([, a], [, b]) => b - a); // Sort by count descending
                                const maxBadges = 3;
                                const displayEntries = entries.slice(0, maxBadges);
                                const remainingCount = entries.length - maxBadges;
                                
                                return (
                                  <>
                                    {displayEntries.map(([type, count]) => (
                                      <Badge key={type} variant="secondary" className="text-xs whitespace-nowrap">
                                        {count} {type.replace(/_/g, ' ')}
                                      </Badge>
                                    ))}
                                    {remainingCount > 0 && (
                                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                                        +{remainingCount} more
                                      </Badge>
                                    )}
                                  </>
                                );
                              })()}
                              <ChevronRight 
                                className={cn(
                                  "h-4 w-4 transition-transform text-muted-foreground flex-shrink-0",
                                  isRelationshipsSectionExpanded && "rotate-90"
                                )} 
                              />
                            </div>
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 pb-2 pt-2 space-y-2">
                          {/* Sort relationships by count descending (highest to lowest) */}
                          {Object.entries(match.relationship_count)
                            .sort(([, a], [, b]) => b - a)
                            .map(([type, count]) => (
                              <div key={type} className="bg-card border rounded-md p-3 space-y-2">
                                {/* Relationship Type */}
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-sm">
                                    {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {count}
                                  </Badge>
                                </div>
                                
                                {/* Relationship Description */}
                                <div className="text-xs text-muted-foreground">
                                  {count} relationship{count !== 1 ? 's' : ''} of this type
                                </div>
                              </div>
                            ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}