import type { EntityAttributes, ProjectEntity } from '@/types/api.types';

export interface BatchEntityInput {
  name: string;
  address?: string;
  country?: string;
  type?: 'company' | 'person';
  identifier?: string;
}

export interface BatchProcessingOptions {
  projectId: string;
  riskProfile: string;
  profile: 'corporate' | 'suppliers' | 'search' | 'screen';
  chunkSize?: number;
  maxRetries?: number;
}

export interface BatchJobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalEntities: number;
  processedEntities: number;
  successfulEntities: number;
  failedEntities: number;
  duplicateEntities: number;
  startedAt?: Date | string;
  completedAt?: Date | string;
  error?: string;
}

export interface BatchEntityResult {
  index: number;
  input: BatchEntityInput;
  status: 'success' | 'failed' | 'duplicate';
  projectEntity?: ProjectEntity;
  existingEntityId?: string;
  error?: string;
}

export interface BatchProcessingResult {
  jobId: string;
  status: BatchJobStatus;
  results: BatchEntityResult[];
}

export interface BatchQueueItem {
  entities: BatchEntityInput[];
  options: BatchProcessingOptions;
  jobId: string;
  priority?: number;
}