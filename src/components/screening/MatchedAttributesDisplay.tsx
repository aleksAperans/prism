'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, MapPin, Home, Hash, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface MatchedAttributesDisplayProps {
  matchedAttributes: {
    name?: string[];
    address?: string[];
    country?: string[];
    identifier?: string[];
  };
}

export function MatchedAttributesDisplay({ matchedAttributes }: MatchedAttributesDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Auto-expanded by default
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    // All sections auto-expanded by default
    names: true,
    addresses: true,
    countries: true,
    identifiers: true
  });

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !(prev[sectionKey] ?? true) // Default to true (expanded)
    }));
  };

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
  const hasIdentifiers = matchedAttributes.identifier && matchedAttributes.identifier.length > 0;

  if (!hasNames && !hasAddresses && !hasCountries && !hasIdentifiers) {
    return null;
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'names': return <User className="h-4 w-4 text-muted-foreground" />;
      case 'addresses': return <Home className="h-4 w-4 text-muted-foreground" />;
      case 'countries': return <MapPin className="h-4 w-4 text-muted-foreground" />;
      case 'identifiers': return <Hash className="h-4 w-4 text-muted-foreground" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-3 rounded-t-md hover:bg-accent transition-colors">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm text-foreground">Matched Attributes</span>
                <Badge variant="outline" className="text-xs">
                  {[hasNames, hasAddresses, hasCountries, hasIdentifiers].filter(Boolean).length}
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
          <div className="p-3 pt-0 space-y-2">
          
          {/* Matched Names */}
          {hasNames && (
            <Collapsible 
              open={expandedSections['names'] ?? true} 
              onOpenChange={() => toggleSection('names')}
            >
              <CollapsibleTrigger asChild>
                <button className="w-full p-2 rounded-lg border bg-blue-500/5 border-blue-500/10 transition-colors hover:bg-blue-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon('names')}
                      <span className="font-medium text-sm">Names</span>
                      <Badge 
                        variant="outline" 
                        className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20"
                      >
                        {matchedAttributes.name!.length}
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      {(expandedSections['names'] ?? true) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="mt-1.5 ml-6 space-y-1.5">
                  {matchedAttributes.name!.map((name, index) => (
                    <div 
                      key={index} 
                      className="p-2.5 bg-card border rounded-md shadow-sm"
                    >
                      <div className="text-sm">
                        {renderHighlightedText(name)}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Matched Addresses */}
          {hasAddresses && (
            <Collapsible 
              open={expandedSections['addresses'] ?? true} 
              onOpenChange={() => toggleSection('addresses')}
            >
              <CollapsibleTrigger asChild>
                <button className="w-full p-2 rounded-lg border bg-blue-500/5 border-blue-500/10 transition-colors hover:bg-blue-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon('addresses')}
                      <span className="font-medium text-sm">Addresses</span>
                      <Badge 
                        variant="outline" 
                        className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20"
                      >
                        {matchedAttributes.address!.length}
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      {(expandedSections['addresses'] ?? true) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="mt-1.5 ml-6 space-y-1.5">
                  {matchedAttributes.address!.map((address, index) => (
                    <div 
                      key={index} 
                      className="p-2.5 bg-card border rounded-md shadow-sm"
                    >
                      <div className="text-sm">
                        {renderHighlightedText(address)}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Matched Countries */}
          {hasCountries && (
            <Collapsible 
              open={expandedSections['countries'] ?? true} 
              onOpenChange={() => toggleSection('countries')}
            >
              <CollapsibleTrigger asChild>
                <button className="w-full p-2 rounded-lg border bg-blue-500/5 border-blue-500/10 transition-colors hover:bg-blue-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon('countries')}
                      <span className="font-medium text-sm">Countries</span>
                      <Badge 
                        variant="outline" 
                        className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20"
                      >
                        {matchedAttributes.country!.length}
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      {(expandedSections['countries'] ?? true) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="mt-1.5 ml-6 space-y-1.5">
                  {matchedAttributes.country!.map((country, index) => (
                    <div 
                      key={index} 
                      className="p-2.5 bg-card border rounded-md shadow-sm"
                    >
                      <div className="text-sm">
                        {renderHighlightedText(country)}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Matched Identifiers */}
          {hasIdentifiers && (
            <Collapsible 
              open={expandedSections['identifiers'] ?? true} 
              onOpenChange={() => toggleSection('identifiers')}
            >
              <CollapsibleTrigger asChild>
                <button className="w-full p-2 rounded-lg border bg-blue-500/5 border-blue-500/10 transition-colors hover:bg-blue-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon('identifiers')}
                      <span className="font-medium text-sm">Identifiers</span>
                      <Badge 
                        variant="outline" 
                        className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20"
                      >
                        {matchedAttributes.identifier!.length}
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      {(expandedSections['identifiers'] ?? true) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="mt-1.5 ml-6 space-y-1.5">
                  {matchedAttributes.identifier!.map((identifier, index) => (
                    <div 
                      key={index} 
                      className="p-2.5 bg-card border rounded-md shadow-sm"
                    >
                      <div className="text-sm">
                        {renderHighlightedText(identifier)}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          
          </div>
        </CollapsibleContent>
      </Collapsible>
      </CardContent>
    </Card>
  );
}