'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getCountryByCode } from '@/lib/countries';
import { cn } from '@/lib/utils';

interface CountryBadgeProps {
  countryCode: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  showName?: boolean;
}

export function CountryBadge({ 
  countryCode, 
  variant = 'secondary', 
  size = 'default',
  className,
  showName = true 
}: CountryBadgeProps) {
  const country = getCountryByCode(countryCode);
  
  if (!country) {
    return (
      <Badge variant={variant} className={cn('text-xs', className)}>
        <span className="mr-1">🏳️</span>
        {countryCode}
      </Badge>
    );
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 h-5',
    default: 'text-xs px-2 py-1 h-6',
    lg: 'text-sm px-2.5 py-1.5 h-7'
  };

  return (
    <Badge 
      variant={variant} 
      className={cn(sizeClasses[size], className)}
      title={showName ? country.name : undefined}
    >
      <span className="mr-1">{country.flag}</span>
      {country.code}
    </Badge>
  );
}

interface CountryBadgeListProps {
  countryCodes: string[];
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  showName?: boolean;
  maxVisible?: number;
}

export function CountryBadgeList({ 
  countryCodes, 
  variant = 'secondary',
  size = 'default',
  className,
  showName = true,
  maxVisible = 5
}: CountryBadgeListProps) {
  if (!countryCodes || countryCodes.length === 0) {
    return null;
  }

  const visibleCodes = countryCodes.slice(0, maxVisible);
  const remainingCodes = countryCodes.slice(maxVisible);
  const remainingCount = remainingCodes.length;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 h-5',
    default: 'text-xs px-2 py-1 h-6',
    lg: 'text-sm px-2.5 py-1.5 h-7'
  };

  return (
    <TooltipProvider>
      <div className={cn('flex flex-wrap gap-1', className)}>
        {visibleCodes.map((code) => (
          <CountryBadge
            key={code}
            countryCode={code}
            variant={variant}
            size={size}
            showName={showName}
          />
        ))}
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant={variant} 
                className={cn(sizeClasses[size], 'cursor-help')}
              >
                +{remainingCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1">
                <div className="text-xs font-medium">Additional Countries:</div>
                <div className="flex flex-wrap gap-1">
                  {remainingCodes.map((code) => {
                    const country = getCountryByCode(code);
                    return (
                      <div key={code} className="flex items-center gap-1 text-xs">
                        <span>{country?.flag || '🏳️'}</span>
                        <span>{country?.code || code}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}