import { useState, useEffect, useCallback } from 'react';
import type { SayariProject, SayariResponse } from '@/types/api.types';

interface UseProjectsOptions {
  archived?: boolean;
  limit?: number;
}

interface UseProjectsResult {
  projects: SayariProject[];
  loading: boolean;
  error: string | null;
  pagination: {
    hasNext: boolean;
    hasPrev: boolean;
    next?: string;
    prev?: string;
  };
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useProjects(options: UseProjectsOptions = {}): UseProjectsResult {
  const { archived = false, limit = 50 } = options;
  const [projects, setProjects] = useState<SayariProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    hasNext: false,
    hasPrev: false,
    next: undefined as string | undefined,
    prev: undefined as string | undefined,
  });

  const fetchProjects = useCallback(async (nextToken?: string, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      }
      setError(null);
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        archived: archived.toString(),
      });
      
      if (nextToken) {
        params.append('next', nextToken);
      }
      
      const response = await fetch(`/api/projects?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }
      
      const data: { success: boolean; data: SayariResponse<SayariProject[]> } = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch projects');
      }
      
      // Sort by most recently updated
      const fetchedProjects = data.data.data
        .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
      
      if (append) {
        setProjects(prev => [...prev, ...fetchedProjects]);
      } else {
        setProjects(fetchedProjects);
      }
      
      setPagination({
        hasNext: !!data.data.next,
        hasPrev: !!data.data.prev,
        next: data.data.next,
        prev: data.data.prev,
      });
      
      // If no projects available and not archived view, create a default local project for development
      if (fetchedProjects.length === 0 && !archived && !append) {
        const defaultProject: SayariProject = {
          id: 'default-local-project',
          label: 'Default Project (Local)',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          archived: false,
          counts: {
            entity: 0,
            graph: 0,
            record: 0,
            search: 0,
          },
        };
        setProjects([defaultProject]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error fetching projects:', err);
      
      // Provide fallback project on error (only for active projects)
      if (!archived && !append) {
        const fallbackProject: SayariProject = {
          id: 'fallback-project',
          label: 'Default Project (Fallback)',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          archived: false,
          counts: {
            entity: 0,
            graph: 0,
            record: 0,
            search: 0,
          },
        };
        setProjects([fallbackProject]);
      }
    } finally {
      setLoading(false);
    }
  }, [archived, limit]);

  const loadMore = useCallback(async () => {
    if (pagination.hasNext && pagination.next) {
      await fetchProjects(pagination.next, true);
    }
  }, [pagination.hasNext, pagination.next, fetchProjects]);

  const refetch = useCallback(async () => {
    // Reset pagination state when refetching
    setPagination({
      hasNext: false,
      hasPrev: false,
      next: undefined,
      prev: undefined,
    });
    await fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    pagination,
    refetch,
    loadMore,
  };
}