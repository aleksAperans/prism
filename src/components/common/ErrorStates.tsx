'use client';

import { AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorAlertProps {
  title?: string;
  message: string;
  variant?: 'destructive' | 'default';
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorAlert({ 
  title = 'Error',
  message, 
  variant = 'destructive',
  onRetry,
  retryLabel = 'Try Again',
  className 
}: ErrorAlertProps) {
  return (
    <Alert variant={variant} className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{message}</p>
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="mt-2"
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            {retryLabel}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface ErrorCardProps {
  title?: string;
  description: string;
  error?: Error;
  onRetry?: () => void;
  retryLabel?: string;
  showDetails?: boolean;
  className?: string;
}

export function ErrorCard({ 
  title = 'Something went wrong',
  description,
  error,
  onRetry,
  retryLabel = 'Try Again',
  showDetails = false,
  className 
}: ErrorCardProps) {
  return (
    <Card className={cn('border-destructive/50', className)}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-destructive">{title}</CardTitle>
            <CardDescription className="mt-1">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      {(onRetry || (showDetails && error)) && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {onRetry && (
              <Button 
                variant="outline" 
                onClick={onRetry}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {retryLabel}
              </Button>
            )}
            {showDetails && error && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Error details
                </summary>
                <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 text-xs">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function NetworkError({ onRetry, className }: NetworkErrorProps) {
  return (
    <ErrorCard
      title="Connection Error"
      description="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
      className={className}
    />
  );
}

interface RateLimitErrorProps {
  retryAfter?: number;
  onRetry?: () => void;
  className?: string;
}

export function RateLimitError({ retryAfter, onRetry, className }: RateLimitErrorProps) {
  const retryMessage = retryAfter 
    ? `Please wait ${retryAfter} seconds before retrying.`
    : 'Please wait a moment before retrying.';

  return (
    <ErrorAlert
      title="Rate Limited"
      message={`Too many requests. ${retryMessage}`}
      variant="default"
      onRetry={onRetry}
      retryLabel="Retry Now"
      className={className}
    />
  );
}

interface AuthErrorProps {
  onSignIn?: () => void;
  className?: string;
}

export function AuthError({ onSignIn, className }: AuthErrorProps) {
  return (
    <ErrorCard
      title="Authentication Required"
      description="You need to be signed in to access this feature."
      onRetry={onSignIn}
      retryLabel="Sign In"
      className={className}
    />
  );
}

interface NotFoundErrorProps {
  resource?: string;
  onGoBack?: () => void;
  className?: string;
}

export function NotFoundError({ 
  resource = 'resource', 
  onGoBack, 
  className 
}: NotFoundErrorProps) {
  return (
    <ErrorCard
      title="Not Found"
      description={`The ${resource} you're looking for doesn't exist or has been removed.`}
      onRetry={onGoBack}
      retryLabel="Go Back"
      className={className}
    />
  );
}

interface ValidationErrorProps {
  errors: Record<string, string[]>;
  className?: string;
}

export function ValidationError({ errors, className }: ValidationErrorProps) {
  const errorEntries = Object.entries(errors);
  
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Validation Error</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-1">
          {errorEntries.map(([field, fieldErrors]) => (
            <div key={field}>
              <strong className="capitalize">{field}:</strong>
              <ul className="ml-4 list-disc">
                {fieldErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface GenericErrorBoundaryProps {
  error: Error;
  onReset?: () => void;
  fallback?: React.ReactNode;
}

export function GenericErrorBoundary({ 
  error, 
  onReset, 
  fallback 
}: GenericErrorBoundaryProps) {
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
      <ErrorCard
        title="Unexpected Error"
        description="An unexpected error occurred. Please try refreshing the page."
        error={error}
        onRetry={onReset}
        retryLabel="Refresh Page"
        showDetails={process.env.NODE_ENV === 'development'}
      />
    </div>
  );
}