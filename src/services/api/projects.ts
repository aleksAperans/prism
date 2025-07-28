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
      console.log('📡 Calling Sayari API:', '/v1/projects', params);
      const response = await sayariClient.get<SayariResponse<SayariProject[]>>('/v1/projects', {
        params,
      });
      console.log('✅ Sayari API Response:', { 
        status: response.status,
        dataCount: response.data?.data?.length || 0,
        firstProject: response.data?.data?.[0]?.label || 'No projects'
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
      console.log('📡 Calling Sayari API for project entities:', projectId, params);
      const response = await sayariClient.get(`/v1/projects/${projectId}/entities`, {
        params,
      });
      console.log('✅ Sayari API Project Entities Response:', { 
        status: response.status,
        dataCount: response.data?.data?.length || 0,
        firstEntity: response.data?.data?.[0]?.label || 'No entities'
      });
      return response.data;
    });
  }
}

// Create singleton instance
export const projectService = new ProjectService();