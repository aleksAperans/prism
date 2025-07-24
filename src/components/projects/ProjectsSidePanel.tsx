'use client';

import { useState, useEffect } from 'react';
import { Folder, Plus, Archive, Trash2, MoreHorizontal, Users, Star } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProjects } from '@/hooks/useProjects';
import { Skeleton } from '@/components/common/LoadingStates';
import { CreateProjectModal } from './CreateProjectModal';
import type { SayariProject } from '@/types/api.types';

interface ProjectsSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectsChanged?: () => void;
}

// Default project localStorage utilities
const getDefaultProjectId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('defaultProjectId');
};

const setDefaultProjectId = (projectId: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('defaultProjectId', projectId);
};

export function ProjectsSidePanel({ open, onOpenChange, onProjectsChanged }: ProjectsSidePanelProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [defaultProjectId, setDefaultProjectIdState] = useState<string | null>(null);
  
  const { projects, loading, error, pagination, refetch, loadMore } = useProjects({
    archived: showArchived,
    limit: 20
  });

  // Load default project from localStorage on mount
  useEffect(() => {
    setDefaultProjectIdState(getDefaultProjectId());
  }, []);

  const handleSetDefault = (projectId: string) => {
    setDefaultProjectId(projectId);
    setDefaultProjectIdState(projectId);
  };

  const handleProjectCreated = async () => {
    setShowCreateModal(false);
    
    // Add a delay to ensure the API has time to propagate the new project
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Refresh the side panel projects list
    await refetch();
    
    // Notify parent component to refresh its projects lists
    if (onProjectsChanged) {
      onProjectsChanged();
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    try {
      const project = projects?.find(p => p.id === projectId);
      if (!project) return;

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          archived: !project.archived
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update project');
      }

      // Add a small delay and refresh both lists
      await new Promise(resolve => setTimeout(resolve, 500));
      await refetch();
      if (onProjectsChanged) {
        onProjectsChanged();
      }
    } catch (error) {
      console.error('Failed to archive project:', error);
      // TODO: Show error toast
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete project');
      }

      // Add a small delay and refresh both lists
      await new Promise(resolve => setTimeout(resolve, 500));
      await refetch();
      if (onProjectsChanged) {
        onProjectsChanged();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      // TODO: Show error toast
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Projects
            </SheetTitle>
            <SheetDescription>
              Manage your screening projects and organize entity screenings
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 py-4">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="flex-1"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="h-4 w-4 mr-2" />
                {showArchived ? 'Active' : 'Archived'}
              </Button>
            </div>

            {/* Projects List */}
            <div className="flex-1 space-y-3 overflow-y-auto">
              {loading ? (
                <Skeleton className="h-24 w-full" />
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    Failed to load projects
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetch()}
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {showArchived ? 'No archived projects' : 'No active projects'}
                  </p>
                  {!showArchived && (
                    <Button 
                      size="sm" 
                      onClick={() => setShowCreateModal(true)}
                    >
                      Create your first project
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onArchive={handleArchiveProject}
                      onDelete={handleDeleteProject}
                      isDefault={project.id === defaultProjectId}
                      onSetDefault={handleSetDefault}
                    />
                  ))}
                  
                  {/* Load More Button */}
                  {pagination.hasNext && (
                    <div className="text-center pt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={loadMore}
                        disabled={loading}
                      >
                        {loading ? 'Loading...' : 'Load More'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <CreateProjectModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onProjectCreated={handleProjectCreated}
      />
    </>
  );
}

interface ProjectCardProps {
  project: SayariProject;
  onArchive: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  isDefault: boolean;
  onSetDefault: (projectId: string) => void;
}

function ProjectCard({ project, onArchive, onDelete, isDefault, onSetDefault }: ProjectCardProps) {
  const entityCount = project.counts?.entity || 0;
  const memberCount = (project as unknown as { members?: Array<unknown> }).members?.length || 0;
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Folder className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-medium truncate flex items-center gap-2">
              {project.label}
              {isDefault && (
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              )}
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.open(`/projects/${project.id}/entities`, '_blank')}>
                View Entities
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log('View project:', project.id)}>
                View Details
              </DropdownMenuItem>
              {!project.archived && (
                <DropdownMenuItem 
                  onClick={() => onSetDefault(project.id)}
                  disabled={isDefault}
                >
                  <Star className="h-4 w-4 mr-2" />
                  {isDefault ? 'Default project' : 'Set as default'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onArchive(project.id)}>
                <Archive className="h-4 w-4 mr-2" />
                {project.archived ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(project.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {project.archived && (
          <Badge variant="secondary" className="w-fit">
            Archived
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Folder className="h-3 w-3" />
              <span>{entityCount} entities</span>
            </div>
            {memberCount > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{memberCount} members</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">ID: </span>
            <code className="font-mono text-xs bg-muted px-1 rounded">
              {project.id}
            </code>
          </div>
          <div className="text-xs text-muted-foreground">
            Updated {new Date(project.updated).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}