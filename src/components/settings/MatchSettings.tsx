'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Building2, Package, FileSearch, CheckCircle } from 'lucide-react';

interface MatchProfile {
  value: 'corporate' | 'suppliers' | 'search' | 'screen';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const matchProfiles: MatchProfile[] = [
  {
    value: 'corporate',
    label: 'Corporate',
    description: 'Optimized for accurate entity attribute matching, ideal for business verification',
    icon: Building2,
  },
  {
    value: 'suppliers',
    label: 'Suppliers',
    description: 'Tailored for matching entities with trade data, suitable for supply chain use cases',
    icon: Package,
  },
  {
    value: 'search',
    label: 'Search',
    description: 'Mimics /search/entity behavior, best for name-only matches',
    icon: FileSearch,
  },
  {
    value: 'screen',
    label: 'Screen',
    description: 'Enhanced screening profile for comprehensive compliance checks',
    icon: Search,
  },
];

export function MatchSettings() {
  const [currentProfile, setCurrentProfile] = useState<string>('corporate');
  const [selectedProfile, setSelectedProfile] = useState<string>('corporate');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings/match-profile');
        if (response.ok) {
          const data = await response.json();
          setCurrentProfile(data.default_match_profile || 'corporate');
          setSelectedProfile(data.default_match_profile || 'corporate');
        }
      } catch (error) {
        console.error('Failed to load match profile settings:', error);
        toast.error('Failed to load match profile settings');
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const response = await fetch('/api/settings/match-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          default_match_profile: selectedProfile,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setCurrentProfile(selectedProfile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      toast.success('Match profile settings saved successfully');
    } catch (error) {
      console.error('Failed to save match profile settings:', error);
      toast.error('Failed to save match profile settings');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = currentProfile !== selectedProfile;
  const selectedProfileData = matchProfiles.find(p => p.value === selectedProfile);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Settings</CardTitle>
          <CardDescription>
            Loading match settings...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {saveSuccess && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Match profile settings saved successfully!
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Match Settings</CardTitle>
          <CardDescription>
            Configure the default search profile used for entity screening
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="match-profile">Default Match Profile</Label>
            <Select
              value={selectedProfile}
              onValueChange={setSelectedProfile}
              disabled={isSaving}
            >
              <SelectTrigger id="match-profile" className="w-full">
                <SelectValue placeholder="Select a match profile" />
              </SelectTrigger>
              <SelectContent>
                {matchProfiles.map((profile) => {
                  const Icon = profile.icon;
                  return (
                    <SelectItem key={profile.value} value={profile.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{profile.label}</span>
                        {profile.value === currentProfile && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedProfileData && (
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex items-start gap-3">
                <selectedProfileData.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">{selectedProfileData.label} Profile</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedProfileData.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            {hasChanges && (
              <Button
                variant="outline"
                onClick={() => setSelectedProfile(currentProfile)}
                disabled={isSaving}
              >
                Cancel
              </Button>
            )}
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              This setting determines the default search algorithm used when screening entities. 
              It applies to both single entity screening and batch uploads.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}