'use client';

import { Sprout, Share2, Tag, Blend } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type RiskType = 'psa' | 'seed' | 'network' | 'unknown';

interface TypeBadgeProps {
  type: string;
  size?: 'sm' | 'default';
  className?: string;
}

export function TypeBadge({ 
  type, 
  size = 'default',
  className 
}: TypeBadgeProps) {
  const normalizedType = type?.toLowerCase() as RiskType;
  
  const getTypeIcon = (type: RiskType) => {
    const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
    
    switch (type) {
      case 'psa': return <Blend className={iconSize} />; // "Possible Same As" - blending/overlapping
      case 'seed': return <Sprout className={iconSize} />; // Seed - seedling/plant icon
      case 'network': return <Share2 className={iconSize} />; // Network connections - sharing/network icon
      default: return <Tag className={iconSize} />;
    }
  };

  const getTypeColor = (type: RiskType) => {
    switch (type) {
      case 'psa': return 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      case 'seed': return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
      case 'network': return 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const typeConfig = {
    icon: getTypeIcon(normalizedType),
    color: getTypeColor(normalizedType),
    label: type.toLowerCase()
  };

  const sizeClass = size === 'sm' ? 'text-xs' : '';

  return (
    <Badge 
      variant="outline"
      className={cn(
        sizeClass,
        typeConfig.color,
        className
      )}
    >
      {typeConfig.icon}
      <span className="ml-1">{typeConfig.label}</span>
    </Badge>
  );
}