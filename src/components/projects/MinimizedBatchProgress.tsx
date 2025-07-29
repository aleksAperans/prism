'use client';

import { useState, useEffect } from 'react';
import { 
  Maximize2,
  X,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BatchJobStatus, BatchEntityResult } from '@/services/batch/types';

interface MinimizedBatchProgressProps {
  jobId: string;
  jobStatus: BatchJobStatus;
  results: BatchEntityResult[];
  onMaximize: () => void;
  onClose: () => void;
  isMinimized: boolean;
}

export function MinimizedBatchProgress({
  jobStatus,
  onMaximize,
  onClose,
  isMinimized
}: MinimizedBatchProgressProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ 
    x: typeof window !== 'undefined' ? window.innerWidth - 320 : 300, 
    y: typeof window !== 'undefined' ? window.innerHeight - 200 : 100 
  });

  // Handle window resize to keep panel in bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.max(0, Math.min(window.innerWidth - 320, prev.x)),
        y: Math.max(0, Math.min(window.innerHeight - 200, prev.y))
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getStatusIcon = () => {
    switch (jobStatus?.status) {
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Upload className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (jobStatus?.status) {
      case 'processing':
        return 'bg-blue-500/10 text-blue-600 border-blue-600/20';
      case 'completed':
        return 'bg-green-500/10 text-green-600 border-green-600/20';
      case 'failed':
        return 'bg-red-500/10 text-red-600 border-red-600/20';
      case 'cancelled':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-600/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-600/20';
    }
  };

  const progress = jobStatus?.totalEntities > 0 
    ? Math.round((jobStatus.processedEntities / jobStatus.totalEntities) * 100) 
    : 0;
  const canClose = jobStatus?.status !== 'processing';

  return (
    <Card 
      className={cn(
        "fixed shadow-2xl border-2 transition-all duration-300 z-50",
        getStatusColor(),
        isMinimized ? "w-80" : "w-96",
        isDragging && "cursor-move"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.drag-handle')) {
          setIsDragging(true);
          const startX = e.clientX - position.x;
          const startY = e.clientY - position.y;

          const handleMouseMove = (e: MouseEvent) => {
            setPosition({
              x: Math.max(0, Math.min(window.innerWidth - 320, e.clientX - startX)),
              y: Math.max(0, Math.min(window.innerHeight - 200, e.clientY - startY))
            });
          };

          const handleMouseUp = () => {
            setIsDragging(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }
      }}
    >
      <CardHeader className="p-3 drag-handle cursor-move">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {getStatusIcon()}
            <span>Batch Upload Progress</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onMaximize}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            {canClose && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onClose}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {jobStatus?.status === 'completed' ? 'Completed' : 'Processing'}
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {jobStatus?.processedEntities || 0} / {jobStatus?.totalEntities || 0}
            </Badge>
            {jobStatus?.status === 'processing' && (
              <span className="text-muted-foreground">entities</span>
            )}
          </div>
          {jobStatus?.status === 'completed' && (
            <Badge variant="default" className="text-xs px-1.5 py-0 bg-green-600">
              Complete
            </Badge>
          )}
        </div>

        {jobStatus?.status === 'completed' && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={onMaximize}
          >
            View Results
          </Button>
        )}
      </CardContent>
    </Card>
  );
}