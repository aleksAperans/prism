'use client';

import { useState, useEffect, useCallback } from 'react';
import { History, Filter, Search, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScreeningResults } from '@/components/screening/ScreeningResults';
import { EmptyState } from '@/components/common/EmptyStates';
import { LoadingCard } from '@/components/common/LoadingStates';
import { ExportButton } from '@/components/common/ExportButton';

interface HistoricalResult {
  id: string;
  entity_name: string;
  entity_type: string;
  match_strength: string;
  risk_factors: Record<string, unknown>;
  created_at: string;
  sayari_entity_id?: string;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export default function HistoryPage() {
  const [results, setResults] = useState<HistoricalResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'company' | 'person'>('all');
  const [filterRisk, setFilterRisk] = useState<'all' | 'has_risks' | 'no_risks'>('all');
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 10,
    offset: 0,
    has_more: false,
  });

  const fetchResults = useCallback(async (offset = 0, resetResults = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(`/api/screening?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch results');
      }

      if (data.success) {
        const transformedResults = data.results.map((result: HistoricalResult) => ({
          ...result,
          sayari_url: result.sayari_entity_id 
            ? `https://sayari.com/entity/${result.sayari_entity_id}` 
            : undefined,
        }));

        if (resetResults) {
          setResults(transformedResults);
        } else {
          setResults(prev => [...prev, ...transformedResults]);
        }
        
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch analysis history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analysis history');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => {
    fetchResults(0, true);
  }, [fetchResults]);

  const handleLoadMore = () => {
    if (pagination.has_more) {
      fetchResults(pagination.offset + pagination.limit);
    }
  };

  const handleRefresh = () => {
    setPagination(prev => ({ ...prev, offset: 0 }));
    fetchResults(0, true);
  };

  const filteredResults = results.filter(result => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!result.entity_name.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Type filter
    if (filterType !== 'all' && result.entity_type !== filterType) {
      return false;
    }

    // Risk filter
    if (filterRisk !== 'all') {
      const hasRisks = Array.isArray(result.risk_factors) 
        ? result.risk_factors.length > 0 
        : Object.keys(result.risk_factors || {}).length > 0;
      
      if (filterRisk === 'has_risks' && !hasRisks) return false;
      if (filterRisk === 'no_risks' && hasRisks) return false;
    }

    return true;
  });


  if (isLoading && results.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Analysis History</h2>
          <p className="text-muted-foreground">View and manage your past analysis results</p>
        </div>
        <LoadingCard 
          title="Loading analysis history..."
          description="Retrieving your past analysis results"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Analysis History
          </h2>
          <p className="text-muted-foreground">
            View and manage your past analysis results
          </p>
        </div>
        
        {results.length > 0 && (
          <ExportButton data={filteredResults} filename="analysis-history" />
        )}
      </div>

      {/* Filters and Search */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filter Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search entity names..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Entity Type</label>
                <Select value={filterType} onValueChange={(value: 'all' | 'company' | 'person') => setFilterType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="company">Companies</SelectItem>
                    <SelectItem value="person">Persons</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Risk Status</label>
                <Select value={filterRisk} onValueChange={(value: 'all' | 'has_risks' | 'no_risks') => setFilterRisk(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Results</SelectItem>
                    <SelectItem value="has_risks">With Risk Factors</SelectItem>
                    <SelectItem value="no_risks">No Risk Factors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button onClick={handleRefresh} variant="outline" className="w-full">
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {results.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{pagination.total}</p>
                  <p className="text-sm text-muted-foreground">Total Screenings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {results.filter(r => {
                      const hasRisks = Array.isArray(r.risk_factors) 
                        ? r.risk_factors.length > 0 
                        : Object.keys(r.risk_factors || {}).length > 0;
                      return hasRisks;
                    }).length}
                  </p>
                  <p className="text-sm text-muted-foreground">With Risk Factors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {results.filter(r => {
                      const hasRisks = Array.isArray(r.risk_factors) 
                        ? r.risk_factors.length > 0 
                        : Object.keys(r.risk_factors || {}).length > 0;
                      return !hasRisks;
                    }).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Clean Results</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredResults.length}</p>
                  <p className="text-sm text-muted-foreground">Filtered Results</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      {error ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-red-600">
              <p className="font-medium">Error loading screening history</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button onClick={handleRefresh} variant="outline" className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredResults.length > 0 ? (
        <div className="space-y-4">
          <ScreeningResults 
            results={filteredResults} 
            onMatchRemoved={() => {
              // Always refresh all results to ensure consistency
              fetchResults(0, true);
            }}
          />
          
          {/* Load More Button */}
          {pagination.has_more && (
            <div className="flex justify-center">
              <Button 
                onClick={handleLoadMore} 
                variant="outline" 
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>Load More Results</span>
              </Button>
            </div>
          )}
        </div>
      ) : results.length === 0 ? (
        <EmptyState 
          icon={History}
          title="No screening history"
          description="You haven't performed any screenings yet. Start by screening an entity in the Ad Hoc Screening page."
        />
      ) : (
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">
              <p>No results match your current filters.</p>
              <Button 
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                  setFilterRisk('all');
                }} 
                variant="outline" 
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}