'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Loader2, FileText, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';

interface BatchJob {
  id: string;
  project_id: string;
  job_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  total_items: number;
  result?: {
    summary?: {
      totalEntities: number;
      successfulEntities: number;
      failedEntities: number;
      duplicateEntities: number;
    };
    resultCount?: number;
  };
  error?: string;
  created_at: string;
  completed_at?: string;
}

interface BatchHistoryProps {
  projectId: string;
  limit?: number;
  refreshTrigger?: number;
}

export function BatchHistory({ projectId, limit = 10, refreshTrigger }: BatchHistoryProps) {
  const [history, setHistory] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [projectId, refreshTrigger]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/projects/${projectId}/entities/batch/history?limit=${limit}`);
      const result = await response.json();
      
      if (result.success) {
        setHistory(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch batch history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch batch history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = {
      completed: 'default' as const,
      failed: 'destructive' as const,
      cancelled: 'secondary' as const,
      processing: 'default' as const,
      pending: 'secondary' as const,
    }[status] || 'secondary' as const;

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Batch Uploads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Batch Uploads
        </CardTitle>
        <CardDescription>
          View your recent batch processing jobs and their results
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No batch uploads found</p>
            <p className="text-sm">Upload your first CSV file to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((job, index) => (
              <div key={job.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(job.status)}
                      <span className="text-sm font-medium">
                        {job.total_items} entities
                      </span>
                      <span className="text-sm text-muted-foreground">
                        • {formatDate(job.created_at)}
                      </span>
                    </div>
                    
                    {job.result?.summary && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600">
                          ✓ {job.result.summary.successfulEntities} successful
                        </span>
                        {job.result.summary.duplicateEntities > 0 && (
                          <span className="text-yellow-600">
                            ⚠ {job.result.summary.duplicateEntities} duplicates
                          </span>
                        )}
                        {job.result.summary.failedEntities > 0 && (
                          <span className="text-red-600">
                            ✗ {job.result.summary.failedEntities} failed
                          </span>
                        )}
                      </div>
                    )}
                    
                    {job.status === 'processing' && (
                      <div className="text-sm text-muted-foreground">
                        Progress: {job.progress}% ({Math.round((job.progress / 100) * job.total_items)} of {job.total_items} entities)
                      </div>
                    )}
                    
                    {job.error && (
                      <div className="text-sm text-red-600">
                        Error: {job.error}
                      </div>
                    )}
                    
                    {job.completed_at && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Completed {formatDate(job.completed_at)}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Job ID: {job.id.split('_')[1]}...
                  </div>
                </div>
                
                {index < history.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
            
            {history.length >= limit && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm" onClick={fetchHistory}>
                  Refresh
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}