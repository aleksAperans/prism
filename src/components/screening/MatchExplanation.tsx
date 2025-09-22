'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MatchExplanationItem {
  field: string;
  matches: string[];
  quality: 'high' | 'medium' | 'low';
}

interface MatchExplanationProps {
  matchExplanation?: MatchExplanationItem[];
  className?: string;
}

export function MatchExplanation({ matchExplanation, className }: MatchExplanationProps) {
  if (!matchExplanation || matchExplanation.length === 0) {
    return null;
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high':
        return 'text-green-600 dark:text-green-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getQualityBadgeVariant = (quality: string): 'default' | 'secondary' | 'outline' => {
    switch (quality) {
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatFieldName = (field: string) => {
    return field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
  };

  // Function to render text with highlighted matches
  const renderHighlightedText = (text: string) => {
    // Split by <em> tags while keeping the tags
    const parts = text.split(/(<em>.*?<\/em>)/g);

    return parts.map((part, index) => {
      if (part.startsWith('<em>') && part.endsWith('</em>')) {
        // Extract the content between <em> tags
        const highlightedText = part.slice(4, -5);
        return (
          <mark
            key={index}
            className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-200 px-0.5 rounded font-medium"
          >
            {highlightedText}
          </mark>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {matchExplanation.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {formatFieldName(item.field)}
            </span>
            <Badge
              variant={getQualityBadgeVariant(item.quality)}
              className={cn("text-xs", getQualityColor(item.quality))}
            >
              {item.quality} match
            </Badge>
          </div>
          <div className="space-y-1 pl-2">
            {item.matches.map((match, matchIndex) => (
              <div
                key={matchIndex}
                className="text-sm bg-muted/30 rounded px-2 py-1 font-mono"
              >
                {renderHighlightedText(match)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
