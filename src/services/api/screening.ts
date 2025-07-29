import sayariClient, { withRateLimit } from './client';
import { riskFactorService } from './riskFactors';
import type {
  EntityAttributes,
  ProjectEntity,
  CreateEntityRequest,
  GetProjectEntitiesParams,
  SayariResponse,
  ScreeningProfile,
} from '@/types/api.types';

export class ScreeningService {
  // Create project entity (perform screening)
  async screenEntity(
    projectId: string,
    attributes: EntityAttributes,
    profile: ScreeningProfile
  ): Promise<ProjectEntity> {
    return withRateLimit(async () => {
      // Send entity attributes directly, not wrapped in an array
      const request = {
        ...attributes,
        profile,
      };

      // Send screening request

      const response = await sayariClient.post<{ data: ProjectEntity }>(
        `/v1/projects/${projectId}/entities/create`,
        request
      );

      // Response received successfully

      // The response data contains a nested data property with the project entity
      const entity = response.data.data;
      
      // Entity created successfully
      
      if (!entity || !entity.project_entity_id) {
        console.error('Invalid entity response structure');
        throw new Error('No valid entity returned from screening request');
      }

      // Enrich entity with risk factor details
      return this.enrichEntityWithRiskFactors(entity);
    });
  }

  // Screen multiple entities
  async screenEntities(
    projectId: string,
    entities: EntityAttributes[],
    profile: ScreeningProfile
  ): Promise<ProjectEntity[]> {
    return withRateLimit(async () => {
      const request: CreateEntityRequest = {
        attributes: entities,
        profile,
      };

      const response = await sayariClient.post<SayariResponse<ProjectEntity[]>>(
        `/v1/projects/${projectId}/entities/create`,
        request
      );

      // Enrich all entities with risk factor details
      const enrichedEntities = await Promise.all(
        response.data.data.map(entity => this.enrichEntityWithRiskFactors(entity))
      );

      return enrichedEntities;
    });
  }

  // Get project entities
  async getProjectEntities(
    projectId: string,
    params?: GetProjectEntitiesParams
  ): Promise<SayariResponse<ProjectEntity[]>> {
    return withRateLimit(async () => {
      const response = await sayariClient.get<SayariResponse<ProjectEntity[]>>(
        `/v1/projects/${projectId}/entities`,
        { params }
      );

      // Enrich all entities with risk factor details
      const enrichedData = await Promise.all(
        response.data.data.map(entity => this.enrichEntityWithRiskFactors(entity))
      );

      return {
        ...response.data,
        data: enrichedData,
      };
    });
  }

  // Get single project entity
  async getProjectEntity(projectId: string, entityId: string): Promise<ProjectEntity> {
    return withRateLimit(async () => {
      const response = await sayariClient.get<{ data: ProjectEntity } | ProjectEntity>(
        `/v1/projects/${projectId}/entities/${entityId}`
      );

      // Handle both response formats - some APIs return nested data, others don't
      const entity = 'data' in response.data ? response.data.data : response.data;
      
      if (!entity || !entity.project_entity_id) {
        console.error('Invalid entity response structure from GET');
        throw new Error('No valid entity returned from get project entity request');
      }

      return this.enrichEntityWithRiskFactors(entity);
    });
  }

  // Delete project entity
  async deleteProjectEntity(projectId: string, entityId: string): Promise<void> {
    return withRateLimit(async () => {
      await sayariClient.delete(`/v1/projects/${projectId}/entities/${entityId}`);
    });
  }

  // Delete entity match
  async deleteEntityMatch(
    projectId: string,
    entityId: string,
    matchId: string
  ): Promise<void> {
    return withRateLimit(async () => {
      await sayariClient.delete(
        `/v1/projects/${projectId}/entities/${entityId}/matches/${matchId}`
      );
    });
  }

  // Check if entity exists
  async checkEntityExists(
    projectId: string,
    attributes: EntityAttributes
  ): Promise<{ exists: boolean; project_entity_id?: string }> {
    return withRateLimit(async () => {
      try {
        const response = await sayariClient.post<{ project_entity_id?: string }>(
          `/v1/projects/${projectId}/entities/exists`,
          attributes
        );
        
        return {
          exists: !!response.data.project_entity_id,
          project_entity_id: response.data.project_entity_id
        };
      } catch (error: unknown) {
        if (error instanceof Error && 'isNotFound' in error && error.isNotFound) {
          return { exists: false };
        }
        throw error;
      }
    });
  }

  // Save project entity (alternative to create)
  async saveProjectEntity(
    projectId: string,
    entityIds: string[],
    attributes: EntityAttributes
  ): Promise<ProjectEntity> {
    return withRateLimit(async () => {
      const response = await sayariClient.post<ProjectEntity>(
        `/v1/projects/${projectId}/entities/save`,
        {
          entity_ids: entityIds,
          attributes,
        }
      );

      return this.enrichEntityWithRiskFactors(response.data);
    });
  }

  // Get supply chain information
  async getSupplyChain(
    projectId: string,
    entityId: string,
    params?: {
      tier_limit?: number;
      risk_filter?: string[];
      country_filter?: string[];
      date_range?: {
        start: string;
        end: string;
      };
    }
  ): Promise<unknown> {
    return withRateLimit(async () => {
      const response = await sayariClient.get(
        `/v1/projects/${projectId}/entities/${entityId}/supply_chain/upstream`,
        { params }
      );

      return response.data;
    });
  }

  // Get supply chain summary
  async getSupplyChainSummary(projectId: string, entityId: string): Promise<unknown> {
    return withRateLimit(async () => {
      const response = await sayariClient.get(
        `/v1/projects/${projectId}/entities/${entityId}/supply_chain/upstream_summary`
      );

      return response.data;
    });
  }

  // Helper method to enrich entity with risk factor details
  private async enrichEntityWithRiskFactors(entity: unknown): Promise<ProjectEntity> {
    const typedEntity = entity as ProjectEntity;
    try {
      // Get risk factors for the entity
      const entityRiskFactors = await riskFactorService.getRiskFactors(
        typedEntity.risk_factors?.map(rf => (rf as { id: string }).id) || []
      );

      // Get risk factors for all matches
      const enrichedMatches = await Promise.all(
        (typedEntity.matches || []).map(async (match) => {
          const matchRiskFactors = await riskFactorService.getRiskFactors(
            match.risk_factors?.map(rf => (rf as { id: string }).id) || []
          );
          return {
            ...match,
            risk_factors: matchRiskFactors,
          };
        })
      );

      return {
        ...typedEntity,
        risk_factors: entityRiskFactors,
        matches: enrichedMatches,
      };
    } catch (error) {
      console.error('Failed to enrich entity with risk factors:', error);
      // Return entity without enrichment if risk factor lookup fails
      return typedEntity;
    }
  }
}

// Create singleton instance
export const screeningService = new ScreeningService();