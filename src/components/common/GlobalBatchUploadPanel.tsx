'use client';

import { useEffect, useCallback } from 'react';
import { useBatchUpload } from '@/contexts/BatchUploadContext';
import { MinimizedBatchProgress } from '@/components/projects/MinimizedBatchProgress';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function GlobalBatchUploadPanel() {
  const { activeJob, isMinimized, setIsMinimized, clearJob, setActiveJob } = useBatchUpload();
  const router = useRouter();

  // Auto-refresh when job completes
  useEffect(() => {
    if (activeJob?.status?.status === 'completed' && isMinimized) {
      const total = activeJob.status.totalEntities || 0;
      const processed = activeJob.status.processedEntities || 0;
      toast.success(`Batch upload complete! Processed ${processed} of ${total} entities.`);
    }
  }, [activeJob?.status?.status, isMinimized]);

  // Poll for job progress when minimized and processing
  useEffect(() => {
    if (!isMinimized || !activeJob || activeJob.status?.status !== 'processing') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const pollUrl = `/api/projects/${activeJob.projectId}/entities/batch?jobId=${activeJob.jobId}`;
        
        const response = await fetch(pollUrl);
        const result = await response.json();

        if (result.success && result.data) {
          const newStatus = result.data.status;
          const newResults = result.data.results || activeJob.results;
          
          // Update the active job with new status and results
          setActiveJob({
            ...activeJob,
            status: newStatus,
            results: newResults
          });

          // Stop polling when job is complete
          if (newStatus.status !== 'processing') {
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('Failed to poll job status in minimized panel:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [isMinimized, activeJob, setActiveJob]);

  if (!activeJob || !isMinimized) {
    return null;
  }

  return (
    <MinimizedBatchProgress
      jobId={activeJob.jobId}
      jobStatus={activeJob.status}
      results={activeJob.results}
      isMinimized={isMinimized}
      onMaximize={() => {
        // Set as not minimized first, then navigate
        setIsMinimized(false);
        // Navigate to the project entities page with a query parameter to indicate we want to open the modal
        router.push(`/projects/${activeJob.projectId}/entities?openBatchModal=true`);
      }}
      onClose={() => {
        clearJob();
      }}
    />
  );
}