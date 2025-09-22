"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MatchExplanationItem {
  field: string;
  matches: string[];
  quality: "high" | "medium" | "low";
}

interface MatchExplanationProps {
  matchExplanation?: MatchExplanationItem[];
  className?: string;
}

export function MatchExplanation({
  matchExplanation,
  className,
}: MatchExplanationProps) {
  if (!matchExplanation || matchExplanation.length === 0) {
    return null;
  }

  const getQualityBadgeClasses = (quality: string) => {
    switch (quality) {
      case "high":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20";
      case "low":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20";
      default:
        return "";
    }
  };

  const formatFieldName = (field: string) => {
    return field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ");
  };

  // Function to render text with highlighted matches
  const renderHighlightedText = (text: string) => {
    // Split by <em> tags while keeping the tags
    const parts = text.split(/(<em>.*?<\/em>)/g);

    return parts.map((part, index) => {
      if (part.startsWith("<em>") && part.endsWith("</em>")) {
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
              variant="outline"
              className={cn("text-xs", getQualityBadgeClasses(item.quality))}
            >
              {item.quality}
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
