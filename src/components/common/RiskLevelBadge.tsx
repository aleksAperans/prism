'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type RiskLevel = 'critical' | 'high' | 'elevated' | 'other';

interface RiskLevelBadgeProps {
  level: RiskLevel;
  count?: number;
  showCount?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

export function RiskLevelBadge({ 
  level, 
  count = 0, 
  showCount = true, 
  size = 'default',
  className 
}: RiskLevelBadgeProps) {
  const config = {
    critical: {
      variant: 'outline' as const,
      className: 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
      label: 'critical'
    },
    high: {
      variant: 'outline' as const,
      className: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
      label: 'high'
    },
    elevated: {
      variant: 'outline' as const,
      className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20',
      label: 'elevated'
    },
    other: {
      variant: 'secondary' as const,
      className: '',
      label: 'other'
    }
  };

  const riskConfig = config[level];
  const sizeClass = size === 'sm' ? 'text-xs' : '';

  return (
    <Badge 
      variant={riskConfig.variant}
      className={cn(
        sizeClass,
        riskConfig.className,
        className
      )}
    >
      {showCount && count > 0 ? `${count} ${riskConfig.label}` : riskConfig.label}
    </Badge>
  );
}

// Helper function to get all risk level badge components for a set of counts
export function RiskLevelBadges({ 
  counts, 
  size = 'default',
  className 
}: { 
  counts: Record<RiskLevel, number>;
  size?: 'sm' | 'default';
  className?: string;
}) {
  const levels: RiskLevel[] = ['critical', 'high', 'elevated', 'other'];
  
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {levels.map(level => {
        const count = counts[level] || 0;
        if (count === 0) return null;
        
        return (
          <RiskLevelBadge
            key={level}
            level={level}
            count={count}
            size={size}
          />
        );
      })}
    </div>
  );
}