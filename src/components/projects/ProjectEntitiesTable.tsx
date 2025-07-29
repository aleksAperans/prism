'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  AlertTriangle,
  Plus,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBreadcrumb } from '@/components/providers/BreadcrumbProvider';
import type { SayariResponse, SayariProject, ProjectEntity } from '@/types/api.types';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { EntityForm } from '@/components/screening/EntityForm';
import { BatchUploadPanel } from '@/components/screening/BatchUploadPanel';
import { useBatchUpload } from '@/contexts/BatchUploadContext';
import type { EntityFormData } from '@/types/app.types';
import type { BatchJobStatus, BatchEntityResult } from '@/services/batch/types';
import { DataTable } from '@/components/common/data-table';

interface ProjectEntitiesTableProps {
  projectId: string;
}

export function ProjectEntitiesTable({ projectId }: ProjectEntitiesTableProps) {
  const { setData } = useBreadcrumb();
  const { activeJob, isMinimized, setActiveJob, setIsMinimized } = useBatchUpload();
  const searchParams = useSearchParams();
  const [entities, setEntities] = useState<ProjectEntity[]>([]);
  const [project, setProject] = useState<SayariProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<string | null>(null);
  const [screeningModalOpen, setScreeningModalOpen] = useState(false);
  const [batchUploadModalOpen, setBatchUploadModalOpen] = useState(false);
  const [isScreening, setIsScreening] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [lastFetchedJobId, setLastFetchedJobId] = useState<string | null>(null);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects?limit=50&archived=false`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      if (data.success && data.data?.data) {
        const foundProject = data.data.data.find((p: SayariProject) => p.id === projectId);
        setProject(foundProject || null);
        
        // Don't update breadcrumbs here to avoid re-render loops
      }
    } catch (err) {
      console.error('Failed to fetch project info:', err);
      // Set basic breadcrumb data even if project fetch fails
    }
  };

  const fetchEntities = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: '100', // Maximum allowed by Sayari API
      });

      const response = await fetch(`/api/projects/${projectId}/entities?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch entities: ${response.status}`);
      }

      const data: { success: boolean; data: SayariResponse<ProjectEntity[]> } = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch entities');
      }

      setEntities(data.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchEntities();
  }, [projectId]);

  // Update breadcrumbs when project loads (separate from fetchProject to avoid loops)
  useEffect(() => {
    if (project) {
      setData({
        projectName: project.label,
        projectId: projectId,
        screeningContext: screeningModalOpen ? 'screening-entity' : batchUploadModalOpen ? 'batch-upload' : undefined,
      });
    } else {
      // Set basic breadcrumb data when no project
      setData({
        projectId: projectId,
      });
    }
  }, [project?.label, projectId, screeningModalOpen, batchUploadModalOpen]);

  // Auto-refresh entities when batch upload completes
  useEffect(() => {
    if (activeJob?.status?.status === 'completed' && 
        activeJob.projectId === projectId && 
        activeJob.jobId !== lastFetchedJobId) {
      fetchEntities();
      setLastFetchedJobId(activeJob.jobId);
    }
  }, [activeJob?.status?.status, activeJob?.projectId, activeJob?.jobId, projectId, lastFetchedJobId]);

  // Check for openBatchModal query parameter to open modal when maximizing from global panel
  useEffect(() => {
    if (searchParams.get('openBatchModal') === 'true' && activeJob?.projectId === projectId) {
      setBatchUploadModalOpen(true);
      // Clear the query parameter by replacing the URL without it
      const url = new URL(window.location.href);
      url.searchParams.delete('openBatchModal');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, activeJob?.projectId, projectId]);

  // Memoize the job status change handler to prevent infinite loops
  const handleJobStatusChange = useCallback((jobData: { 
    jobId: string; 
    status: BatchJobStatus; 
    results: BatchEntityResult[] 
  } | null) => {
    if (jobData) {
      setActiveJob({
        jobId: jobData.jobId,
        projectId: projectId,
        status: jobData.status,
        results: jobData.results
      });
    } else {
      setActiveJob(null);
    }
  }, [projectId, setActiveJob]);



  const handleDeleteEntity = async (entityId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/entities/${entityId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove from local state
        setEntities(prev => prev.filter(e => e.project_entity_id !== entityId));
        setSelectedEntities(prev => prev.filter(id => id !== entityId));
        
        // Refresh entities list to get updated data from server
        await fetchEntities();
        
        toast.success("Entity has been removed from the project");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete entity');
      }
    } catch (err) {
      console.error('Delete entity error:', err);
      toast.error("Unable to remove entity from project");
    }
  };

  const handleScreeningSubmit = async (data: EntityFormData) => {
    try {
      setIsScreening(true);
      
      const response = await fetch('/api/screening', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Screening failed');
      }

      await response.json();
      
      toast.success('Entity screened successfully');
      setScreeningModalOpen(false);
      
      // Refresh the entities list to show the new entity
      await fetchEntities();
      
    } catch (error) {
      console.error('Screening error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to screen entity');
    } finally {
      setIsScreening(false);
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load entities</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => fetchEntities()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Loading...</h1>
            <p className="text-muted-foreground">Fetching entities...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {project?.label || 'Project'}
          </h1>
          <p className="text-muted-foreground">
            {entities.length} entities found
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedEntities.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedEntities.length} selected
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  toast.success(`Exporting ${selectedEntities.length} entities`);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Selected
              </Button>
            </>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setScreeningModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Screen Entity
          </Button>
          <Button 
            size="sm"
            onClick={() => setBatchUploadModalOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Batch Upload
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable 
        data={entities}
        projectId={projectId}
        onEntitySelect={setSelectedEntities}
        onEntityDelete={handleDeleteEntity}
      />


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {entityToDelete?.includes(',') ? 'Delete Multiple Entities' : 'Delete Entity'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {entityToDelete?.includes(',') 
                ? `Are you sure you want to remove ${entityToDelete.split(',').length} entities from this project? This action cannot be undone.`
                : 'Are you sure you want to remove this entity from the project? This action cannot be undone.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setEntityToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (entityToDelete) {
                  if (entityToDelete.includes(',')) {
                    // Bulk delete
                    const entityIds = entityToDelete.split(',');
                    const promises = entityIds.map(id => handleDeleteEntity(id));
                    await Promise.all(promises);
                    setSelectedEntities([]);
                  } else {
                    // Single delete
                    await handleDeleteEntity(entityToDelete);
                  }
                }
                setDeleteDialogOpen(false);
                setEntityToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {entityToDelete?.includes(',') ? 'Delete Entities' : 'Delete Entity'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Entity Screening Modal */}
      <Dialog open={screeningModalOpen} onOpenChange={setScreeningModalOpen}>
        <DialogContent className="max-w-3xl w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 pb-2">
            <DialogTitle>Screen New Entity</DialogTitle>
            <DialogDescription>
              Add and screen a new entity in this project using the active risk profile.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0">
            <div className="[&_.space-y-6]:space-y-4 [&_.card]:shadow-none [&_.card]:border-0">
              <EntityForm 
                onSubmit={handleScreeningSubmit}
                isLoading={isScreening}
                onFormReady={(setter) => {
                  // Pre-fill the project ID
                  setter('project_id', projectId);
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Upload Modal */}
      <Dialog 
        open={batchUploadModalOpen} 
        onOpenChange={(open) => {
          // Prevent closing if batch processing is active
          if (!open && isBatchProcessing) {
            toast.warning("Batch upload is still processing. Please wait for completion.");
            return;
          }
          setBatchUploadModalOpen(open);
        }}
      >
        <DialogContent 
          className="max-w-[99.5vw] w-[99.5vw] max-h-[99vh] overflow-hidden flex flex-col p-3"
          onPointerDownOutside={(e) => {
            // Prevent closing on outside click during processing
            if (isBatchProcessing) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing on escape key during processing
            if (isBatchProcessing) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="flex-shrink-0 pb-2">
            <DialogTitle>Batch Upload Entities</DialogTitle>
            <DialogDescription>
              Upload multiple entities via CSV file for screening in this project.
              {isBatchProcessing && (
                <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                  Processing in progress...
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto overflow-x-auto flex-1 min-h-0">
            {/* Maximize modal space utilization with comprehensive styling overrides */}
            <div className="[&_.space-y-6]:space-y-2 [&_.space-y-4]:space-y-2 [&_h1]:text-base [&_h2]:text-sm [&_.card]:shadow-none [&_.card]:border-0 [&_table]:min-w-full [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap [&_.text-2xl]:text-lg [&_.text-xl]:text-base [&_.text-lg]:text-sm [&_.p-4]:p-2 [&_.p-3]:p-2 [&_.gap-4]:gap-2 [&_.gap-3]:gap-2">
              <BatchUploadPanel 
                onProcessingChange={setIsBatchProcessing}
                projectIdOverride={projectId}
                onJobStatusChange={handleJobStatusChange}
                onMinimize={() => {
                  setIsMinimized(true);
                  setBatchUploadModalOpen(false);
                }}
                onNavigateToProject={() => {
                  setBatchUploadModalOpen(false);
                  // Only fetch if we haven't already fetched for this completed job
                  if (activeJob?.status?.status === 'completed' && 
                      activeJob.jobId !== lastFetchedJobId) {
                    fetchEntities();
                    setLastFetchedJobId(activeJob.jobId);
                  }
                }}
                existingJobId={activeJob?.projectId === projectId ? activeJob.jobId : undefined}
                existingJobStatus={activeJob?.projectId === projectId ? activeJob.status : undefined}
                existingResults={activeJob?.projectId === projectId ? activeJob.results : undefined}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}