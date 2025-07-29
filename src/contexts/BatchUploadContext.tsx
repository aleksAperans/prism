'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { BatchJobStatus, BatchEntityResult } from '@/services/batch/types';

interface BatchUploadJob {
  jobId: string;
  projectId: string;
  status: BatchJobStatus;
  results: BatchEntityResult[];
}

interface BatchUploadContextType {
  activeJob: BatchUploadJob | null;
  isMinimized: boolean;
  setActiveJob: (job: BatchUploadJob | null) => void;
  setIsMinimized: (minimized: boolean) => void;
  clearJob: () => void;
}

const BatchUploadContext = createContext<BatchUploadContextType | undefined>(undefined);

export function BatchUploadProvider({ children }: { children: ReactNode }) {
  const [activeJob, setActiveJob] = useState<BatchUploadJob | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const clearJob = () => {
    setActiveJob(null);
    setIsMinimized(false);
  };

  return (
    <BatchUploadContext.Provider
      value={{
        activeJob,
        isMinimized,
        setActiveJob,
        setIsMinimized,
        clearJob,
      }}
    >
      {children}
    </BatchUploadContext.Provider>
  );
}

export function useBatchUpload() {
  const context = useContext(BatchUploadContext);
  if (context === undefined) {
    throw new Error('useBatchUpload must be used within a BatchUploadProvider');
  }
  return context;
}