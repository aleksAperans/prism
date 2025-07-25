'use client';

import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, MapPin, Home, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface MatchedAttributesDisplayProps {
  matchedAttributes: {
    name?: string[];
    address?: string[];
    country?: string[];
  };
}

export function MatchedAttributesDisplay({ matchedAttributes }: MatchedAttributesDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderHighlightedText = (text: string) => {
    // Replace <em> tags with highlighted spans
    const highlightedHtml = text.replace(
      /<em>(.*?)<\/em>/g,
      '<span class="bg-yellow-500/20 text-yellow-600 dark:bg-yellow-500/30 dark:text-yellow-400 px-1 py-0.5 rounded font-semibold">$1</span>'
    );

    return (
      <span 
        className="text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    );
  };

  const hasNames = matchedAttributes.name && matchedAttributes.name.length > 0;
  const hasAddresses = matchedAttributes.address && matchedAttributes.address.length > 0;
  const hasCountries = matchedAttributes.country && matchedAttributes.country.length > 0;

  if (!hasNames && !hasAddresses && !hasCountries) {
    return null;
  }

  return (
    <div className="border rounded-md bg-card">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 rounded-md hover:bg-accent transition-colors">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-foreground text-sm">Matched Attributes</span>
              <Badge variant="outline" className="text-xs">
                {[hasNames, hasAddresses, hasCountries].filter(Boolean).length}
              </Badge>
            </div>
            <div className="flex items-center">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
      
      <CollapsibleContent>
        {/* Single Container with All Attributes */}
        <div className="border-t p-4 space-y-6">
          
          {/* Matched Names */}
          {hasNames && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 pb-2 border-b border-blue-600/30">
                <User className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                <span className="font-medium text-blue-700 dark:text-blue-300 text-sm uppercase tracking-wide">Names</span>
                <Badge variant="secondary" className="text-xs h-5">
                  {matchedAttributes.name!.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {matchedAttributes.name!.map((name, index) => (
                  <div 
                    key={index} 
                    className="py-2 px-3 bg-blue-600/5 rounded-lg border border-blue-600/10"
                  >
                    <div className="w-full">
                      {renderHighlightedText(name)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Addresses */}
          {hasAddresses && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 pb-2 border-b border-blue-500/30">
                <Home className="h-4 w-4 text-blue-500 dark:text-blue-500" />
                <span className="font-medium text-blue-500 dark:text-blue-500 text-sm uppercase tracking-wide">Addresses</span>
                <Badge variant="secondary" className="text-xs h-5">
                  {matchedAttributes.address!.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {matchedAttributes.address!.map((address, index) => (
                  <div 
                    key={index} 
                    className="py-2 px-3 bg-blue-500/5 rounded-lg border border-blue-500/10"
                  >
                    <div className="w-full">
                      {renderHighlightedText(address)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Countries */}
          {hasCountries && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 pb-2 border-b border-blue-400/30">
                <MapPin className="h-4 w-4 text-blue-400 dark:text-blue-600" />
                <span className="font-medium text-blue-400 dark:text-blue-600 text-sm uppercase tracking-wide">Countries</span>
                <Badge variant="secondary" className="text-xs h-5">
                  {matchedAttributes.country!.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {matchedAttributes.country!.map((country, index) => (
                  <div 
                    key={index} 
                    className="py-2 px-3 bg-blue-400/5 rounded-lg border border-blue-400/10"
                  >
                    <div className="w-full">
                      {renderHighlightedText(country)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
      </CollapsibleContent>
    </Collapsible>
    </div>
  );
}