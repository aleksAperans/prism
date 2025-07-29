'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Settings,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  AlertOctagon,
  FileText,
  Search
} from 'lucide-react';
import { useGlobalRiskProfile } from '@/contexts/RiskProfileContext';
import { clientLoadYamlProfiles, type RiskProfile } from '@/lib/risk-profiles/yaml-loader';
import { toast } from 'sonner';

export function ActiveRiskProfileSettings() {
  const { activeProfile, isLoading, error, setActiveProfile } = useGlobalRiskProfile();
  const [availableProfiles, setAvailableProfiles] = useState<RiskProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const profiles = await clientLoadYamlProfiles();
        setAvailableProfiles(profiles);
      } catch (error) {
        console.error('Failed to load profiles:', error);
      }
    };

    loadProfiles();
  }, []);

  const handleSwitchProfile = async () => {
    if (!selectedProfileId) return;

    try {
      setIsSwitching(true);
      await setActiveProfile(selectedProfileId);
      setSelectedProfileId('');
      toast.success('Risk profile switched successfully');
    } catch (error) {
      console.error('Failed to switch profile:', error);
      toast.error('Failed to switch risk profile');
    } finally {
      setIsSwitching(false);
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
      
      toast.success('Profile downloaded successfully');
    } catch (error) {
      console.error('Failed to download profile:', error);
      toast.error('Failed to download profile');
    }
  };

  const handleDownloadProfileCSV = async (profile: RiskProfile) => {
    try {
      // Import risk factors data for additional details
      const riskFactorsData = await import('@/lib/risk-factors-data.json');
      
      // Create flattened CSV data
      const csvData = [];
      
      // Add profile metadata rows
      csvData.push(['Profile Information', '', '', '', '', '']);
      csvData.push(['Profile Name', profile.name, '', '', '', '']);
      csvData.push(['Description', profile.description, '', '', '', '']);
      csvData.push(['Profile ID', profile.id, '', '', '', '']);
      csvData.push(['Created By', profile.createdBy, '', '', '', '']);
      csvData.push(['Created At', profile.createdAt, '', '', '', '']);
      csvData.push(['Is Default', profile.isDefault ? 'Yes' : 'No', '', '', '', '']);
      csvData.push(['Risk Scoring Enabled', profile.riskScoringEnabled ? 'Yes' : 'No', '', '', '', '']);
      if (profile.riskScoringEnabled) {
        csvData.push(['Risk Threshold', profile.riskThreshold?.toString() || '5', '', '', '', '']);
      }
      csvData.push(['Total Enabled Factors', profile.enabledFactors?.length?.toString() || '0', '', '', '', '']);
      csvData.push(['', '', '', '', '', '']); // Empty row
      
      // Add risk factors header
      csvData.push(['Risk Factors Configuration', '', '', '', '', '']);
      csvData.push(['Factor ID', 'Factor Name', 'Category', 'Level', 'Type', 'Enabled', 'Risk Score', 'Description']);
      
      // Add all risk factors with their status
      Object.entries(riskFactorsData.default).forEach(([factorId, factorData]) => {
        const isEnabled = profile.enabledFactors?.includes(factorId) || false;
        const riskScore = profile.riskScores?.[factorId] || '';
        
        csvData.push([
          factorId,
          factorData.name,
          factorData.category.replace(/_/g, ' '),
          factorData.level,
          factorData.type,
          isEnabled ? 'Yes' : 'No',
          riskScore.toString(),
          factorData.description
        ]);
      });
      
      // Add categories summary
      csvData.push(['', '', '', '', '', '', '', '']); // Empty row
      csvData.push(['Categories Summary', '', '', '', '', '', '', '']);
      csvData.push(['Category', 'Enabled', 'Description', '', '', '', '', '']);
      
      if (profile.categories) {
        Object.entries(profile.categories).forEach(([categoryId, categoryData]) => {
          csvData.push([
            categoryData.name,
            categoryData.enabled ? 'Yes' : 'No',
            categoryData.description,
            '', '', '', '', ''
          ]);
        });
      }
      
      // Convert to CSV string
      const csvString = csvData
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      // Create and download file
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${profile.id}-configuration.csv`;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('CSV configuration downloaded successfully');
    } catch (error) {
      console.error('Failed to download CSV:', error);
      toast.error('Failed to download CSV configuration');
    }
  };

  const getProfileIcon = (profileId: string) => {
    if (profileId.includes('sanctions')) return <ShieldCheck className="h-4 w-4 text-blue-600" />;
    if (profileId.includes('forced-labor')) return <AlertOctagon className="h-4 w-4 text-orange-600" />;
    if (profileId.includes('core')) return <FileText className="h-4 w-4 text-green-600" />;
    return <Search className="h-4 w-4 text-purple-600" />;
  };


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 animate-pulse" />
            Loading Active Risk Profile...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load active risk profile: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Profile Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">Active Risk Profile</CardTitle>
            </div>
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Currently Applied
            </Badge>
          </div>
          <CardDescription>
            This risk profile is currently applied to all screening operations across the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeProfile ? (
            <>
              <div className="flex items-center gap-3 p-4 bg-background/50 rounded-lg border">
                <div className="p-2 rounded-lg bg-muted/50 flex items-center justify-center">
                  {getProfileIcon(activeProfile.id)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{activeProfile.name}</h3>
                  <p className="text-sm text-muted-foreground">{activeProfile.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>
                      {activeProfile.enabledFactors?.length || 0} risk factors enabled
                    </span>
                    {activeProfile.riskScoringEnabled && (
                      <span>Risk scoring enabled (threshold: {activeProfile.riskThreshold})</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Profile Actions</h4>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadProfile(activeProfile.id)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    YAML
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadProfileCSV(activeProfile)}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Switch to Different Profile</label>
                  <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose a different risk profile..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProfiles
                        .filter(profile => profile.id !== activeProfile.id)
                        .map((profile) => (
                        <SelectItem 
                          key={profile.id} 
                          value={profile.id}
                        >
                          <div className="flex items-center gap-2">
                            {getProfileIcon(profile.id)}
                            <div>
                              <div className="font-medium">{profile.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {profile.enabledFactors?.length || 0} factors • {profile.riskScoringEnabled ? `Scoring (${profile.riskThreshold})` : 'No scoring'}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProfileId && selectedProfileId !== activeProfile.id && (
                  <>
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium">This will immediately affect all screening operations</p>
                          <p className="text-muted-foreground mt-1">New screenings, batch operations, project views, and match details</p>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleSwitchProfile}
                      disabled={isSwitching}
                      className="w-full"
                    >
                      {isSwitching ? (
                        <>
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                          Switching...
                        </>
                      ) : (
                        <>
                          <Settings className="h-4 w-4 mr-2" />
                          Switch to {availableProfiles.find(p => p.id === selectedProfileId)?.name}
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No active risk profile found. Please contact your administrator.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>


    </div>
  );
}