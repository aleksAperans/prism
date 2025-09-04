'use client';

import * as React from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  LayoutGrid,
  MoreHorizontal,
  Eye,
  Share2,
  FileDown,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CountryBadgeList } from '@/components/common/CountryBadge';
import { RiskScoreBadge } from '@/components/common/RiskScoreBadge';
import { EntityTypeBadge } from '@/components/common/EntityTypeBadge';
import { calculateEntityRiskScore } from '@/lib/risk-scoring-client';
import { useGlobalRiskProfile } from '@/contexts/RiskProfileContext';
import type { ProjectEntity } from '@/types/api.types';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

// Entity schema for the data table
export const entitySchema = z.object({
  project_entity_id: z.string(),
  project_id: z.string(),
  label: z.string(),
  strength: z.enum(['strong', 'partial', 'no_match', 'manual']),
  created_at: z.string(),
  countries: z.array(z.string()),
  risk_factors: z.array(z.object({ id: z.string() })),
  attributes: z.object({
    type: z.object({
      values: z.array(z.string()),
    }),
  }),
});

// type EntityData = z.infer<typeof entitySchema>;

interface DataTableProps {
  data: ProjectEntity[];
  projectId: string;
  onEntitySelect?: (entityIds: string[]) => void;
  onEntityDelete?: (entityId: string) => void;
}

// Create a separate component for the drag handle
function DragHandle({ disabled }: { disabled?: boolean }) {
  if (disabled) {
    return (
      <div className="p-1 opacity-30" title="Clear sorting to enable drag and drop">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="sr-only">Drag disabled when sorted</span>
      </div>
    );
  }

  return (
    <div className="cursor-grab p-1 hover:bg-muted/50 rounded active:cursor-grabbing">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </div>
  );
}

function DraggableRow({ row, isSorted }: { row: Row<ProjectEntity>; isSorted: boolean }) {
  const sortableId = row.original.project_entity_id;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    disabled: isSorted,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      data-state={row.getIsSelected() && "selected"}
      className={`relative hover:bg-muted/50 ${isDragging ? 'z-50 opacity-75' : 'z-0'}`}
      {...(isSorted ? {} : attributes)}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {cell.column.id === 'drag' && !isSorted ? (
            <div {...listeners}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
        </TableCell>
      ))}
    </TableRow>
  );
}

export function DataTable({ data, projectId, onEntitySelect, onEntityDelete }: DataTableProps) {
  const { activeProfile: riskProfile } = useGlobalRiskProfile();
  
  // Update entity data when props change
  React.useEffect(() => {
    setEntityData(data);
  }, [data]);
  
  const [entityData, setEntityData] = React.useState(() => data);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [matchConfidenceFilter, setMatchConfidenceFilter] = React.useState<string>('all');
  const [riskLevelFilter, setRiskLevelFilter] = React.useState<string>('all');

  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  // Helper functions
  const getEntityType = (entity: ProjectEntity): string => {
    // Check entity type from attributes
    if (entity.attributes?.type?.values?.length > 0) {
      const typeValue = entity.attributes.type.values[0];
      // Handle both object and string formats
      if (typeValue && typeof typeValue === 'object' && 'value' in typeValue) {
        return (typeValue as { value: string }).value;
      }
      return typeValue || 'company';
    }
    return 'company';
  };

  const getMatchConfidence = (entity: ProjectEntity) => {
    const strength = entity.strength;
    
    switch (strength) {
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

  const getRiskLevel = React.useCallback((entity: ProjectEntity) => {
    // Extract risk factors from the entity
    const riskFactors = entity.risk_factors || [];
    const riskFactorIds = riskFactors.map(rf => rf.id);
    
    if (!riskProfile || !riskProfile.riskScoringEnabled) {
      const riskCount = riskFactorIds.length;
      return {
        totalScore: riskCount,
        meetsThreshold: riskCount > 0,
        threshold: 0,
        triggeredRiskFactors: []
      };
    }

    return calculateEntityRiskScore(riskFactorIds, riskProfile);
  }, [riskProfile]);

  // Filter functions
  const filterByMatchConfidence = React.useCallback((data: ProjectEntity[]) => {
    if (matchConfidenceFilter === 'all') return data;
    
    return data.filter(entity => {
      const strength = entity.strength;
      
      switch (matchConfidenceFilter) {
        case 'high':
          return strength === 'strong';
        case 'medium':
          return strength === 'partial';
        case 'no_match':
          return strength === 'no_match' || !strength;
        default:
          return true;
      }
    });
  }, [matchConfidenceFilter]);

  const filterByRiskLevel = React.useCallback((data: ProjectEntity[]) => {
    if (riskLevelFilter === 'all') return data;
    
    return data.filter(entity => {
      const strength = entity.strength;
      const hasMatch = strength === 'strong' || strength === 'partial';
      
      if (!hasMatch) {
        // No match entities are categorized as "no_risk" since we can't assess risk
        return riskLevelFilter === 'no_risk';
      }
      
      const riskScore = getRiskLevel(entity);
      const hasRisk = riskScore.totalScore > 0;
      
      switch (riskLevelFilter) {
        case 'has_risk':
          return hasRisk;
        case 'no_risk':
          return !hasRisk;
        default:
          return true;
      }
    });
  }, [riskLevelFilter, getRiskLevel]);

  // Apply filters to entity data
  const filteredData = React.useMemo(() => {
    let filtered = [...entityData];
    filtered = filterByMatchConfidence(filtered);
    filtered = filterByRiskLevel(filtered);
    return filtered;
  }, [entityData, filterByMatchConfidence, filterByRiskLevel]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied successfully`);
    } catch {
      toast.error("Unable to copy to clipboard");
    }
  };


  // Define columns
  const columns: ColumnDef<ProjectEntity>[] = [
    {
      id: "drag",
      header: () => null,
      cell: () => (
        <DragHandle 
          disabled={sorting.length > 0}
        />
      ),
      size: 40,
    },
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Select ${row.original.label}`}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: "label",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Name
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        // Get the entity ID from API response
        const entityId = row.original.project_entity_id;
        const entityLabel = row.original.label || 'Unknown Entity';
        
        return (
          <Link 
            href={`/projects/${projectId}/entities/${entityId}?from=projects/${projectId}`}
            className="hover:underline"
          >
            <span className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              {entityLabel}
            </span>
          </Link>
        );
      },
      enableHiding: false,
      minSize: 200,
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Type
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const entityType = getEntityType(row.original);
        return <EntityTypeBadge type={entityType} />;
      },
      size: 100,
    },
    {
      accessorKey: "countries",
      header: "Countries",
      cell: ({ row }) => {
        // Get countries from entity
        const countries = row.original.countries || [];
        return countries.length > 0 ? (
          <CountryBadgeList 
            countryCodes={countries}
            size="sm"
          />
        ) : (
          <span className="text-muted-foreground text-xs">No countries</span>
        );
      },
      size: 150,
    },
    {
      accessorKey: "strength",
      header: "Match Confidence",
      cell: ({ row }) => {
        const matchConfidence = getMatchConfidence(row.original);
        return (
          <Badge variant="outline" className={matchConfidence.color}>
            {matchConfidence.label}
          </Badge>
        );
      },
      size: 140,
    },
    {
      accessorKey: "risk_score",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Risk Level
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const entity = row.original;
        const strength = entity.strength;
        
        // Only show risk badge for actual matches (high or medium confidence)
        if (strength === 'strong' || strength === 'partial') {
          const riskScore = getRiskLevel(entity);
          return (
            <RiskScoreBadge 
              riskScore={riskScore}
              size="sm"
              showThresholdExceeded={false}
            />
          );
        }
        
        // No match = no risk assessment
        return <span className="text-xs text-muted-foreground">-</span>;
      },
      sortingFn: (rowA, rowB) => {
        const entityA = rowA.original;
        const entityB = rowB.original;
        const strengthA = entityA.strength;
        const strengthB = entityB.strength;
        
        // No match entities should sort to the bottom
        const hasMatchA = strengthA === 'strong' || strengthA === 'partial';
        const hasMatchB = strengthB === 'strong' || strengthB === 'partial';
        
        if (!hasMatchA && !hasMatchB) return 0;
        if (!hasMatchA) return 1;
        if (!hasMatchB) return -1;
        
        // Both have matches, compare risk scores
        const riskA = getRiskLevel(entityA);
        const riskB = getRiskLevel(entityB);
        return riskA.totalScore - riskB.totalScore;
      },
      size: 120,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Updated
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        // Use the created_at field from the entity
        const dateValue = row.original.created_at;
        const date = dateValue ? new Date(dateValue) : null;
        const isValidDate = date && !isNaN(date.getTime());
        
        return (
          <div className="text-xs text-muted-foreground">
            {isValidDate 
              ? formatDistanceToNow(date, { addSuffix: true })
              : 'Unknown date'
            }
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const dateA = rowA.original.created_at;
        const dateB = rowB.original.created_at;
        
        const parsedDateA = dateA ? new Date(dateA).getTime() : 0;
        const parsedDateB = dateB ? new Date(dateB).getTime() : 0;
        
        return parsedDateA - parsedDateB;
      },
      size: 100,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/projects/${projectId}/entities/${row.original.project_entity_id}?from=projects/${projectId}`}>
                <Eye className="h-4 w-4 mr-2" />
                View Entity
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => copyToClipboard(
                `${window.location.origin}/projects/${projectId}/entities/${row.original.project_entity_id}`, 
                "Entity link"
              )}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Entity
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              toast.success("Entity export will begin shortly");
            }}>
              <FileDown className="h-4 w-4 mr-2" />
              Export Entity
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={async () => {
                const entityId = row.original.project_entity_id;
                const entityLabel = row.original.label;
                try {
                  const response = await fetch(`/api/projects/${projectId}/entities/${entityId}`, {
                    method: 'DELETE',
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                    console.error(`Failed to delete entity ${entityId}:`, errorData);
                    throw new Error(errorData.error || 'Failed to delete entity');
                  }
                  
                  // Update local data
                  setEntityData(prev => prev.filter(entity => 
                    entity.project_entity_id !== entityId
                  ));
                  
                  // Notify parent component
                  if (onEntityDelete) {
                    onEntityDelete(entityId);
                  }
                  
                  toast.success(`Entity "${entityLabel}" deleted successfully`);
                } catch (error) {
                  console.error('Delete entity error:', error);
                  toast.error(error instanceof Error ? error.message : 'Failed to delete entity');
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Entity
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 80,
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.project_entity_id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // Calculate dataIds after table is initialized
  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => table.getRowModel().rows.map((row) => row.original.project_entity_id) || [],
    [table.getRowModel().rows]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    // Don't allow drag and drop when table is sorted
    if (sorting.length > 0) {
      toast.info("Clear table sorting to enable drag and drop reordering");
      return;
    }
    
    if (active && over && active.id !== over.id) {
      setEntityData((data) => {
        const oldIndex = data.findIndex(entity => 
          entity.project_entity_id === active.id
        );
        const newIndex = data.findIndex(entity => 
          entity.project_entity_id === over.id
        );
        
        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(data, oldIndex, newIndex);
        }
        return data;
      });
    }
  }

  // Update selected entities callback
  React.useEffect(() => {
    if (onEntitySelect) {
      const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.project_entity_id);
      onEntitySelect(selectedIds);
    }
  }, [rowSelection, onEntitySelect, table]);

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Search entities..."
            value={(table.getColumn("label")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("label")?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
          
          {/* Match Confidence Filter */}
          <Select value={matchConfidenceFilter} onValueChange={setMatchConfidenceFilter}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder="Match confidence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All matches</SelectItem>
              <SelectItem value="high">High confidence</SelectItem>
              <SelectItem value="medium">Medium confidence</SelectItem>
              <SelectItem value="no_match">No match</SelectItem>
            </SelectContent>
          </Select>

          {/* Risk Level Filter */}
          <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue placeholder="Risk level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              <SelectItem value="has_risk">Has risk</SelectItem>
              <SelectItem value="no_risk">No risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          {(matchConfidenceFilter !== 'all' || riskLevelFilter !== 'all') && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setMatchConfidenceFilter('all');
                setRiskLevelFilter('all');
              }}
              className="text-muted-foreground"
            >
              Clear Filters
            </Button>
          )}
          {sorting.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSorting([])}
              className="text-muted-foreground"
            >
              Clear Sorting
            </Button>
          )}
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={async () => {
                const selectedRows = table.getFilteredSelectedRowModel().rows;
                const selectedIds = selectedRows.map(row => row.original.project_entity_id);
                
                if (selectedIds.length > 0) {
                  // Delete each entity individually using the API endpoint
                  const successfulDeletes: string[] = [];
                  const failedDeletes: string[] = [];
                  
                  // Process deletions with rate limiting
                  for (const entityId of selectedIds) {
                    try {
                      const response = await fetch(`/api/projects/${projectId}/entities/${entityId}`, {
                        method: 'DELETE',
                      });
                      
                      if (response.ok) {
                        successfulDeletes.push(entityId);
                      } else {
                        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                        console.error(`Failed to delete entity ${entityId}:`, errorData);
                        failedDeletes.push(entityId);
                      }
                    } catch (error) {
                      console.error(`Network error deleting entity ${entityId}:`, error);
                      failedDeletes.push(entityId);
                    }
                    
                    // Add a small delay between requests to avoid overwhelming the API
                    if (selectedIds.indexOf(entityId) < selectedIds.length - 1) {
                      await new Promise(resolve => setTimeout(resolve, 100));
                    }
                  }
                  
                  // Update the local data to remove successfully deleted entities
                  if (successfulDeletes.length > 0) {
                    setEntityData(prev => prev.filter(entity => 
                      !successfulDeletes.includes(entity.project_entity_id)
                    ));
                    
                    // Notify parent component if callback exists
                    if (onEntityDelete) {
                      successfulDeletes.forEach(id => onEntityDelete(id));
                    }
                  }
                  
                  // Clear selection
                  setRowSelection({});
                  
                  // Show appropriate toast messages
                  if (successfulDeletes.length > 0 && failedDeletes.length === 0) {
                    toast.success(`Successfully deleted ${successfulDeletes.length} entities`);
                  } else if (successfulDeletes.length > 0 && failedDeletes.length > 0) {
                    toast.warning(`Deleted ${successfulDeletes.length} entities, but ${failedDeletes.length} failed`);
                  } else if (failedDeletes.length > 0) {
                    toast.error(`Failed to delete ${failedDeletes.length} entities`);
                  }
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete {table.getFilteredSelectedRowModel().rows.length} Selected
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Columns
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
          id={sortableId}
          key={`dnd-${sorting.length > 0 ? 'sorted' : 'unsorted'}`}
        >
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b bg-muted/50">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                <SortableContext
                  items={dataIds}
                  strategy={verticalListSortingStrategy}
                  disabled={sorting.length > 0}
                >
                  {table.getRowModel().rows.map((row) => (
                    <DraggableRow 
                      key={row.id} 
                      row={row} 
                      isSorted={sorting.length > 0}
                    />
                  ))}
                </SortableContext>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No entities found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={String(table.getState().pagination.pageSize)} />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}