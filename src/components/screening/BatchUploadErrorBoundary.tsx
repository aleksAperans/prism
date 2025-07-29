'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BatchUploadErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface BatchUploadErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error?: Error;
    resetError: () => void;
  }>;
}

export class BatchUploadErrorBoundary extends React.Component<
  BatchUploadErrorBoundaryProps,
  BatchUploadErrorBoundaryState
> {
  constructor(props: BatchUploadErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): BatchUploadErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('BatchUpload Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    if (typeof window !== 'undefined') {
      try {
        // Send error to monitoring service (e.g., Sentry, LogRocket, etc.)
        console.error('Batch Upload Error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        });
      } catch (loggingError) {
        console.error('Failed to log error:', loggingError);
      }
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error?: Error;
  resetError: () => void;
}

function DefaultErrorFallback({ error, resetError }: DefaultErrorFallbackProps) {
  const errorMessage = error?.message || 'An unexpected error occurred';
  const isNetworkError = error?.message?.toLowerCase().includes('network') || 
                         error?.message?.toLowerCase().includes('fetch');
  const isQuotaError = error?.message?.toLowerCase().includes('quota') ||
                       error?.message?.toLowerCase().includes('rate limit');

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          Batch Upload Error
        </CardTitle>
        <CardDescription>
          Something went wrong with the batch upload process
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Details</AlertTitle>
          <AlertDescription className="mt-2">
            {errorMessage}
          </AlertDescription>
        </Alert>

        {/* Contextual error help */}
        {isNetworkError && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Network Issue</AlertTitle>
            <AlertDescription>
              This appears to be a network connectivity issue. Please check your internet connection and try again.
            </AlertDescription>
          </Alert>
        )}

        {isQuotaError && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Rate Limit Exceeded</AlertTitle>
            <AlertDescription>
              The system is currently processing too many requests. Please wait a few minutes before trying again.
            </AlertDescription>
          </Alert>
        )}

        {/* Troubleshooting steps */}
        <div className="space-y-3">
          <h4 className="font-medium">Troubleshooting Steps:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Ensure your CSV file is properly formatted</li>
            <li>Check that all required fields (name) are present</li>
            <li>Verify that your file size is under 10MB</li>
            <li>Make sure you have selected a valid project and risk profile</li>
            <li>Try refreshing the page and uploading again</li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button onClick={resetError} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
          >
            Refresh Page
          </Button>
        </div>

        {/* Development error details */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Developer Info (Development Only)
            </summary>
            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
              {error.stack}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}