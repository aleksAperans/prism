'use client';

import { Badge } from '@/components/ui/badge';
import { Building, User } from 'lucide-react';

interface EntityTypeBadgeProps {
  type: string;
  className?: string;
}

export function EntityTypeBadge({ type, className = '' }: EntityTypeBadgeProps) {
  return (
    <Badge variant="outline" className={`text-xs whitespace-nowrap ${className}`}>
      <div className="flex items-center gap-1">
        {type === 'company' ? (
          <>
            <Building className="h-3 w-3 flex-shrink-0" />
            <span>company</span>
          </>
        ) : type === 'person' ? (
          <>
            <User className="h-3 w-3 flex-shrink-0" />
            <span>person</span>
          </>
        ) : (
          <span>{type || 'unknown'}</span>
        )}
      </div>
    </Badge>
  );
}