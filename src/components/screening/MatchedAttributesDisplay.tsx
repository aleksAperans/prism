'use client';

import { Badge } from '@/components/ui/badge';
import { User, MapPin, Hash, Home } from 'lucide-react';

interface MatchedAttributesDisplayProps {
  matchedAttributes: {
    name?: string[];
    address?: string[];
    country: string[];
    identifier?: string[];
  }
}

export function MatchedAttributesDisplay({ matchedAttributes }: MatchedAttributesDisplayProps) {
  const hasNames = matchedAttributes.name && matchedAttributes.name.length > 0;
  const hasAddresses = matchedAttributes.address && matchedAttributes.address.length > 0;
  const hasCountries = matchedAttributes.country && matchedAttributes.country.length > 0;
  const hasIdentifiers = matchedAttributes.identifier && matchedAttributes.identifier.length > 0;

  // Helper function to render highlighted text from API response
  const renderHighlightedText = (text: string) => {
    if (!text) return text;
    
    // Split on <em> tags to preserve API highlighting
    const parts = text.split(/(<\/?em>)/g);
    let isHighlighted = false;
    
    return parts.map((part, index) => {
      if (part === '<em>') {
        isHighlighted = true;
        return null;
      } else if (part === '</em>') {
        isHighlighted = false;
        return null;
      } else if (part.trim()) {
        if (isHighlighted) {
          return (
            <Badge key={index} variant="secondary" className="text-xs px-1 py-0.5 h-auto font-normal bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
              {part}
            </Badge>
          );
        }
        return <span key={index}>{part}</span>;
      }
      return null;
    }).filter(Boolean);
  };

  return (
    <div className="bg-muted/50 border rounded-lg p-4 space-y-4">
      {/* Names */}
      {hasNames && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Names</span>
            </div>
            <Badge variant="outline" className="text-xs">{matchedAttributes.name!.length}</Badge>
          </div>
          <div className="space-y-2 pl-6">
            {matchedAttributes.name!.map((name, index) => (
              <div key={index} className="text-sm text-foreground leading-relaxed">
                {renderHighlightedText(name)}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Addresses */}
      {hasAddresses && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Addresses</span>
            </div>
            <Badge variant="outline" className="text-xs">{matchedAttributes.address!.length}</Badge>
          </div>
          <div className="space-y-2 pl-6">
            {matchedAttributes.address!.map((address, index) => (
              <div key={index} className="text-sm text-foreground leading-relaxed">
                {renderHighlightedText(address)}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Countries */}
      {hasCountries && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Countries</span>
            </div>
            <Badge variant="outline" className="text-xs">{matchedAttributes.country!.length}</Badge>
          </div>
          <div className="space-y-2 pl-6">
            {matchedAttributes.country!.map((country, index) => (
              <div key={index} className="text-sm text-foreground leading-relaxed">
                {renderHighlightedText(country)}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Identifiers */}
      {hasIdentifiers && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Identifiers</span>
            </div>
            <Badge variant="outline" className="text-xs">{matchedAttributes.identifier!.length}</Badge>
          </div>
          <div className="space-y-2 pl-6">
            {matchedAttributes.identifier!.map((identifier, index) => (
              <div key={index} className="text-sm text-foreground leading-relaxed">
                {renderHighlightedText(identifier)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}