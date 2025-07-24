'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <Card className={cn(
      'flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center',
      className
    )}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {description}
      </p>
      {action && (
        <Button 
          onClick={action.onClick}
          className="mt-6"
        >
          {action.label}
        </Button>
      )}
    </Card>
  );
}

interface EmptySearchProps {
  query?: string;
  onClear?: () => void;
}

export function EmptySearch({ query, onClear }: EmptySearchProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <svg
          className="h-6 w-6 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-semibold">No results found</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {query 
          ? `No results found for "${query}". Try adjusting your search.`
          : 'No results found. Try a different search term.'
        }
      </p>
      {onClear && (
        <Button 
          variant="outline" 
          onClick={onClear}
          className="mt-4"
        >
          Clear search
        </Button>
      )}
    </div>
  );
}

interface EmptyListProps {
  title: string;
  description: string;
  createLabel?: string;
  onCreate?: () => void;
}

export function EmptyList({ 
  title, 
  description, 
  createLabel, 
  onCreate 
}: EmptyListProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <svg
          className="h-6 w-6 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {description}
      </p>
      {onCreate && createLabel && (
        <Button 
          onClick={onCreate}
          className="mt-6"
        >
          {createLabel}
        </Button>
      )}
    </div>
  );
}