'use client';

import { ShieldAlert, XCircle, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MatchStrengthBadgeProps {
  strength: 'strong' | 'partial' | 'no_match' | 'manual';
  variant?: 'default' | 'compact';
  showIcon?: boolean;
  className?: string;
}

export function MatchStrengthBadge({ 
  strength, 
  variant = 'default',
  showIcon = true,
  className 
}: MatchStrengthBadgeProps) {
  const config = {
    strong: {
      variant: 'default' as const,
      className: 'bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
      icon: ShieldAlert,
      label: 'strong match',
      description: 'High confidence match found'
    },
    partial: {
      variant: 'secondary' as const,
      className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20',
      icon: ShieldAlert,
      label: 'partial match',
      description: 'Medium confidence match found'
    },
    no_match: {
      variant: 'outline' as const,
      className: 'bg-muted text-muted-foreground border-muted',
      icon: XCircle,
      label: 'no match',
      description: 'No matching entity found'
    },
    manual: {
      variant: 'outline' as const,
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
      icon: Users,
      label: 'manual review',
      description: 'Requires manual review'
    }
  };

  const matchConfig = config[strength];
  const Icon = matchConfig.icon;
  
  return (
    <Badge 
      variant={matchConfig.variant}
      className={cn(
        'inline-flex items-center',
        matchConfig.className,
        variant === 'compact' && 'px-2 py-0.5 text-xs',
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(
          'mr-1 h-3 w-3',
          variant === 'compact' && 'h-2.5 w-2.5 mr-0.5'
        )} />
      )}
      {variant === 'compact' 
        ? matchConfig.label.split(' ')[0] // Show just "Strong", "Partial", etc.
        : matchConfig.label
      }
    </Badge>
  );
}

interface MatchConfidenceIndicatorProps {
  strength: 'strong' | 'partial' | 'no_match' | 'manual';
  showPercentage?: boolean;
  className?: string;
}

export function MatchConfidenceIndicator({ 
  strength, 
  showPercentage = false,
  className 
}: MatchConfidenceIndicatorProps) {
  const confidenceMap = {
    strong: { percentage: 85, color: 'bg-green-500' },
    partial: { percentage: 60, color: 'bg-yellow-500' },
    manual: { percentage: 75, color: 'bg-blue-500' },
    no_match: { percentage: 0, color: 'bg-muted' }
  };

  const { percentage, color } = confidenceMap[strength];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 bg-muted rounded-full h-2 min-w-[60px]">
        <div 
          className={cn('h-2 rounded-full transition-all duration-300', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && percentage > 0 && (
        <span className="text-xs text-muted-foreground min-w-[30px]">
          {percentage}%
        </span>
      )}
    </div>
  );
}