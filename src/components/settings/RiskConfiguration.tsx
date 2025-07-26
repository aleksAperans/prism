'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Save, Eye, Shield, CheckSquare, Download, Trash2, ShieldHalf, FileCode, Star, ArrowBigDownDash } from 'lucide-react';
import riskFactorsData from '@/lib/risk-factors-data.json';
import { RiskLevelBadge } from '@/components/common/RiskLevelBadge';
import { TypeBadge } from '@/components/common/TypeBadge';
import { clientLoadYamlProfiles, clientSaveYamlProfile, type RiskProfile } from '@/lib/risk-profiles/yaml-loader';

interface RiskFactor {
  id: string;
  name: string;
  category: string;
  level: string;
  type: string;
  description: string;
  enabled: boolean;
}

export function RiskConfiguration() {
  // Transform the JSON data into our format
  const initialRiskFactors: RiskFactor[] = useMemo(() => {
    return Object.entries(riskFactorsData).map(([id, data]) => ({
      id,
      name: data.name,
      category: data.category,
      level: data.level,
      type: data.type,
      description: data.description,
      enabled: true, // Default all to enabled
    }));
  }, []);

  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>(initialRiskFactors);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [enabledFilter, setEnabledFilter] = useState('all');
  const [selectedFactors, setSelectedFactors] = useState<Set<string>>(new Set());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDescription, setNewProfileDescription] = useState('');
  const [profiles, setProfiles] = useState<RiskProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [riskScoringEnabled, setRiskScoringEnabled] = useState(false);
  const [riskThreshold, setRiskThreshold] = useState(5);
  const [riskScores, setRiskScores] = useState<Record<string, number>>({});


  // Get unique values for filters
  const categories = [...new Set(riskFactors.map(rf => rf.category))];
  const levels = [...new Set(riskFactors.map(rf => rf.level))];
  const types = [...new Set(riskFactors.map(rf => rf.type))];

  // Filter risk factors based on search and filters
  const filteredRiskFactors = useMemo(() => {
    return riskFactors.filter(factor => {
      const matchesSearch = factor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           factor.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || factor.category === categoryFilter;
      const matchesLevel = levelFilter === 'all' || factor.level === levelFilter;
      const matchesType = typeFilter === 'all' || factor.type === typeFilter;
      const matchesEnabled = enabledFilter === 'all' || 
                            (enabledFilter === 'enabled' && factor.enabled) ||
                            (enabledFilter === 'disabled' && !factor.enabled);
      
      return matchesSearch && matchesCategory && matchesLevel && matchesType && matchesEnabled;
    });
  }, [riskFactors, searchQuery, categoryFilter, levelFilter, typeFilter, enabledFilter]);

  const handleToggleRiskFactor = (id: string) => {
    setRiskFactors(prev => 
      prev.map(factor => 
        factor.id === id ? { ...factor, enabled: !factor.enabled } : factor
      )
    );
  };


  const handleSaveProfile = async () => {
    if (!newProfileName.trim()) return;
    
    const enabledFactors = riskFactors.filter(rf => rf.enabled).map(rf => rf.id);
    
    // Create categories object based on which categories have enabled factors
    const categories: Record<string, { name: string; description: string; enabled: boolean }> = {};
    const uniqueCategories = [...new Set(riskFactors.map(rf => rf.category))];
    
    uniqueCategories.forEach(category => {
      const categoryFactors = riskFactors.filter(rf => rf.category === category);
      const hasEnabledFactors = categoryFactors.some(rf => rf.enabled);
      
      categories[category] = {
        name: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: getCategoryDescription(category),
        enabled: hasEnabledFactors,
      };
    });
    
    try {
      await clientSaveYamlProfile({
        name: newProfileName,
        description: newProfileDescription,
        enabledFactors,
        isDefault: false,
        createdAt: new Date().toISOString(),
        createdBy: 'user',
        riskScoringEnabled,
        riskThreshold,
        riskScores,
        categories,
      });
      
      // Reload profiles
      const updatedProfiles = await clientLoadYamlProfiles();
      setProfiles(updatedProfiles);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      setShowSaveDialog(false);
      setNewProfileName('');
      setNewProfileDescription('');
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const handleLoadProfile = (profile: RiskProfile) => {
    setRiskFactors(prev => 
      prev.map(factor => ({
        ...factor,
        enabled: profile.enabledFactors.includes(factor.id)
      }))
    );
    setSelectedFactors(new Set()); // Clear selection when loading new profile
    setRiskScoringEnabled(profile.riskScoringEnabled || false);
    setRiskThreshold(profile.riskThreshold || 5);
    setRiskScores(profile.riskScores || {});
  };

  // Load YAML profiles on component mount
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const yamlProfiles = await clientLoadYamlProfiles();
        setProfiles(yamlProfiles);
        
        // Auto-load the default profile on initial load
        const defaultProfile = yamlProfiles.find(profile => profile.isDefault);
        if (defaultProfile) {
          handleLoadProfile(defaultProfile);
          // Set enabled filter to show only enabled factors
          setEnabledFilter('enabled');
        }
      } catch (error) {
        console.error('Failed to load YAML profiles:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfiles();
  }, []);

  const handleDeleteProfile = async (profileId: string) => {
    try {
      const response = await fetch(`/api/risk-profiles?id=${profileId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete profile');
      }
      
      // Reload profiles
      const updatedProfiles = await clientLoadYamlProfiles();
      setProfiles(updatedProfiles);
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  };

  const handleDownloadProfile = async (profileId: string) => {
    try {
      const response = await fetch(`/api/risk-profiles/download?id=${profileId}`);
      
      if (!response.ok) {
        throw new Error('Failed to download profile');
      }
      
      const yamlContent = await response.text();
      const blob = new Blob([yamlContent], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${profileId}.yaml`;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download profile:', error);
    }
  };

  const handleSetDefaultProfile = async (profileId: string) => {
    try {
      const response = await fetch(`/api/risk-profiles/set-default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profileId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to set default profile');
      }
      
      // Reload profiles to reflect the change
      const updatedProfiles = await clientLoadYamlProfiles();
      setProfiles(updatedProfiles);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to set default profile:', error);
    }
  };

  const handleSelectFactor = (factorId: string, selected: boolean) => {
    const newSelection = new Set(selectedFactors);
    if (selected) {
      newSelection.add(factorId);
    } else {
      newSelection.delete(factorId);
    }
    setSelectedFactors(newSelection);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const visibleFactorIds = filteredRiskFactors.map(factor => factor.id);
      setSelectedFactors(new Set(visibleFactorIds));
    } else {
      setSelectedFactors(new Set());
    }
  };


  const handleSelectNone = () => {
    setSelectedFactors(new Set());
  };

  const handleBulkEnable = () => {
    setRiskFactors(prev => 
      prev.map(factor => 
        selectedFactors.has(factor.id) ? { ...factor, enabled: true } : factor
      )
    );
    setSelectedFactors(new Set());
  };

  const handleBulkDisable = () => {
    setRiskFactors(prev => 
      prev.map(factor => 
        selectedFactors.has(factor.id) ? { ...factor, enabled: false } : factor
      )
    );
    setSelectedFactors(new Set());
  };


  const handleRiskScoreChange = (factorId: string, score: string) => {
    const numericScore = parseInt(score, 10);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 10) {
      // Remove invalid scores
      setRiskScores(prev => {
        const updated = { ...prev };
        delete updated[factorId];
        return updated;
      });
    } else {
      setRiskScores(prev => ({
        ...prev,
        [factorId]: numericScore
      }));
    }
  };

  const handleBulkSetRiskScore = (score: number) => {
    const updates: Record<string, number> = {};
    selectedFactors.forEach(factorId => {
      updates[factorId] = score;
    });
    setRiskScores(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleRiskThresholdChange = (value: string) => {
    const numericValue = parseInt(value, 10);
    if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 100) {
      setRiskThreshold(numericValue);
    }
  };

  // Calculate maximum possible risk score based on enabled factors with assigned scores
  const calculateMaxRiskScore = () => {
    return riskFactors
      .filter(factor => factor.enabled)
      .reduce((total, factor) => {
        const score = riskScores[factor.id] || 0;
        return total + score;
      }, 0);
  };

  const maxRiskScore = calculateMaxRiskScore();

  const getCategoryDescription = (category: string): string => {
    const descriptions: Record<string, string> = {
      'adverse_media': 'Negative news and media coverage',
      'sanctions': 'International sanctions lists',
      'political_exposure': 'Politically exposed persons',
      'export_controls': 'Export control lists and restrictions',
      'regulatory_action': 'Regulatory enforcement actions',
      'environmental_risk': 'Environmental violations and risks',
      'forced_labor': 'Forced labor and human trafficking',
      'relevant': 'Other relevant risk indicators',
    };
    return descriptions[category] || 'Risk factor category';
  };

  const mapLevelToRiskLevel = (level: string): 'critical' | 'high' | 'elevated' | 'other' => {
    switch (level) {
      case 'Critical': return 'critical';
      case 'High': return 'high';
      case 'Elevated': return 'elevated';
      case 'Standard': return 'other';
      default: return 'other';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'adverse_media': 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
      'sanctions': 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
      'political_exposure': 'bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
      'export_controls': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
      'regulatory_action': 'bg-pink-500/10 text-pink-600 border-pink-500/20 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20',
      'environmental_risk': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
      'forced_labor': 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
      'relevant': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20',
      'sanctions_and_export_control_lists': 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
    };
    return colors[category as keyof typeof colors] || 'bg-muted text-muted-foreground border-muted';
  };

  const enabledCount = riskFactors.filter(rf => rf.enabled).length;
  const totalCount = riskFactors.length;
  const selectedCount = selectedFactors.size;
  
  // Calculate select all checkbox state
  const visibleFactorIds = filteredRiskFactors.map(factor => factor.id);
  const allVisibleSelected = visibleFactorIds.length > 0 && visibleFactorIds.every(id => selectedFactors.has(id));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Configuration
            </CardTitle>
            <CardDescription>
              Loading risk configuration profiles...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <Alert>
          <CheckSquare className="h-4 w-4" />
          <AlertDescription>
            Risk profile saved successfully!
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Configuration
          </CardTitle>
          <CardDescription>
            Configure which risk factors are enabled for your analysis profiles.
            You have {enabledCount} of {totalCount} risk factors enabled.
            {selectedCount > 0 && ` (${selectedCount} selected)`}
            {riskScoringEnabled ? ` • Risk scoring enabled` : ` • Risk scoring disabled (toggle below to enable Points column)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profiles Section */}
          <div className="border rounded-lg p-4 bg-muted/20">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Available Profiles ({profiles.length})
            </h4>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {profiles.map(profile => (
                <div key={profile.id} className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {profile.createdBy}
                        </Badge>
                        {profile.isDefault && <Badge variant="secondary" className="text-xs">default</Badge>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLoadProfile(profile)}
                        className="flex items-center gap-1 h-auto p-1 justify-start hover:bg-transparent"
                      >
                        <span className="font-medium truncate">{profile.name}</span>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {profile.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {profile.enabledFactors.length} factors enabled
                      {profile.riskScoringEnabled && ` • Risk scoring (threshold: ${profile.riskThreshold || 5})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLoadProfile(profile)}
                      className="h-8 w-8 p-0"
                      title="Load profile"
                    >
                      <ArrowBigDownDash className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadProfile(profile.id)}
                      className="h-8 w-8 p-0"
                      title="Download YAML"
                    >
                      <FileCode className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefaultProfile(profile.id)}
                      className={`h-8 w-8 p-0 ${profile.isDefault ? 'text-yellow-500' : 'hover:text-yellow-500'}`}
                      title="Set as default profile"
                    >
                      <Star className={`h-3 w-3 ${profile.isDefault ? 'fill-current' : ''}`} />
                    </Button>
                    {profile.createdBy !== 'system' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProfile(profile.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Delete profile"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Scoring Toggle */}
          <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldHalf className="h-4 w-4" />
                  <span className="font-medium">Risk Scoring</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Assign point values (1-10) to risk factors for weighted analysis
                </p>
              </div>
              <Switch
                checked={riskScoringEnabled}
                onCheckedChange={setRiskScoringEnabled}
              />
            </div>
            
            {riskScoringEnabled && (
              <div className="flex items-center gap-4 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Label htmlFor="risk-threshold" className="text-sm font-medium">
                    Risk Threshold:
                  </Label>
                  <Input
                    id="risk-threshold"
                    type="number"
                    min="1"
                    max="100"
                    value={riskThreshold}
                    onChange={(e) => handleRiskThresholdChange(e.target.value)}
                    className="w-20 h-8"
                  />
                  <span className="text-sm text-muted-foreground">points</span>
                </div>
              </div>
            )}
          </div>

          {/* Controls Section */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="flex items-center gap-2 lg:flex-1 lg:max-w-md">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search risk factors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Save Profile and Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Save Profile Button */}
              <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save Profile
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Risk Profile</DialogTitle>
                    <DialogDescription>
                      Create a new risk profile with your current configuration.
                      {riskScoringEnabled && ` Risk scoring is enabled with ${Object.keys(riskScores).length} factors scored.`}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="profile-name">Profile Name</Label>
                      <Input
                        id="profile-name"
                        placeholder="Enter profile name..."
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="profile-description">Description (Optional)</Label>
                      <Input
                        id="profile-description"
                        placeholder="Enter profile description..."
                        value={newProfileDescription}
                        onChange={(e) => setNewProfileDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveProfile} disabled={!newProfileName.trim()}>
                      Save Profile
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Separator orientation="vertical" className="h-8" />

              {/* Filters */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {levels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={enabledFilter === 'enabled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEnabledFilter(enabledFilter === 'enabled' ? 'all' : 'enabled')}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View Enabled
              </Button>
            </div>
          </div>

          {/* Mass Selection Actions */}
          {selectedCount > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckSquare className="h-4 w-4" />
                {selectedCount} factor{selectedCount !== 1 ? 's' : ''} selected
              </div>
              <Separator orientation="vertical" className="h-6" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkEnable}
                className="h-7"
              >
                Enable Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDisable}
                className="h-7"
              >
                Disable Selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectNone}
                className="h-7"
              >
                Clear Selection
              </Button>
              {riskScoringEnabled && (
                <>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Set Score:</span>
                    {[1, 3, 5, 7, 10].map(score => (
                      <Button
                        key={score}
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkSetRiskScore(score)}
                        className="h-7 w-8 p-0"
                      >
                        {score}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}


          {/* Results Summary */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredRiskFactors.length} of {totalCount} risk factors ({enabledCount} enabled)
          </div>

          {/* Risk Factors Table */}
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all visible risk factors"
                    />
                  </TableHead>
                  <TableHead className="w-[70px]">Enable</TableHead>
                  <TableHead className="w-[180px]">Risk</TableHead>
                  <TableHead className="flex-1 min-w-[300px]">Description</TableHead>
                  <TableHead className="w-[110px]">Category</TableHead>
                  <TableHead className="w-[70px]">Level</TableHead>
                  <TableHead className="w-[60px]">Type</TableHead>
                  {riskScoringEnabled && (
                    <TableHead className="w-[70px]">Points</TableHead>
                  )}
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredRiskFactors.map((factor) => (
                <TableRow
                  key={factor.id}
                  className={`${
                    !factor.enabled 
                      ? 'opacity-75' 
                      : selectedFactors.has(factor.id) 
                        ? 'bg-muted/50' 
                        : ''
                  }`}
                  data-state={selectedFactors.has(factor.id) ? 'selected' : undefined}
                >
                  {/* Checkbox */}
                  <TableCell>
                    <Checkbox
                      checked={selectedFactors.has(factor.id)}
                      onCheckedChange={(checked) => handleSelectFactor(factor.id, checked as boolean)}
                    />
                  </TableCell>

                  {/* Enable/Disable Switch */}
                  <TableCell>
                    <Switch
                      checked={factor.enabled}
                      onCheckedChange={() => handleToggleRiskFactor(factor.id)}
                    />
                  </TableCell>

                  {/* Risk Name */}
                  <TableCell>
                    <div className={`text-sm ${!factor.enabled ? 'text-muted-foreground' : ''}`} style={{ fontWeight: 'normal' }}>
                      {factor.name}
                    </div>
                  </TableCell>

                  {/* Risk Description */}
                  <TableCell className="flex-1 min-w-[300px]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`text-sm cursor-help leading-relaxed ${!factor.enabled ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                            {factor.description.length > 120 
                              ? `${factor.description.substring(0, 120)}...` 
                              : factor.description
                            }
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md">
                          <p>{factor.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>

                  {/* Risk Category */}
                  <TableCell>
                    <div className={!factor.enabled ? 'opacity-80' : ''}>
                      <Badge variant="outline" className={`${getCategoryColor(factor.category)} text-xs`}>
                        {factor.category.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </TableCell>

                  {/* Risk Level */}
                  <TableCell>
                    <div className={!factor.enabled ? 'opacity-80' : ''}>
                      <RiskLevelBadge 
                        level={mapLevelToRiskLevel(factor.level)}
                        showCount={false}
                        size="sm"
                      />
                    </div>
                  </TableCell>

                  {/* Risk Type */}
                  <TableCell>
                    <div className={!factor.enabled ? 'opacity-80' : ''}>
                      <TypeBadge 
                        type={factor.type}
                        size="sm"
                      />
                    </div>
                  </TableCell>

                  {/* Risk Score (if enabled) */}
                  {riskScoringEnabled && (
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={riskScores[factor.id] || ''}
                        onChange={(e) => handleRiskScoreChange(factor.id, e.target.value)}
                        className="w-16 h-8 text-xs text-center"
                        disabled={!factor.enabled}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          </div>
        </CardContent>
      </Card>
    </div>
  );
}