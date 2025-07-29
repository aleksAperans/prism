'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal,
  AlertTriangle,
  Eye,
  Trash2,
  ArrowUpDown,
  Share2,
  FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/common/LoadingStates';
import { CountryBadgeList } from '@/components/common/CountryBadge';
import { RiskScoreBadge } from '@/components/common/RiskScoreBadge';
import { calculateEntityRiskScore, clientLoadDefaultRiskProfile } from '@/lib/risk-scoring-client';
import type { RiskProfile } from '@/lib/risk-profiles/yaml-loader';
import { EntityTypeBadge } from '@/components/common/EntityTypeBadge';
import { useBreadcrumb } from '@/components/providers/BreadcrumbProvider';
import type { SayariResponse, SayariProject, ProjectEntity } from '@/types/api.types';
import Link from 'next/link';
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
import { Checkbox } from '@/components/ui/checkbox';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';

interface ProjectEntitiesTableProps {
  projectId: string;
}

interface TableSort {
  column: string;
  direction: 'asc' | 'desc';
}

// Extended ProjectEntity type to include matches from API response
// The API response structure matches ProjectEntity type
type ProjectEntityData = ProjectEntity;

export function ProjectEntitiesTable({ projectId }: ProjectEntitiesTableProps) {
  const { setData } = useBreadcrumb();
  const searchParams = useSearchParams();
  const [entities, setEntities] = useState<ProjectEntity[]>([]);
  const [project, setProject] = useState<SayariProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<TableSort>({ column: 'updated', direction: 'desc' });
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    hasNext: false,
    next: undefined as string | undefined,
  });

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects?limit=50&archived=false`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      if (data.success && data.data?.data) {
        const foundProject = data.data.data.find((p: SayariProject) => p.id === projectId);
        setProject(foundProject || null);
        
        // Update breadcrumb context with project data
        setData({
          projectName: foundProject?.label,
          projectId: projectId,
        });
      }
    } catch (err) {
      console.error('Failed to fetch project info:', err);
      // Set basic breadcrumb data even if project fetch fails
      setData({
        projectId: projectId,
      });
    }
  }, [projectId, setData]);

  const fetchEntities = useCallback(async (nextToken?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: '50',
        sort: `${sort.direction === 'desc' ? '-' : ''}${sort.column}`,
      });

      if (nextToken) {
        params.append('next', nextToken);
      }

      if (selectedEntityType !== 'all') {
        params.append('entity_types', selectedEntityType);
      }

      const response = await fetch(`/api/projects/${projectId}/entities?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch entities: ${response.status}`);
      }

      const data: { success: boolean; data: SayariResponse<ProjectEntity[]> } = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch entities');
      }

      if (nextToken) {
        setEntities(prev => [...prev, ...data.data.data]);
      } else {
        setEntities(data.data.data);
      }

      setPagination({
        hasNext: !!data.data.next,
        next: data.data.next,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entities');
    } finally {
      setLoading(false);
    }
  }, [projectId, sort, selectedEntityType]);

  useEffect(() => {
    fetchProject();
    fetchEntities();
    
    // Load risk profile - use URL param if provided, otherwise default
    const loadRiskProfile = async () => {
      const riskProfileParam = searchParams.get('riskProfile');
      
      if (riskProfileParam) {
        try {
          const response = await fetch(`/api/risk-profiles/${riskProfileParam}`);
          if (response.ok) {
            const data = await response.json();
            setRiskProfile(data.profile);
            console.log('✅ Loaded risk profile from URL:', data.profile.name);
            return;
          }
        } catch (error) {
          console.warn('Failed to load risk profile from URL param:', error);
        }
      }
      
      // Fallback to default profile
      const profile = await clientLoadDefaultRiskProfile();
      setRiskProfile(profile);
      console.log('✅ Loaded default risk profile:', profile?.name);
    };
    
    loadRiskProfile();
  }, [projectId, sort, selectedEntityType, fetchEntities, fetchProject, searchParams]);

  const filteredEntities = useMemo(() => {
    if (!searchQuery) return entities;
    
    return entities.filter(entity => {
      const label = entity.label || '';
      const countries = entity.countries || [];
      
      return label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        countries.some((country: string) => country.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [entities, searchQuery]);

  // Helper functions to safely access entity properties regardless of format
  const getEntityLabel = (entity: ProjectEntityData): string => {
    // Always read from root level label
    return entity.label || '';
  };

  const getEntityId = (entity: ProjectEntityData): string => {
    // ProjectEntity uses project_entity_id
    return entity.project_entity_id;
  };

  const getEntityType = (entity: ProjectEntityData): string => {
    // Get type from attributes
    if (entity.attributes?.type?.values?.[0]) {
      return entity.attributes.type.values[0];
    }
    return 'company'; // Default to company if not specified
  };

  const getEntityCountries = (entity: ProjectEntityData): string[] => {
    // Only read from root level countries array
    return entity.countries || [];
  };

  const getEntityUpdated = (entity: ProjectEntityData): string => {
    // Use created_at field from ProjectEntity
    return entity.created_at || new Date().toISOString();
  };

  const handleSort = (column: string) => {
    setSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleEntitySelection = (entityId: string) => {
    setSelectedEntities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entityId)) {
        newSet.delete(entityId);
      } else {
        newSet.add(entityId);
      }
      return newSet;
    });
  };

  const toggleAllEntities = () => {
    if (selectedEntities.size === filteredEntities.length) {
      setSelectedEntities(new Set());
    } else {
      setSelectedEntities(new Set(filteredEntities.map(e => getEntityId(e))));
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied successfully`);
    } catch (err) {
      toast.error("Unable to copy to clipboard");
    }
  };

  const handleDeleteEntity = async (entityId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/entities/${entityId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setEntities(prev => prev.filter(e => getEntityId(e) !== entityId));
        setSelectedEntities(prev => {
          const newSet = new Set(prev);
          newSet.delete(entityId);
          return newSet;
        });
        toast.success("Entity has been removed from the project");
      } else {
        throw new Error('Failed to delete entity');
      }
    } catch (err) {
      toast.error("Unable to remove entity from project");
    }
  };

  const getMatchConfidence = (entity: ProjectEntityData) => {
    // Check for strength field
    switch (entity.strength) {
      case 'strong':
        return { label: 'high confidence', color: 'bg-green-500/10 text-green-600 dark:bg-green-500/10 dark:text-green-400' };
      case 'partial':
        return { label: 'medium confidence', color: 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400' };
      case 'manual':
        return { label: 'manual match', color: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' };
      case 'no_match':
      default:
        return { label: 'no match', color: 'bg-muted text-muted-foreground' };
    }
  };

  const getRiskLevel = (entity: ProjectEntityData) => {
    if (!riskProfile || !riskProfile.riskScoringEnabled) {
      // Fallback to simple count if no risk profile
      const riskCount = entity.risk_factors?.length || 0;
      if (riskCount === 0) return { level: 'low', count: 0, threshold: 0, color: 'bg-green-500/10 text-green-600 dark:bg-green-500/10 dark:text-green-400' };
      if (riskCount <= 2) return { level: 'medium', count: riskCount, threshold: 0, color: 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400' };
      return { level: 'high', count: riskCount, threshold: 0, color: 'bg-red-500/10 text-red-600 dark:bg-red-500/10 dark:text-red-400' };
    }

    // Calculate actual risk score using risk profile
    const riskFactorIds = entity.risk_factors?.map(rf => rf.id) || [];
    const riskScore = calculateEntityRiskScore(riskFactorIds, riskProfile);
    
    const meetsThreshold = riskScore.meetsThreshold;
    const color = meetsThreshold 
      ? 'bg-red-500/10 text-red-600 dark:bg-red-500/10 dark:text-red-400'
      : 'bg-green-500/10 text-green-600 dark:bg-green-500/10 dark:text-green-400';
    
    return {
      level: meetsThreshold ? 'high' : 'low',
      count: riskScore.totalScore,
      threshold: riskScore.threshold,
      color
    };
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {project?.label || 'Project'}
          </h1>
          <p className="text-muted-foreground">
            {filteredEntities.length} entities found
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedEntities.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedEntities.size} selected
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  toast.success(`Exporting ${selectedEntities.size} entities`);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Selected
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  if (selectedEntities.size > 0) {
                    setEntityToDelete(Array.from(selectedEntities).join(','));
                    setDeleteDialogOpen(true);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search entities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="company">Companies</SelectItem>
                <SelectItem value="person">People</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/50">
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedEntities.size === filteredEntities.length && filteredEntities.length > 0}
                      onCheckedChange={toggleAllEntities}
                      aria-label="Select all entities"
                    />
                  </TableHead>
                  <TableHead className="w-[300px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('label')}
                      className="h-auto p-0 font-semibold"
                    >
                      Name
                      <ArrowUpDown className="h-3 w-3 ml-2" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px] hidden md:table-cell">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('type')}
                      className="h-auto p-0 font-semibold"
                    >
                      Type
                      <ArrowUpDown className="h-3 w-3 ml-2" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[150px] hidden lg:table-cell">Countries</TableHead>
                  <TableHead className="w-[140px] hidden md:table-cell">Match Confidence</TableHead>
                  <TableHead className="w-[120px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('risk_score')}
                      className="h-auto p-0 font-semibold"
                    >
                      Risk Level
                      <ArrowUpDown className="h-3 w-3 ml-2" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px] hidden lg:table-cell">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('updated')}
                      className="h-auto p-0 font-semibold"
                    >
                      Updated
                      <ArrowUpDown className="h-3 w-3 ml-2" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && entities.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredEntities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchQuery ? 'No entities match your search' : 'No entities found'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntities.map((entity) => {
                    const matchConfidence = getMatchConfidence(entity);
                    const riskLevel = getRiskLevel(entity);
                    const entityId = getEntityId(entity);
                    const entityLabel = getEntityLabel(entity);
                    const entityType = getEntityType(entity);
                    const entityCountries = getEntityCountries(entity);
                    const entityUpdated = getEntityUpdated(entity);
                    const isSelected = selectedEntities.has(entityId);
                    
                    return (
                      <TableRow key={entityId} className="hover:bg-muted/50">
                        {/* Checkbox */}
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleEntitySelection(entityId)}
                            aria-label={`Select ${entityLabel}`}
                          />
                        </TableCell>
                        
                        {/* Name - Hyperlink to profile */}
                        <TableCell>
                          <Link 
                            href={`/projects/${projectId}/entities/${entityId}?from=projects/${projectId}`}
                            className="hover:underline"
                          >
                            <span className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                              {entityLabel}
                            </span>
                          </Link>
                        </TableCell>
                        
                        {/* Type */}
                        <TableCell className="hidden md:table-cell">
                          <EntityTypeBadge type={entityType} />
                        </TableCell>
                        
                        {/* Countries */}
                        <TableCell className="hidden lg:table-cell">
                          {entityCountries.length > 0 ? (
                            <CountryBadgeList 
                              countryCodes={entityCountries}
                              size="sm"
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">No countries</span>
                          )}
                        </TableCell>
                        
                        {/* Match Confidence */}
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className={matchConfidence.color}>
                            {matchConfidence.label}
                          </Badge>
                        </TableCell>
                        
                        {/* Risk Level */}
                        <TableCell>
                          <RiskScoreBadge 
                            riskScore={{
                              totalScore: riskLevel.count || 0,
                              meetsThreshold: riskLevel.level === 'high',
                              threshold: riskLevel.threshold || 0,
                              triggeredRiskFactors: []
                            }}
                            size="sm"
                            showThresholdExceeded={false}
                          />
                        </TableCell>
                        
                        {/* Updated */}
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(entityUpdated), { addSuffix: true })}
                          </div>
                        </TableCell>
                        
                        {/* Actions */}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <Link href={`/projects/${projectId}/entities/${entityId}?from=projects/${projectId}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Entity
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => copyToClipboard(`${window.location.origin}/projects/${projectId}/entities/${entityId}`, "Entity link")}
                              >
                                <Share2 className="h-4 w-4 mr-2" />
                                Share Entity
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                // TODO: Implement export functionality
                                toast.success("Entity export will begin shortly");
                              }}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Export Entity
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setEntityToDelete(entityId);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Entity
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Load More */}
          {pagination.hasNext && !loading && (
            <div className="p-4 border-t text-center">
              <Button 
                variant="outline" 
                onClick={() => fetchEntities(pagination.next)}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More Entities'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
                    setSelectedEntities(new Set());
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
    </div>
  );
}