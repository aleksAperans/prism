'use client';

import { AlertTriangle, AlertCircle, Shield, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { RiskFactor } from '@/types/api.types';

interface RiskFactorBadgeProps {
  risk: RiskFactor;
  showTooltip?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}

export function RiskFactorBadge({ 
  risk, 
  showTooltip = true, 
  variant = 'default',
  className 
}: RiskFactorBadgeProps) {
  const levelConfig = {
    Critical: {
      className: 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20',
      icon: AlertTriangle,
      iconColor: 'text-red-600',
    },
    High: {
      className: 'bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20 dark:hover:bg-orange-500/20',
      icon: AlertCircle,
      iconColor: 'text-orange-600',
    },
    Elevated: {
      className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20 dark:hover:bg-yellow-500/20',
      icon: AlertCircle,
      iconColor: 'text-yellow-600',
    },
    Standard: {
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 dark:hover:bg-blue-500/20',
      icon: Info,
      iconColor: 'text-blue-600',
    },
  };

  const config = levelConfig[risk.level];
  const Icon = config.icon;
  
  const badgeContent = (
    <Badge 
      variant="outline" 
      className={cn(
        'cursor-help transition-colors',
        config.className,
        variant === 'compact' && 'px-2 py-0.5 text-xs',
        className
      )}
    >
      <Icon className={cn(
        'mr-1 h-3 w-3',
        variant === 'compact' && 'h-2.5 w-2.5 mr-0.5',
        config.iconColor
      )} />
      {variant === 'compact' ? risk.level : risk.name}
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm" side="top">
          <div className="space-y-2">
            <div>
              <p className="font-medium">{risk.name}</p>
              <p className="text-xs text-muted-foreground">
                {risk.category} • {risk.level} Risk
              </p>
            </div>
            {risk.description && (
              <p className="text-sm leading-relaxed">
                {risk.description.length > 200 
                  ? `${risk.description.substring(0, 200)}...`
                  : risk.description
                }
              </p>
            )}
            {risk.url && (
              <p className="text-xs text-muted-foreground">
                Click to view source
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface RiskFactorListProps {
  risks: RiskFactor[];
  maxVisible?: number;
  variant?: 'default' | 'compact';
  className?: string;
}

export function RiskFactorList({ 
  risks, 
  maxVisible = 5, 
  variant = 'default',
  className 
}: RiskFactorListProps) {
  const visibleRisks = risks.slice(0, maxVisible);
  const hiddenCount = risks.length - maxVisible;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {visibleRisks.map((risk) => (
        <RiskFactorBadge 
          key={risk.id} 
          risk={risk} 
          variant={variant}
        />
      ))}
      {hiddenCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="cursor-help">
                +{hiddenCount} more
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-medium">Additional Risk Factors:</p>
                {risks.slice(maxVisible).map((risk) => (
                  <p key={risk.id} className="text-sm">
                    • {risk.name}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

interface RiskLevelIndicatorProps {
  level: 'Critical' | 'High' | 'Elevated' | 'Standard';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RiskLevelIndicator({ 
  level, 
  showLabel = true, 
  size = 'md',
  className 
}: RiskLevelIndicatorProps) {
  const config = {
    Critical: { color: 'bg-red-500', label: 'critical risk' },
    High: { color: 'bg-orange-500', label: 'high risk' },
    Elevated: { color: 'bg-yellow-500', label: 'elevated risk' },
    Standard: { color: 'bg-blue-500', label: 'standard risk' },
  };

  const sizeConfig = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const levelConfig = config[level];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'rounded-full',
        levelConfig.color,
        sizeConfig[size]
      )} />
      {showLabel && (
        <span className="text-sm font-medium">{levelConfig.label}</span>
      )}
    </div>
  );
}

interface RiskSummaryProps {
  risks: RiskFactor[];
  className?: string;
}

export function RiskSummary({ risks, className }: RiskSummaryProps) {
  const riskCounts = risks.reduce((acc, risk) => {
    acc[risk.level] = (acc[risk.level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const levelOrder: Array<'Critical' | 'High' | 'Elevated' | 'Standard'> = [
    'Critical', 'High', 'Elevated', 'Standard'
  ];

  const hasRisks = risks.length > 0;

  if (!hasRisks) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Shield className="h-4 w-4 text-green-600" />
        <span className="text-sm">No risk factors identified</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-4', className)}>
      {levelOrder.map((level) => {
        const count = riskCounts[level];
        if (!count) return null;

        return (
          <div key={level} className="flex items-center gap-1">
            <RiskLevelIndicator 
              level={level} 
              showLabel={false} 
              size="sm" 
            />
            <span className="text-sm">
              {count} {level.toLowerCase()}
            </span>
          </div>
        );
      })}
      <span className="text-xs text-muted-foreground">
        {risks.length} total
      </span>
    </div>
  );
}