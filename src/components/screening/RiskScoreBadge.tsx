import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, TrendingUp } from 'lucide-react';
import { EntityRiskScore } from '@/lib/risk-scoring';
import { cn } from '@/lib/utils';

interface RiskScoreBadgeProps {
  riskScore: EntityRiskScore;
  size?: 'sm' | 'default' | 'lg';
  showDetails?: boolean;
  showThresholdExceeded?: boolean;
}

export function RiskScoreBadge({ 
  riskScore, 
  size = 'default',
  showDetails = false,
  showThresholdExceeded = true
}: RiskScoreBadgeProps) {
  const { totalScore, meetsThreshold, threshold, triggeredRiskFactors } = riskScore;
  
  // If risk scoring is not enabled (threshold is 0), don't show anything
  if (threshold === 0) {
    return null;
  }

  const getRiskVariant = () => {
    if (!meetsThreshold) return 'secondary';
    // If threshold is exceeded, use outline variant to match critical risk badge styling
    return 'outline';
  };

  const getRiskIcon = () => {
    // Always use Shield icon for consistency across the application
    return Shield;
  };

  const Icon = getRiskIcon();
  const variant = getRiskVariant();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge 
          variant={variant}
          className={cn(
            "font-mono",
            size === 'sm' && "text-xs",
            size === 'lg' && "text-base px-3 py-1",
            // Apply critical risk badge styling when threshold is exceeded
            meetsThreshold && "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
          )}
        >
          <Icon className={cn(
            "mr-1",
            size === 'sm' && "h-3 w-3",
            size === 'default' && "h-4 w-4", 
            size === 'lg' && "h-5 w-5"
          )} />
          {totalScore}/{threshold}
        </Badge>
        
        {showThresholdExceeded && meetsThreshold && (
          <Badge 
            variant="outline" 
            className="text-xs animate-pulse bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
          >
            threshold exceeded
          </Badge>
        )}
      </div>

      {showDetails && meetsThreshold && triggeredRiskFactors.length > 0 && (
        <Alert variant={totalScore >= threshold * 2 ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">
                Risk threshold exceeded ({totalScore} ≥ {threshold})
              </p>
              <p className="text-sm">
                Triggered factors: {triggeredRiskFactors.map(f => `${f.id} (${f.score})`).join(', ')}
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}