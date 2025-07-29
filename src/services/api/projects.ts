import sayariClient, { withRateLimit } from './client';
import type {
  SayariProject,
  CreateProjectRequest,
  SayariResponse,
  ProjectEntity,
} from '@/types/api.types';

export class ProjectService {
  // Create a new project
  async createProject(label: string, share?: { org: 'viewer' | 'editor' | 'admin' }): Promise<SayariProject> {
    return withRateLimit(async () => {
      const request: CreateProjectRequest = {
        label,
        ...(share && { share }),
      };

      const response = await sayariClient.post<{ data: SayariProject }>('/v1/projects', request);
      return response.data.data;
    });
  }

  // Get all projects
  async getProjects(params?: {
    limit?: number;
    archived?: boolean;
    next?: string;
    prev?: string;
  }): Promise<SayariResponse<SayariProject[]>> {
    return withRateLimit(async () => {
      const response = await sayariClient.get<SayariResponse<SayariProject[]>>('/v1/projects', {
        params,
      });
      return response.data;
    });
  }

  // Get a single project
  async getProject(projectId: string): Promise<SayariProject> {
    return withRateLimit(async () => {
      const response = await sayariClient.get<{ data: SayariProject }>(`/v1/projects/${projectId}`);
      return response.data.data;
    });
  }

  // Update project
  async updateProject(
    projectId: string,
    updates: Partial<Pick<SayariProject, 'label' | 'archived'>>
  ): Promise<SayariProject> {
    return withRateLimit(async () => {
      const response = await sayariClient.patch<{ data: SayariProject }>(`/v1/projects/${projectId}`, updates);
      return response.data.data;
    });
  }

  // Delete project
  async deleteProject(projectId: string): Promise<void> {
    return withRateLimit(async () => {
      await sayariClient.delete(`/v1/projects/${projectId}`);
    });
  }

  // Archive project
  async archiveProject(projectId: string): Promise<SayariProject> {
    return this.updateProject(projectId, { archived: true });
  }

  // Unarchive project
  async unarchiveProject(projectId: string): Promise<SayariProject> {
    return this.updateProject(projectId, { archived: false });
  }

  // Check if project exists
  async projectExists(projectId: string): Promise<boolean> {
    try {
      await this.getProject(projectId);
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && 'isNotFound' in error && error.isNotFound) {
        return false;
      }
      throw error;
    }
  }

  // Get project statistics
  async getProjectStats(projectId: string): Promise<SayariProject['counts']> {
    const project = await this.getProject(projectId);
    return project.counts;
  }

  // Get project entities
  async getProjectEntities(
    projectId: string,
    params?: {
      limit?: number;
      next?: string;
      prev?: string;
      entity_types?: string[];
      geo_facets?: boolean;
      hs_codes?: string[];
      received_hs_codes?: string[];
      shipped_hs_codes?: string[];
      combined_hs_codes?: string[];
      translation?: string;
      sort?: string;
      filters?: string[];
    }
  ): Promise<SayariResponse<ProjectEntity[]>> {
    return withRateLimit(async () => {
      try {
        // Use the correct entities endpoint
        const endpoint = `/v1/projects/${projectId}/entities`;
        
        const response = await sayariClient.get(endpoint, {
          params,
        });
        
        console.log('🔍 API Endpoint Full Response:', {
          endpoint,
          status: response.status,
          responseStructure: {
            dataKeys: Object.keys(response.data || {}),
            hasData: 'data' in response.data,
            dataType: Array.isArray(response.data?.data) ? 'array' : typeof response.data?.data,
            dataLength: response.data?.data?.length || 0
          },
          firstEntity: response.data?.data?.[0] ? {
            allKeys: Object.keys(response.data.data[0]),
            hasProjectEntityId: 'project_entity_id' in response.data.data[0],
            hasId: 'id' in response.data.data[0],
            hasStrength: 'strength' in response.data.data[0],
            strengthValue: response.data.data[0].strength,
            hasMatchStrength: 'match_strength' in response.data.data[0],
            matchStrengthValue: response.data.data[0].match_strength,
            hasRiskFactors: 'risk_factors' in response.data.data[0],
            riskFactorsValue: response.data.data[0].risk_factors,
            hasCreatedAt: 'created_at' in response.data.data[0],
            createdAtValue: response.data.data[0].created_at,
            sampleEntity: response.data.data[0]
          } : 'No entities'
        });
        
        return response.data;
      } catch (error) {
        console.error('Error in getProjectEntities:', error);
        throw error;
      }
    });
  }

  // Delete project entity
  async deleteProjectEntity(projectId: string, projectEntityId: string): Promise<void> {
    return withRateLimit(async () => {
      const response = await sayariClient.delete(`/v1/projects/${projectId}/entities/${projectEntityId}`);
      return response.data;
    });
  }
}

// Create singleton instance
export const projectService = new ProjectService();