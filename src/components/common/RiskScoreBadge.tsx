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

  const getRiskVariant = (): "outline" => {
    // Always use outline variant for consistent styling with other badges
    return 'outline';
  };

  const getRiskStyles = () => {
    if (totalScore === 0) {
      // No risk - green outline styling to match other badges
      return "bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20";
    } else if (!meetsThreshold) {
      // Has risk but below threshold - light red
      return "bg-red-400/10 text-red-500 border-red-400/20 dark:bg-red-400/10 dark:text-red-300 dark:border-red-400/20";
    } else if (totalScore === threshold) {
      // Meets threshold exactly - current red
      return "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
    } else {
      // Exceeds threshold - darker red
      return "bg-red-600/15 text-red-700 border-red-600/30 dark:bg-red-600/15 dark:text-red-300 dark:border-red-600/30";
    }
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
            getRiskStyles()
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
            className={cn(
              "text-xs animate-pulse",
              totalScore === threshold 
                ? "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                : "bg-red-600/15 text-red-700 border-red-600/30 dark:bg-red-600/15 dark:text-red-300 dark:border-red-600/30"
            )}
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