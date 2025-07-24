'use client';

import { Badge } from '@/components/ui/badge';
import { User, MapPin } from 'lucide-react';

interface MatchedAttributesDisplayProps {
  matchedAttributes: {
    name?: string[];
    country?: string[];
  };
}

export function MatchedAttributesDisplay({ matchedAttributes }: MatchedAttributesDisplayProps) {
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
  const hasCountries = matchedAttributes.country && matchedAttributes.country.length > 0;

  if (!hasNames && !hasCountries) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Matched Names */}
      {hasNames && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-foreground text-sm">Matched Names</span>
            <Badge variant="outline" className="text-xs">
              {matchedAttributes.name!.length} variant{matchedAttributes.name!.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-2">
            {matchedAttributes.name!.map((name, index) => (
              <div 
                key={index} 
                className="flex items-start space-x-2 pb-2 last:pb-0 border-b border-blue-500/20 last:border-b-0"
              >
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {renderHighlightedText(name)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matched Countries */}
      {hasCountries && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-green-500" />
            <span className="font-medium text-foreground text-sm">Matched Countries</span>
            <Badge variant="outline" className="text-xs">
              {matchedAttributes.country!.length} location{matchedAttributes.country!.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="flex flex-wrap gap-2">
              {matchedAttributes.country!.map((country, index) => (
                <div key={index} className="inline-block">
                  {renderHighlightedText(country)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}