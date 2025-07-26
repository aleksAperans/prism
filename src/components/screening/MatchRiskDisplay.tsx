'use client';

import { Shield, ShieldAlert, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { RiskFactorsDisplay } from './RiskFactorsDisplay';
import { RiskLevelBadges } from '@/components/common/RiskLevelBadge';
import { useState } from 'react';
import riskFactorsData from '@/lib/risk-factors-data.json';

interface MatchRiskDisplayProps {
  matchId: string;
  riskFactors: Array<{ id: string }>;
  matchLabel: string;
  className?: string;
  showTitle?: boolean;
  riskScores?: Record<string, number>;
}

export function MatchRiskDisplay({ 
  riskFactors, 
  className = "",
  showTitle = true,
  riskScores
}: MatchRiskDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if there are any risks
  const hasRisks = riskFactors && riskFactors.length > 0;
  
  // Debug logging
  console.log('🔍 MatchRiskDisplay received risk factors:', riskFactors?.length || 0, riskFactors?.map(rf => rf.id));

  // Calculate level counts for badges
  const calculateLevelCounts = (riskFactorArray: Array<{ id: string }>) => {
    const counts: Record<string, number> = {};
    
    riskFactorArray.forEach(rf => {
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

  // Don't render anything if no risk factors
  if (!hasRisks) {
    return (
      <div className={`p-3 bg-muted/30 rounded-md border border-muted ${className}`}>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              No Risk Found
            </p>
            <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">
              This match has no identified risk factors
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!showTitle) {
    // When no title is shown, display the risk factors directly without collapsible wrapper
    return (
      <div className={className}>
        <RiskFactorsDisplay 
          riskFactors={riskFactors}
          showTitle={false}
          riskScores={riskScores}
        />
      </div>
    );
  }

  return (
    <div className={`border rounded-md bg-card ${className}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 rounded-md hover:bg-accent transition-colors">
            <div className="flex items-center justify-between w-full">
              <h5 className="text-sm font-medium flex items-center">
                <ShieldAlert className="h-4 w-4 mr-2 text-black dark:text-white" />
                Risk Assessment
                <Badge variant="outline" className="text-xs ml-2">
                  {riskFactors.length}
                </Badge>
              </h5>
              <div className="flex items-center space-x-2">
                <RiskLevelBadges 
                  counts={calculateLevelCounts(riskFactors)}
                  size="sm"
                />
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3">
            <RiskFactorsDisplay 
              riskFactors={riskFactors}
              showTitle={false}
              riskScores={riskScores}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}