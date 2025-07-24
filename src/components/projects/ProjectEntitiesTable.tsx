'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal,
  Building2,
  User,
  MapPin,
  Calendar,
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
  Eye,
  Trash2,
  ArrowUpDown
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
import type { SayariProjectEntity, SayariResponse } from '@/types/api.types';

interface ProjectEntitiesTableProps {
  projectId: string;
}

interface TableSort {
  column: string;
  direction: 'asc' | 'desc';
}

export function ProjectEntitiesTable({ projectId }: ProjectEntitiesTableProps) {
  const router = useRouter();
  const [entities, setEntities] = useState<SayariProjectEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<TableSort>({ column: 'updated', direction: 'desc' });
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [pagination, setPagination] = useState({
    hasNext: false,
    next: undefined as string | undefined,
  });

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

      const data: { success: boolean; data: SayariResponse<SayariProjectEntity[]> } = await response.json();
      
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
    fetchEntities();
  }, [projectId, sort, selectedEntityType, fetchEntities]);

  const filteredEntities = useMemo(() => {
    if (!searchQuery) return entities;
    
    return entities.filter(entity =>
      entity.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.summary?.countries?.some(country => country.toLowerCase().includes(searchQuery.toLowerCase())) ||
      entity.summary?.addresses?.some(address => address.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [entities, searchQuery]);

  const handleSort = (column: string) => {
    setSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getEntityTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'company':
        return <Building2 className="h-4 w-4" />;
      case 'person':
        return <User className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  const getRiskLevel = (entity: SayariProjectEntity) => {
    const riskCount = entity.summary?.risk ? Object.keys(entity.summary.risk).length : 0;
    if (riskCount === 0) return { level: 'low', color: 'bg-green-500/10 text-green-600 dark:bg-green-500/10 dark:text-green-400' };
    if (riskCount <= 2) return { level: 'medium', color: 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400' };
    return { level: 'high', color: 'bg-red-500/10 text-red-600 dark:bg-red-500/10 dark:text-red-400' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Project Entities</h1>
            <p className="text-muted-foreground">
              {filteredEntities.length} entities found
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
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
                  <TableHead className="w-[300px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('label')}
                      className="h-auto p-0 font-semibold"
                    >
                      Entity Name
                      <ArrowUpDown className="h-3 w-3 ml-2" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[200px]">Countries</TableHead>
                  <TableHead className="w-[120px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('trade_count')}
                      className="h-auto p-0 font-semibold"
                    >
                      Trade Activity
                      <ArrowUpDown className="h-3 w-3 ml-2" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px]">Risk Level</TableHead>
                  <TableHead className="w-[120px]">
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
                      <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredEntities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchQuery ? 'No entities match your search' : 'No entities found'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntities.map((entity) => {
                    const riskLevel = getRiskLevel(entity);
                    
                    return (
                      <TableRow key={entity.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getEntityTypeIcon(entity.summary?.type || 'company')}
                              <span className="font-medium">{entity.label}</span>
                            </div>
                            {entity.summary?.addresses?.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate max-w-[250px]">
                                  {entity.summary.addresses[0]}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            <div className="flex items-center">
                              {getEntityTypeIcon(entity.summary?.type || 'company')}
                              <span className="ml-1">{entity.summary?.type || 'Unknown'}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          {entity.summary?.countries && entity.summary.countries.length > 0 ? (
                            <CountryBadgeList 
                              countryCodes={entity.summary.countries}
                              size="sm"
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">No countries</span>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            {entity.summary?.trade_count?.received > 0 && (
                              <div className="flex items-center gap-1">
                                <TrendingDown className="h-3 w-3 text-blue-500" />
                                <span>{entity.summary.trade_count.received}</span>
                              </div>
                            )}
                            {entity.summary?.trade_count?.sent > 0 && (
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-green-500" />
                                <span>{entity.summary.trade_count.sent}</span>
                              </div>
                            )}
                            {(!entity.summary?.trade_count?.received || entity.summary.trade_count.received === 0) && 
                             (!entity.summary?.trade_count?.sent || entity.summary.trade_count.sent === 0) && (
                              <span className="text-muted-foreground">No activity</span>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge className={riskLevel.color}>
                            <Shield className="h-3 w-3 mr-1" />
                            {riskLevel.level}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(entity.updated)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Export Entity
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove from Project
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
    </div>
  );
}