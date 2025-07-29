'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Download, 
  FileText, 
  Table, 
  ExternalLink
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { BatchEntityResult } from '@/services/batch/types';
import type { RiskProfile } from '@/lib/risk-profiles/yaml-loader';
import { calculateEntityRiskScore, clientLoadDefaultRiskProfile } from '@/lib/risk-scoring-client';

interface BatchResultsExportProps {
  results: BatchEntityResult[];
  riskProfileId?: string;
  onNavigateToProject?: () => void;
}

interface FlattenedResult {
  // Original entity info
  original_index: number;
  input_name: string;
  input_address?: string;
  input_country?: string;
  input_type?: string;
  input_identifier?: string;
  
  // Processing status
  processing_status: 'success' | 'failed' | 'duplicate';
  processing_error?: string;
  existing_entity_id?: string;
  
  // Project entity info (if successful)
  project_entity_id?: string;
  project_id?: string;
  entity_label?: string;
  entity_strength?: string;
  entity_countries?: string;
  entity_created_at?: string;
  
  // Match info (one row per match)
  match_id?: string;
  match_entity_id?: string;
  match_label?: string;
  match_type?: string;
  match_countries?: string;
  match_risk_factors?: string;
  match_risk_score?: number;
  match_risk_threshold_exceeded?: boolean;
  
  // Summary stats
  total_matches: number;
  has_risk_factors: boolean;
  risk_factor_count: number;
}

export function BatchResultsExport({ results, riskProfileId, onNavigateToProject }: BatchResultsExportProps) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);

  // Load risk profile on component mount
  useEffect(() => {
    const loadRiskProfile = async () => {
      try {
        if (riskProfileId) {
          const response = await fetch(`/api/risk-profiles/${riskProfileId}`);
          if (response.ok) {
            const data = await response.json();
            setRiskProfile(data.profile);
            return;
          }
        }
        // Fallback to default profile
        const defaultProfile = await clientLoadDefaultRiskProfile();
        setRiskProfile(defaultProfile);
      } catch (error) {
        console.warn('Failed to load risk profile:', error);
      }
    };
    
    loadRiskProfile();
  }, [riskProfileId]);

  const generateFlattenedData = (): FlattenedResult[] => {
    const flattenedResults: FlattenedResult[] = [];

    results.forEach((result) => {
      const baseRow: Partial<FlattenedResult> = {
        original_index: result.index,
        input_name: result.input.name,
        input_address: result.input.address,
        input_country: result.input.country,
        input_type: result.input.type,
        input_identifier: result.input.identifier,
        processing_status: result.status,
        processing_error: result.error,
        existing_entity_id: result.existingEntityId,
      };

      if (result.status === 'success' && result.projectEntity) {
        const entity = result.projectEntity;
        
        // Add project entity info
        Object.assign(baseRow, {
          project_entity_id: entity.project_entity_id,
          project_id: entity.project_id,
          entity_label: entity.label,
          entity_strength: entity.strength,
          entity_countries: entity.countries?.join(', ') || '',
          entity_created_at: entity.created_at,
          total_matches: entity.matches?.length || 0,
          has_risk_factors: (entity.risk_factors?.length || 0) > 0,
          risk_factor_count: entity.risk_factors?.length || 0,
        });

        // Create one row per match (or one row if no matches)
        const matches = entity.matches || [];
        
        if (matches.length === 0) {
          flattenedResults.push(baseRow as FlattenedResult);
        } else {
          matches.forEach((match) => {
            // Calculate proper risk score for this match
            let matchRiskScore = 0;
            let matchThresholdExceeded = false;
            
            if (riskProfile && riskProfile.riskScoringEnabled && match.risk_factors) {
              const riskFactorIds = match.risk_factors.map(rf => rf.id);
              const riskScoreResult = calculateEntityRiskScore(riskFactorIds, riskProfile);
              matchRiskScore = riskScoreResult.totalScore;
              matchThresholdExceeded = riskScoreResult.meetsThreshold;
            }
            
            const matchRow: FlattenedResult = {
              ...baseRow,
              match_id: match.match_id,
              match_entity_id: match.sayari_entity_id,
              match_label: match.label,
              match_type: match.type,
              match_countries: match.countries?.join(', ') || '',
              match_risk_factors: match.risk_factors?.map(rf => rf.id).join(', ') || '',
              match_risk_score: matchRiskScore,
              match_risk_threshold_exceeded: matchThresholdExceeded,
            } as FlattenedResult;

            flattenedResults.push(matchRow);
          });
        }
      } else {
        // Failed or duplicate - single row
        Object.assign(baseRow, {
          total_matches: 0,
          has_risk_factors: false,
          risk_factor_count: 0,
        });
        
        flattenedResults.push(baseRow as FlattenedResult);
      }
    });

    return flattenedResults;
  };

  const generateCSV = (includeMatches: boolean = true): string => {
    const flattenedData = generateFlattenedData();
    
    const headers = [
      'Original Index',
      'Input Name',
      'Input Address',
      'Input Country', 
      'Input Type',
      'Input Identifier',
      'Processing Status',
      'Processing Error',
      'Existing Entity ID',
      'Project Entity ID',
      'Project ID',
      'Entity Label',
      'Entity Strength',
      'Entity Countries',
      'Entity Created At',
      'Total Matches',
      'Has Risk Factors',
      'Risk Factor Count',
    ];

    if (includeMatches) {
      headers.push(
        'Match ID',
        'Match Entity ID',
        'Match Label',
        'Match Type',
        'Match Countries',
        'Match Risk Factors',
        'Match Risk Score',
        'Match Risk Threshold Exceeded'
      );
    }

    const csvRows = [
      headers.join(','),
      ...flattenedData.map(row => {
        const values = [
          row.original_index,
          `"${(row.input_name || '').replace(/"/g, '""')}"`,
          `"${(row.input_address || '').replace(/"/g, '""')}"`,
          row.input_country || '',
          row.input_type || '',
          `"${(row.input_identifier || '').replace(/"/g, '""')}"`,
          row.processing_status,
          `"${(row.processing_error || '').replace(/"/g, '""')}"`,
          row.existing_entity_id || '',
          row.project_entity_id || '',
          row.project_id || '',
          `"${(row.entity_label || '').replace(/"/g, '""')}"`,
          row.entity_strength || '',
          `"${(row.entity_countries || '').replace(/"/g, '""')}"`,
          row.entity_created_at || '',
          row.total_matches || 0,
          row.has_risk_factors ? 'Yes' : 'No',
          row.risk_factor_count || 0,
        ];

        if (includeMatches) {
          values.push(
            row.match_id || '',
            row.match_entity_id || '',
            `"${(row.match_label || '').replace(/"/g, '""')}"`,
            row.match_type || '',
            `"${(row.match_countries || '').replace(/"/g, '""')}"`,
            `"${(row.match_risk_factors || '').replace(/"/g, '""')}"`,
            (row.match_risk_score || 0).toString(),
            row.match_risk_threshold_exceeded ? 'Yes' : 'No'
          );
        }

        return values.join(',');
      })
    ];

    return csvRows.join('\n');
  };

  const generateSummaryCSV = (): string => {
    const headers = [
      'Input Name',
      'Input Type',
      'Processing Status',
      'Entity ID',
      'Match Count',
      'Risk Factor Count',
      'Has Risk Factors',
      'Error Message'
    ];

    const csvRows = [
      headers.join(','),
      ...results.map(result => [
        `"${result.input.name.replace(/"/g, '""')}"`,
        result.input.type || 'company',
        result.status,
        result.projectEntity?.project_entity_id || result.existingEntityId || '',
        result.projectEntity?.matches?.length || 0,
        result.projectEntity?.risk_factors?.length || 0,
        (result.projectEntity?.risk_factors?.length || 0) > 0 ? 'Yes' : 'No',
        `"${(result.error || '').replace(/"/g, '""')}"`
      ].join(','))
    ];

    return csvRows.join('\n');
  };

  const downloadFile = (content: string, filename: string) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: 'summary' | 'with-matches') => {
    setIsExporting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      switch (format) {
        case 'summary':
          downloadFile(generateSummaryCSV(), 'batch-results-summary');
          break;
        case 'with-matches':
          downloadFile(generateCSV(true), 'batch-results-with-matches');
          break;
      }
    } finally {
      setIsExporting(false);
    }
  };


  const successfulResults = results.filter(r => r.status === 'success');
  const failedResults = results.filter(r => r.status === 'failed');
  const duplicateResults = results.filter(r => r.status === 'duplicate');

  // Get project ID from first successful result
  const projectId = successfulResults[0]?.projectEntity?.project_id;

  const navigateToProject = () => {
    if (onNavigateToProject) {
      // Use the callback if provided (for modal scenarios)
      onNavigateToProject();
    } else if (projectId) {
      // Fallback to direct navigation
      const url = riskProfileId 
        ? `/projects/${projectId}/entities?riskProfile=${riskProfileId}`
        : `/projects/${projectId}/entities`;
      router.push(url);
    }
  };

  return (
    <div className="space-y-3">
      {/* Export Controls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Download className="h-4 w-4" />
            Export Results
          </CardTitle>
          <CardDescription className="text-xs">
            Download batch processing results in various formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={() => handleExport('summary')}
              disabled={isExporting}
              variant="outline"
              className="flex items-center justify-center gap-2 h-10"
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Summary Results</span>
            </Button>

            <Button
              onClick={() => handleExport('with-matches')}
              disabled={isExporting}
              variant="outline"
              className="flex items-center justify-center gap-2 h-10"
            >
              <Table className="h-4 w-4" />
              <span className="text-sm font-medium">With Matches</span>
            </Button>
          </div>

          <Separator className="my-3" />

          {/* Navigation to Project */}
          {projectId && (
            <div className="flex justify-center">
              <Button
                onClick={navigateToProject}
                variant="default"
                size="sm"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-3 w-3" />
                View All Project Entities
              </Button>
            </div>
          )}

          <Separator className="my-3" />

          <div className="text-xs text-muted-foreground text-center">
            {results.length} total results • {successfulResults.length} successful • {duplicateResults.length} duplicates • {failedResults.length} failed
          </div>
        </CardContent>
      </Card>
    </div>
  );
}