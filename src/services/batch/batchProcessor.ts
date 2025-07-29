import { screeningService } from '@/services/api/screening';
import { RateLimiter } from './rateLimiter';
import { loadRiskProfileById, filterRiskFactorsByProfile } from '@/lib/risk-scoring';
import { prisma } from '@/lib/prisma';
import type {
  BatchEntityInput,
  BatchProcessingOptions,
  BatchJobStatus,
  BatchEntityResult,
  BatchProcessingResult,
} from './types';
import type { EntityAttributes } from '@/types/api.types';

export class BatchProcessor {
  private rateLimiter: RateLimiter;
  private jobs: Map<string, BatchJobStatus> = new Map();
  private results: Map<string, BatchEntityResult[]> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  
  constructor() {
    // 5 requests per second for improved batch performance
    this.rateLimiter = new RateLimiter(5, 1000);
  }

  async processBatch(
    entities: BatchEntityInput[],
    options: BatchProcessingOptions,
    userId?: string
  ): Promise<BatchProcessingResult> {
    const jobId = this.generateJobId();
    const abortController = new AbortController();
    this.abortControllers.set(jobId, abortController);
    
    // Initialize job status
    const jobStatus: BatchJobStatus = {
      id: jobId,
      status: 'processing',
      totalEntities: entities.length,
      processedEntities: 0,
      successfulEntities: 0,
      failedEntities: 0,
      duplicateEntities: 0,
      startedAt: new Date(),
    };
    
    this.jobs.set(jobId, jobStatus);
    this.results.set(jobId, []);
    
    // Save initial job record to database
    try {
      await prisma.batchJob.create({
        data: {
          id: jobId,
          user_id: userId || 'unknown',
          project_id: options.projectId,
          job_type: 'screening',
          status: 'processing',
          progress: 0,
          total_items: entities.length,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      console.log('💾 Batch job saved to database:', jobId);
    } catch (dbError) {
      console.warn('⚠️ Failed to save batch job to database:', dbError);
      // Continue processing even if database save fails
    }
    
    // Start processing in background (don't await)
    this.processEntitiesAsync(entities, options, jobId, abortController, jobStatus, userId);
    
    // Return immediately with initial status
    return {
      jobId,
      status: this.jobs.get(jobId)!,
      results: this.results.get(jobId)!,
    };
  }

  private async processEntitiesAsync(
    entities: BatchEntityInput[],
    options: BatchProcessingOptions,
    jobId: string,
    abortController: AbortController,
    jobStatus: BatchJobStatus,
    userId?: string
  ) {
    try {
      // Process entities in chunks
      const chunkSize = options.chunkSize || 10;
      const chunks = this.chunkArray(entities, chunkSize);
      
      for (const [chunkIndex, chunk] of chunks.entries()) {
        if (abortController.signal.aborted) {
          throw new Error('Job cancelled');
        }
        
        // Process entities one by one for better progress tracking
        for (const [entityIndex, entity] of chunk.entries()) {
          if (abortController.signal.aborted) {
            throw new Error('Job cancelled');
          }
          
          const result = await this.processEntity(
            entity,
            chunkIndex * chunkSize + entityIndex,
            options,
            jobId,
            abortController.signal
          );
          
          // Update results immediately after each entity
          const currentResults = this.results.get(jobId) || [];
          this.results.set(jobId, [...currentResults, result]);
          
          // Update job status immediately after each entity
          jobStatus.processedEntities += 1;
          if (result.status === 'success') jobStatus.successfulEntities += 1;
          if (result.status === 'failed') jobStatus.failedEntities += 1;
          if (result.status === 'duplicate') jobStatus.duplicateEntities += 1;
          
          this.jobs.set(jobId, { ...jobStatus });
          
          // Update database progress
          const progressPercent = Math.round((jobStatus.processedEntities / jobStatus.totalEntities) * 100);
          try {
            await prisma.batchJob.update({
              where: { id: jobId },
              data: {
                progress: progressPercent,
                updated_at: new Date(),
              },
            });
          } catch (dbError) {
            console.warn('⚠️ Failed to update batch job progress:', dbError);
          }
          
          console.log(`✅ Processed entity ${jobStatus.processedEntities}/${jobStatus.totalEntities} (${progressPercent}%)`);
          
          // Add a small delay to make progress visible (the rate limiter should handle this, but let's be explicit)
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between entities
        }
      }
      
      // Mark job as completed
      jobStatus.status = 'completed';
      jobStatus.completedAt = new Date();
      this.jobs.set(jobId, jobStatus);
      
      // Update database with completion
      try {
        const currentResults = this.results.get(jobId) || [];
        await prisma.batchJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            progress: 100,
            completed_at: new Date(),
            updated_at: new Date(),
            result: {
              summary: {
                totalEntities: jobStatus.totalEntities,
                successfulEntities: jobStatus.successfulEntities,
                failedEntities: jobStatus.failedEntities,
                duplicateEntities: jobStatus.duplicateEntities,
              },
              resultCount: currentResults.length,
            },
          },
        });
        console.log('💾 Batch job completed and saved to database:', jobId);
      } catch (dbError) {
        console.warn('⚠️ Failed to update completed batch job:', dbError);
      }
      
    } catch (error) {
      // Mark job as failed
      const finalStatus = error instanceof Error && error.message === 'Job cancelled' ? 'cancelled' : 'failed';
      jobStatus.status = finalStatus;
      jobStatus.error = error instanceof Error ? error.message : 'Unknown error';
      jobStatus.completedAt = new Date();
      this.jobs.set(jobId, jobStatus);
      
      // Update database with failure
      try {
        await prisma.batchJob.update({
          where: { id: jobId },
          data: {
            status: finalStatus,
            completed_at: new Date(),
            updated_at: new Date(),
            error: jobStatus.error,
          },
        });
        console.log('💾 Batch job failure saved to database:', jobId);
      } catch (dbError) {
        console.warn('⚠️ Failed to update failed batch job:', dbError);
      }
    } finally {
      this.abortControllers.delete(jobId);
    }
  }

  private async processEntity(
    entity: BatchEntityInput,
    index: number,
    options: BatchProcessingOptions,
    jobId: string,
    signal: AbortSignal
  ): Promise<BatchEntityResult> {
    try {
      if (signal.aborted) {
        throw new Error('Processing cancelled');
      }
      
      // Convert to EntityAttributes format
      const attributes: EntityAttributes = {
        name: [entity.name],
        type: entity.type || 'company',
        ...(entity.address && { addresses: [entity.address] }),
        ...(entity.country && { country: [entity.country] }),
        ...(entity.identifier && { identifier: [entity.identifier] }),
      };
      
      // Check for duplicates first
      const duplicateCheck = await this.rateLimiter.execute(async () =>
        screeningService.checkEntityExists(options.projectId, attributes)
      );
      
      if (duplicateCheck.exists && duplicateCheck.project_entity_id) {
        return {
          index,
          input: entity,
          status: 'duplicate',
          existingEntityId: duplicateCheck.project_entity_id,
        };
      }
      
      // Screen the entity
      const projectEntity = await this.rateLimiter.execute(async () =>
        screeningService.screenEntity(
          options.projectId,
          attributes,
          options.profile
        )
      );

      // Apply risk profile filtering if specified
      if (options.riskProfile && projectEntity) {
        try {
          // Load the risk profile
          const riskProfile = await loadRiskProfileById(options.riskProfile);
          
          if (riskProfile) {
            // Collect all risk factors from entity and matches
            const allRiskFactors = new Set();
            
            // Add parent-level risk factors
            projectEntity.risk_factors?.forEach(rf => allRiskFactors.add(rf.id));
            
            // Add risk factors from all matches
            projectEntity.matches?.forEach(match => {
              match.risk_factors?.forEach(rf => allRiskFactors.add(rf.id));
            });

            const combinedRiskFactors = Array.from(allRiskFactors).map(id => ({ id: id as string }));
            
            // Apply risk profile filtering
            const filteredRiskFactors = filterRiskFactorsByProfile(combinedRiskFactors, riskProfile);
            
            // Update the project entity with filtered risk factors
            projectEntity.risk_factors = filteredRiskFactors;
            
            // Also filter risk factors in matches
            if (projectEntity.matches) {
              projectEntity.matches = projectEntity.matches.map(match => ({
                ...match,
                risk_factors: match.risk_factors ? 
                  filterRiskFactorsByProfile(match.risk_factors, riskProfile) : 
                  match.risk_factors
              }));
            }
            
            console.log(`✅ Applied risk filtering for profile ${riskProfile.name}: ${combinedRiskFactors.length} -> ${filteredRiskFactors.length} risk factors`);
          }
        } catch (error) {
          console.warn('⚠️ Failed to apply risk profile filtering:', error);
          // Continue without filtering rather than failing the entire entity
        }
      }
      
      return {
        index,
        input: entity,
        status: 'success',
        projectEntity,
      };
      
    } catch (error) {
      return {
        index,
        input: entity,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getJobStatus(jobId: string): BatchJobStatus | undefined {
    return this.jobs.get(jobId);
  }

  getJobResults(jobId: string): BatchEntityResult[] | undefined {
    return this.results.get(jobId);
  }

  cancelJob(jobId: string): boolean {
    const controller = this.abortControllers.get(jobId);
    if (controller) {
      controller.abort();
      return true;
    }
    return false;
  }

  async getBatchHistory(userId?: string, projectId?: string, limit: number = 20): Promise<Array<{
    id: string;
    project_id: string;
    job_type: string;
    status: string;
    progress: number;
    total_items: number;
    result: unknown;
    error: string | null;
    created_at: Date;
    completed_at: Date | null;
  }>> {
    try {
      const whereClause: { user_id?: string; project_id?: string } = {};
      if (userId) whereClause.user_id = userId;
      if (projectId) whereClause.project_id = projectId;
      
      const jobs = await prisma.batchJob.findMany({
        where: whereClause,
        orderBy: {
          created_at: 'desc',
        },
        take: limit,
        select: {
          id: true,
          project_id: true,
          job_type: true,
          status: true,
          progress: true,
          total_items: true,
          result: true,
          error: true,
          created_at: true,
          completed_at: true,
        },
      });
      
      return jobs;
    } catch (error) {
      console.warn('⚠️ Failed to fetch batch history:', error);
      return [];
    }
  }

  private generateJobId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}