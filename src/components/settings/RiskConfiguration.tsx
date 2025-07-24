'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Save, RotateCcw, Eye, Shield } from 'lucide-react';
import riskFactorsData from '@/lib/risk-factors-data.json';
import { RiskLevelBadge } from '@/components/common/RiskLevelBadge';
import { TypeBadge } from '@/components/common/TypeBadge';

interface RiskFactor {
  id: string;
  name: string;
  category: string;
  level: string;
  type: string;
  description: string;
  enabled: boolean;
}

interface RiskProfile {
  id: string;
  name: string;
  description: string;
  enabledFactors: string[];
  isDefault: boolean;
  createdAt: string;
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
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDescription, setNewProfileDescription] = useState('');

  // Sample profiles for demonstration
  const [profiles] = useState<RiskProfile[]>([
    {
      id: 'default',
      name: 'Default Profile',
      description: 'All risk factors enabled',
      enabledFactors: Object.keys(riskFactorsData),
      isDefault: true,
      createdAt: '2024-01-01',
    },
    {
      id: 'high-risk-only',
      name: 'High Risk Only',
      description: 'Only Critical and High level risk factors',
      enabledFactors: Object.entries(riskFactorsData)
        .filter(([, data]) => ['Critical', 'High'].includes(data.level))
        .map(([id]) => id),
      isDefault: false,
      createdAt: '2024-01-15',
    },
  ]);

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
      
      return matchesSearch && matchesCategory && matchesLevel && matchesType;
    });
  }, [riskFactors, searchQuery, categoryFilter, levelFilter, typeFilter]);

  const handleToggleRiskFactor = (id: string) => {
    setRiskFactors(prev => 
      prev.map(factor => 
        factor.id === id ? { ...factor, enabled: !factor.enabled } : factor
      )
    );
  };

  const handleRestoreDefaults = () => {
    setRiskFactors(prev => 
      prev.map(factor => ({ ...factor, enabled: true }))
    );
  };

  const handleSaveProfile = () => {
    if (!newProfileName.trim()) return;
    
    const enabledFactors = riskFactors.filter(rf => rf.enabled).map(rf => rf.id);
    
    // In a real app, this would save to the backend
    console.log('Saving profile:', {
      name: newProfileName,
      description: newProfileDescription,
      enabledFactors,
    });
    
    setShowSaveDialog(false);
    setNewProfileName('');
    setNewProfileDescription('');
  };

  const handleLoadProfile = (profile: RiskProfile) => {
    setRiskFactors(prev => 
      prev.map(factor => ({
        ...factor,
        enabled: profile.enabledFactors.includes(factor.id)
      }))
    );
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Configuration
          </CardTitle>
          <CardDescription>
            Configure which risk factors are enabled for your analysis profiles.
            You have {enabledCount} of {totalCount} risk factors enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
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
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreDefaults}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Restore Defaults
              </Button>
              
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
            </div>
          </div>

          {/* Profiles Section */}
          <div className="border rounded-lg p-4 bg-muted/20">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Available Profiles
            </h4>
            <div className="flex flex-wrap gap-2">
              {profiles.map(profile => (
                <Button
                  key={profile.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadProfile(profile)}
                  className="flex items-center gap-2"
                >
                  {profile.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                  {profile.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Results Summary */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredRiskFactors.length} of {totalCount} risk factors
          </div>

          {/* Risk Factors Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Enable</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRiskFactors.map((factor) => (
                  <TableRow key={factor.id}>
                    <TableCell>
                      <Switch
                        checked={factor.enabled}
                        onCheckedChange={() => handleToggleRiskFactor(factor.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{factor.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getCategoryColor(factor.category)}>
                        {factor.category.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <RiskLevelBadge 
                        level={mapLevelToRiskLevel(factor.level)}
                        showCount={false}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <TypeBadge 
                        type={factor.type}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {factor.description}
                      </p>
                    </TableCell>
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