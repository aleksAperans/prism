'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Users, 
  TrendingUp,
  Pause,
  Play,
  Square,
  RefreshCw,
  Minimize2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

import type { BatchJobStatus, BatchEntityResult } from '@/services/batch/types';
import type { RiskProfile } from '@/lib/risk-profiles/yaml-loader';
import { calculateEntityRiskScore, clientLoadDefaultRiskProfile } from '@/lib/risk-scoring-client';

interface BatchUploadProgressProps {
  jobId: string;
  jobStatus: BatchJobStatus;
  results: BatchEntityResult[];
  riskProfileId?: string;
  onStatusUpdate: (status: BatchJobStatus) => void;
  onResultsUpdate: (results: BatchEntityResult[]) => void;
  onReset: () => void;
  onMinimize?: () => void;
}

export function BatchUploadProgress({
  jobId,
  jobStatus,
  results,
  riskProfileId,
  onStatusUpdate,
  onResultsUpdate,
  onReset,
  onMinimize,
}: BatchUploadProgressProps) {
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        // Continue without risk profile
      }
    };
    
    loadRiskProfile();
  }, [riskProfileId]);

  // Poll for updates every 2 seconds while processing
  useEffect(() => {
    if (!isPolling || jobStatus.status === 'completed' || jobStatus.status === 'failed' || jobStatus.status === 'cancelled') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${jobStatus.id.split('_')[1]}/entities/batch?jobId=${jobId}`);
        const result = await response.json();

        if (result.success && result.data) {
          onStatusUpdate(result.data.status);
          if (result.data.results) {
            onResultsUpdate(result.data.results);
          }

          // Stop polling when job is complete
          if (result.data.status.status !== 'processing') {
            setIsPolling(false);
          }
        }
      } catch (err) {
        console.error('Failed to poll job status:', err);
        setError('Failed to get progress updates');
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isPolling, jobId, jobStatus.id, onStatusUpdate, onResultsUpdate, jobStatus.status]);

  const handleCancelJob = async () => {
    try {
      const response = await fetch(`/api/projects/${jobStatus.id.split('_')[1]}/entities/batch?jobId=${jobId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setIsPolling(false);
        // The polling will update the status to cancelled
      }
    } catch (err) {
      console.error('Failed to cancel job:', err);
      setError('Failed to cancel job');
    }
  };

  const progressPercentage = jobStatus.totalEntities > 0 
    ? Math.round((jobStatus.processedEntities / jobStatus.totalEntities) * 100)
    : 0;

  const getStatusIcon = () => {
    switch (jobStatus.status) {
      case 'processing':
        return <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'cancelled':
        return <Square className="h-5 w-5 text-orange-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (jobStatus.status) {
      case 'processing':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDuration = (start?: Date | string, end?: Date | string) => {
    if (!start) return 'Not started';
    
    try {
      // Ensure dates are Date objects, not strings
      const startTime = start instanceof Date ? start : new Date(start);
      const endTime = end ? (end instanceof Date ? end : new Date(end)) : new Date();
      
      // Check if dates are valid
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return 'Invalid time';
      }
      
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Handle negative durations
      if (duration < 0) {
        return '0s';
      }
      
      if (duration < 60) {
        return `${duration}s`;
      } else if (duration < 3600) {
        return `${Math.floor(duration / 60)}m ${duration % 60}s`;
      } else {
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        return `${hours}h ${minutes}m`;
      }
    } catch (error) {
      console.error('Error formatting duration:', error);
      return 'Invalid time';
    }
  };

  const calculateMatchStats = (results: BatchEntityResult[]) => {
    const successfulResults = results.filter(r => r.status === 'success' && r.projectEntity);
    
    let highConfidenceMatches = 0;
    let mediumConfidenceMatches = 0;
    let noMatches = 0;
    
    successfulResults.forEach(result => {
      const strength = result.projectEntity?.strength;
      
      if (strength === 'strong') {
        highConfidenceMatches++;
      } else if (strength === 'partial') {
        mediumConfidenceMatches++;
      } else {
        noMatches++;
      }
    });
    
    const total = successfulResults.length;
    return {
      highConfidenceMatches,
      mediumConfidenceMatches, 
      noMatches,
      highConfidencePercent: total > 0 ? Math.round((highConfidenceMatches / total) * 100) : 0,
      mediumConfidencePercent: total > 0 ? Math.round((mediumConfidenceMatches / total) * 100) : 0,
      noMatchPercent: total > 0 ? Math.round((noMatches / total) * 100) : 0,
      total
    };
  };

  const calculateRiskStats = (results: BatchEntityResult[]) => {
    const successfulResults = results.filter(r => r.status === 'success' && r.projectEntity);
    
    let noRiskEntities = 0;
    let withRiskEntities = 0;
    let thresholdBreachEntities = 0;
    
    successfulResults.forEach(result => {
      const entity = result.projectEntity;
      if (!entity) return;
      
      // Collect all risk factor IDs from entity and matches
      const entityRiskFactorIds = entity.risk_factors?.map(rf => rf.id) || [];
      const matchRiskFactorIds = entity.matches?.reduce((ids: string[], match) => {
        const matchIds = match.risk_factors?.map(rf => rf.id) || [];
        return [...ids, ...matchIds];
      }, []) || [];
      
      // Combine and deduplicate risk factor IDs
      const allRiskFactorIds = [...new Set([...entityRiskFactorIds, ...matchRiskFactorIds])];
      
      if (allRiskFactorIds.length === 0) {
        noRiskEntities++;
      } else {
        withRiskEntities++;
        
        // Use proper risk scoring if profile is available
        if (riskProfile && riskProfile.riskScoringEnabled) {
          const riskScore = calculateEntityRiskScore(allRiskFactorIds, riskProfile);
          if (riskScore.meetsThreshold) {
            thresholdBreachEntities++;
          }
        } else {
          // Fallback: use simple heuristic if no risk profile available
          // This should rarely happen but provides backward compatibility
          if (allRiskFactorIds.length > 5) {
            thresholdBreachEntities++;
          }
        }
      }
    });
    
    const total = successfulResults.length;
    return {
      noRiskEntities,
      withRiskEntities,
      thresholdBreachEntities,
      noRiskPercent: total > 0 ? Math.round((noRiskEntities / total) * 100) : 0,
      withRiskPercent: total > 0 ? Math.round((withRiskEntities / total) * 100) : 0,
      thresholdBreachPercent: total > 0 ? Math.round((thresholdBreachEntities / total) * 100) : 0,
      total
    };
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Simple Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {getStatusIcon()}
              <div className="min-w-0">
                <CardTitle className="text-base">
                  Processing {jobStatus.totalEntities} Entities
                </CardTitle>
                <CardDescription>
                  {jobStatus.status === 'processing' 
                    ? `${jobStatus.processedEntities} of ${jobStatus.totalEntities} complete`
                    : `Completed in ${formatDuration(jobStatus.startedAt, jobStatus.completedAt)}`
                  }
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Simple Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-2xl font-bold">{progressPercentage}%</span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-3"
            />
          </div>
          
          {/* Processing message for active jobs */}
          {jobStatus.status === 'processing' && (
            <div className="text-center text-sm text-muted-foreground">
              Processing entities...
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {onMinimize && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMinimize}
                  className="gap-2"
                >
                  <Minimize2 className="h-4 w-4" />
                  Minimize to Side
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {jobStatus.status === 'processing' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelJob}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              
              {(jobStatus.status === 'completed' || jobStatus.status === 'failed' || jobStatus.status === 'cancelled') && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onReset}
                >
                  Start New Batch
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Summary - only show when completed */}
      {jobStatus.status === 'completed' && (
        <div className="space-y-4 min-w-0">
          {/* Processing Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Processing Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">
                    {jobStatus.totalEntities}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    {jobStatus.successfulEntities}
                  </div>
                  <div className="text-xs text-muted-foreground">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">
                    {jobStatus.failedEntities}
                  </div>
                  <div className="text-xs text-muted-foreground">Failures</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-yellow-600">
                    {jobStatus.duplicateEntities}
                  </div>
                  <div className="text-xs text-muted-foreground">Duplicates</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600">
                    {formatDuration(jobStatus.startedAt, jobStatus.completedAt)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Time</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3 min-w-0">
            {/* Match Summary */}
            <Card className="min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Match Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const matchStats = calculateMatchStats(results);
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-green-50 dark:bg-green-500/10 rounded">
                        <div className="text-base font-bold text-green-600">
                          {matchStats.highConfidenceMatches}
                        </div>
                        <div className="text-xs text-green-600/80">High ({matchStats.highConfidencePercent}%)</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded">
                        <div className="text-base font-bold text-yellow-600">
                          {matchStats.mediumConfidenceMatches}
                        </div>
                        <div className="text-xs text-yellow-600/80">Medium ({matchStats.mediumConfidencePercent}%)</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-500/10 rounded">
                        <div className="text-base font-bold text-gray-600">
                          {matchStats.noMatches}
                        </div>
                        <div className="text-xs text-gray-600/80">None ({matchStats.noMatchPercent}%)</div>
                      </div>
                    </div>
                  );
                })()
                }
              </CardContent>
            </Card>

            {/* Risk Summary */}
            <Card className="min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  Risk Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const riskStats = calculateRiskStats(results);
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-green-50 dark:bg-green-500/10 rounded">
                        <div className="text-base font-bold text-green-600">
                          {riskStats.noRiskEntities}
                        </div>
                        <div className="text-xs text-green-600/80">No Risk ({riskStats.noRiskPercent}%)</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 dark:bg-orange-500/10 rounded">
                        <div className="text-base font-bold text-orange-600">
                          {riskStats.withRiskEntities}
                        </div>
                        <div className="text-xs text-orange-600/80">With Risk ({riskStats.withRiskPercent}%)</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-500/10 rounded">
                        <div className="text-base font-bold text-red-600">
                          {riskStats.thresholdBreachEntities}
                        </div>
                        <div className="text-xs text-red-600/80">Breach ({riskStats.thresholdBreachPercent}%)</div>
                      </div>
                    </div>
                  );
                })()
                }
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {(error || jobStatus.error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || jobStatus.error}
          </AlertDescription>
        </Alert>
      )}

    </div>
  );
}