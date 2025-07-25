import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, TrendingUp } from 'lucide-react';
import { EntityRiskScore } from '@/lib/risk-scoring';
import { cn } from '@/lib/utils';

interface RiskScoreBadgeProps {
  riskScore: EntityRiskScore;
  size?: 'sm' | 'default' | 'lg';
  showDetails?: boolean;
}

export function RiskScoreBadge({ 
  riskScore, 
  size = 'default',
  showDetails = false 
}: RiskScoreBadgeProps) {
  const { totalScore, meetsThreshold, threshold, triggeredRiskFactors } = riskScore;
  
  // If risk scoring is not enabled (threshold is 0), don't show anything
  if (threshold === 0) {
    return null;
  }

  const getRiskVariant = () => {
    if (!meetsThreshold) return 'secondary';
    if (totalScore >= threshold * 2) return 'destructive';
    return 'default';
  };

  const getRiskIcon = () => {
    if (!meetsThreshold) return Shield;
    if (totalScore >= threshold * 2) return AlertTriangle;
    return TrendingUp;
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
            size === 'lg' && "text-base px-3 py-1"
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
        
        {meetsThreshold && (
          <Badge variant="destructive" className="text-xs animate-pulse">
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