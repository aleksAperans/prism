'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, Plus, Grid3X3, List, Calendar, Star, MoreHorizontal, Archive, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectsSidePanel } from '@/components/projects/ProjectsSidePanel';
import { useProjects } from '@/hooks/useProjects';
import { Skeleton } from '@/components/common/LoadingStates';

type ViewMode = 'cards' | 'list';

export default function ProjectsPage() {
  const router = useRouter();
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null);
  const { projects: activeProjects, loading, error, refetch: refetchActive } = useProjects({ archived: false });
  const { projects: archivedProjects, refetch: refetchArchived } = useProjects({ archived: true });

  // Load default project from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDefaultId = localStorage.getItem('defaultProjectId');
      setDefaultProjectId(savedDefaultId);
    }
  }, []);

  const handleProjectsChanged = async () => {
    // Refresh both active and archived projects lists
    await Promise.all([
      refetchActive(),
      refetchArchived()
    ]);
  };

  const handleSetDefault = (projectId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('defaultProjectId', projectId);
      setDefaultProjectId(projectId);
    }
  };

  const handleArchiveProject = async (projectId: string, currentlyArchived: boolean) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          archived: !currentlyArchived
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update project');
      }

      await handleProjectsChanged();
    } catch (error) {
      console.error('Failed to archive project:', error);
      // TODO: Show error toast
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
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

      // Clear from default if it was the default project
      if (defaultProjectId === projectId) {
        localStorage.removeItem('defaultProjectId');
        setDefaultProjectId(null);
      }

      await handleProjectsChanged();
    } catch (error) {
      console.error('Failed to delete project:', error);
      // TODO: Show error toast
    }
  };

  const renderProjectCards = (projects: typeof activeProjects, isArchived = false) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Card 
          key={project.id} 
          className={`${isArchived ? 'opacity-60 hover:opacity-80' : 'hover:shadow-md'} transition-all cursor-pointer`}
          onClick={() => router.push(`/projects/${project.id}/entities`)}
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <Folder className={`h-5 w-5 ${isArchived ? 'text-muted-foreground' : 'text-blue-600'}`} />
              <CardTitle className="text-lg">{project.label}</CardTitle>
            </div>
            <CardDescription>
              {isArchived && 'Archived • '}{project.counts?.entity || 0} entities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Project ID:</span>
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  {project.id}
                </code>
              </div>
              <div className="text-sm text-muted-foreground">
                Updated {new Date(project.updated).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Projects
          </h2>
          <p className="text-muted-foreground">
            Manage your screening projects and view results
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8 px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <Button onClick={() => setSidePanelOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Manage Projects
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-6">
        {loading ? (
          viewMode === 'cards' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Entities</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Project ID</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        ) : error ? (
          <div className="text-center py-12">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load projects</h3>
            <p className="text-muted-foreground mb-4">
              There was an error loading your projects. Please try again.
            </p>
            <Button onClick={() => setSidePanelOpen(true)}>
              Manage Projects
            </Button>
          </div>
        ) : activeProjects.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first project to organize and manage entity screenings together.
            </p>
            <Button onClick={() => setSidePanelOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>
        ) : 
          viewMode === 'cards' ? (
            <div className="space-y-8">
              {/* Active Projects */}
              {activeProjects.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Active Projects</h3>
                  {renderProjectCards(activeProjects, false)}
                </div>
              )}

              {/* Archived Projects */}
              {archivedProjects.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Archived Projects</h3>
                  {renderProjectCards(archivedProjects.slice(0, 3), true)}
                  {archivedProjects.length > 3 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      And {archivedProjects.length - 3} more archived projects...
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Combined List View */
            <div>
              <h3 className="text-lg font-semibold mb-4">All Projects</h3>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b bg-muted/50">
                        <TableHead className="w-[250px]">Project Name</TableHead>
                        <TableHead className="w-[80px]">Entities</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[80px]">Default</TableHead>
                        <TableHead className="w-[130px]">Project ID</TableHead>
                        <TableHead className="w-[110px]">Updated</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Active Projects First */}
                      {activeProjects.map((project) => (
                        <TableRow key={project.id} className="hover:bg-muted/50">
                          <TableCell 
                            className="cursor-pointer"
                            onClick={() => router.push(`/projects/${project.id}/entities`)}
                          >
                            <div className="flex items-center gap-3">
                              <Folder className="h-5 w-5 text-blue-600" />
                              <div>
                                <div className="font-medium">{project.label}</div>
                                <div className="text-sm text-muted-foreground">
                                  {project.counts?.entity || 0} entities
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{project.counts?.entity || 0}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">active</Badge>
                          </TableCell>
                          <TableCell>
                            {defaultProjectId === project.id ? (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
                              {project.id}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(project.updated).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}/entities`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Entities
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleSetDefault(project.id)}
                                  disabled={defaultProjectId === project.id}
                                >
                                  <Star className="h-4 w-4 mr-2" />
                                  {defaultProjectId === project.id ? 'Default Project' : 'Set as Default'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleArchiveProject(project.id, false)}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteProject(project.id, project.label)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Archived Projects */}
                      {archivedProjects.map((project) => (
                        <TableRow key={project.id} className="hover:bg-muted/50 opacity-60">
                          <TableCell 
                            className="cursor-pointer"
                            onClick={() => router.push(`/projects/${project.id}/entities`)}
                          >
                            <div className="flex items-center gap-3">
                              <Folder className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{project.label}</div>
                                <div className="text-sm text-muted-foreground">
                                  {project.counts?.entity || 0} entities
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{project.counts?.entity || 0}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">archived</Badge>
                          </TableCell>
                          <TableCell>
                            {defaultProjectId === project.id ? (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
                              {project.id}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(project.updated).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}/entities`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Entities
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleSetDefault(project.id)}
                                  disabled={defaultProjectId === project.id}
                                >
                                  <Star className="h-4 w-4 mr-2" />
                                  {defaultProjectId === project.id ? 'Default Project' : 'Set as Default'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleArchiveProject(project.id, true)}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Unarchive
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteProject(project.id, project.label)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )
        }
      </div>

      <ProjectsSidePanel 
        open={sidePanelOpen}
        onOpenChange={setSidePanelOpen}
        onProjectsChanged={handleProjectsChanged}
      />
    </div>
  );
}