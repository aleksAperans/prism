'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Search, Building, User, FolderOpen, AlertCircle, Plus, ChevronDown, ChevronRight, Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CountrySelect } from '@/components/common/CountrySelect';
import type { EntityFormData } from '@/types/app.types';
import { useProjects } from '@/hooks/useProjects';
import { clientLoadYamlProfiles, type RiskProfile } from '@/lib/risk-profiles/yaml-loader';

// Internal form data type with required type field
interface InternalFormData extends Omit<EntityFormData, 'type'> {
  type: 'company' | 'person';
  risk_profile: string;
}

const entityFormSchema = z.object({
  project_id: z.string().min(1, 'Please select a project'),
  name: z.string().min(1, 'Entity name is required'),
  type: z.enum(['company', 'person']),
  profile: z.enum(['corporate', 'suppliers', 'search', 'screen'], {
    message: 'Please select an analysis profile',
  }),
  risk_profile: z.string().min(1, 'Please select a risk profile'),
  identifier: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  date_of_birth: z.string().optional(),
});

interface EntityFormProps {
  onSubmit: (data: EntityFormData) => void;
  onFormReady?: (setter: (field: any, value: any) => void) => void;
  className?: string;
  isLoading?: boolean;
}

export function EntityForm({ onSubmit, onFormReady, className, isLoading = false }: EntityFormProps) {
  const [riskProfiles, setRiskProfiles] = useState<RiskProfile[]>([]);
  const [riskProfilesLoading, setRiskProfilesLoading] = useState(false);
  const [selectedRiskProfile, setSelectedRiskProfile] = useState<string>('default');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  
  const { projects, loading: projectsLoading, refetch } = useProjects();
  
  const form = useForm<InternalFormData>({
    resolver: zodResolver(entityFormSchema),
    defaultValues: {
      name: '',
      type: 'company',
      identifier: '',
      address: '',
      country: '',
      date_of_birth: '',
      project_id: '',
      risk_profile: 'default',
    },
  });

  React.useEffect(() => {
    const loadRiskProfiles = async () => {
      try {
        setRiskProfilesLoading(true);
        const profiles = await clientLoadYamlProfiles();
        setRiskProfiles(profiles);
        
        // Set default risk profile
        const defaultProfile = profiles.find(p => p.isDefault);
        if (defaultProfile) {
          setSelectedRiskProfile(defaultProfile.id);
          // We'll set the form value in a separate effect once form is ready
        }
      } catch (error) {
        console.error('Failed to load risk profiles:', error);
      } finally {
        setRiskProfilesLoading(false);
      }
    };
    
    loadRiskProfiles();
  }, []);

  // Sync selected risk profile with form
  React.useEffect(() => {
    if (selectedRiskProfile && form) {
      form.setValue('risk_profile', selectedRiskProfile);
    }
  }, [selectedRiskProfile, form]);

  // Set default project when projects load
  React.useEffect(() => {
    if (projects.length > 0 && !form.getValues('project_id')) {
      // Try to get the user's preferred default project
      const savedDefaultId = typeof window !== 'undefined' ? localStorage.getItem('defaultProjectId') : null;
      const defaultProject = savedDefaultId 
        ? projects.find(p => p.id === savedDefaultId) || projects[0]
        : projects[0]; // Use the first project (most recently updated) as fallback
      
      form.setValue('project_id', defaultProject.id);
    }
  }, [projects]);

  // Expose form setValue method when component mounts
  React.useEffect(() => {
    if (onFormReady) {
      onFormReady((field, value) => form.setValue(field, value));
    }
  }, [onFormReady]);

  const handleSubmit = (data: InternalFormData) => {
    // Clean up optional fields - remove empty strings
    const cleanedData: EntityFormData = {
      ...data,
      type: data.type,
      risk_profile: data.risk_profile,
      identifier: data.identifier || undefined,
      address: data.address || undefined,
      country: data.country || undefined,
      date_of_birth: data.date_of_birth || undefined,
    };
    
    onSubmit(cleanedData);
  };

  const watchedType = form.watch('type');

  const createTestProject = async () => {
    try {
      setIsCreatingProject(true);
      const response = await fetch('/api/projects/create-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        await refetch(); // Refresh projects list
        if (result.data?.id) {
          form.setValue('project_id', result.data.id);
        }
      }
    } catch (error) {
      console.error('Failed to create test project:', error);
    } finally {
      setIsCreatingProject(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Screen Entity</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Entity Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter company or person name" 
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Entity Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity Type</FormLabel>
                  <FormControl>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant={field.value === 'company' ? 'default' : 'outline'}
                        onClick={() => field.onChange('company')}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        <Building className="mr-2 h-4 w-4" />
                        Company
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === 'person' ? 'default' : 'outline'}
                        onClick={() => field.onChange('person')}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Person
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter physical address" 
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Country */}
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <CountrySelect
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                      placeholder="Search for a country..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Identifier */}
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Identifier</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Tax ID, Registration Number, LEI, etc." 
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date of Birth - only show for persons */}
            {watchedType === 'person' && (
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Separator */}
            <div className="border-t" />

            {/* Project Selection */}
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => {
                const selectedProject = projects.find(p => p.id === field.value);
                
                return (
                <FormItem>
                  <Collapsible 
                    open={projectSectionOpen} 
                    onOpenChange={setProjectSectionOpen}
                  >
                    <div className="flex items-center justify-between">
                      <FormLabel>Project *</FormLabel>
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto"
                        >
                          {projectSectionOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <div className="flex items-center text-sm">
                              {selectedProject ? (
                                <>
                                  <FolderOpen className="mr-1 h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">{selectedProject.label}</span>
                                  <span className="text-muted-foreground ml-1">({selectedProject.counts.entity} entities)</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">Select project</span>
                              )}
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </div>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={isLoading || projectsLoading}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                      <SelectContent>
                        {projectsError ? (
                          <div className="p-2 text-sm text-red-600 flex items-center">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Failed to load projects
                          </div>
                        ) : projectsLoading ? (
                          <div className="p-2 text-sm text-muted-foreground flex items-center">
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
                            Loading projects...
                          </div>
                        ) : projects.length === 0 ? (
                          <div className="p-2 space-y-2">
                            <div className="text-sm text-muted-foreground flex items-center">
                              <FolderOpen className="mr-2 h-4 w-4" />
                              No projects available
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={createTestProject}
                              disabled={isCreatingProject}
                            >
                              {isCreatingProject ? (
                                <>
                                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-primary" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <Plus className="mr-2 h-3 w-3" />
                                  Create Default Project
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center">
                                  <FolderOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{project.label}</span>
                                </div>
                                <span className="text-xs text-muted-foreground ml-4">
                                  {project.counts.entity} entities
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                        </Select>
                      </FormControl>
                    </CollapsibleContent>
                  </Collapsible>
                  <FormMessage />
                </FormItem>
                );
              }}
            />

            {/* Risk Profile Selection */}
            <FormField
              control={form.control}
              name="risk_profile"
              render={({ field }) => {
                const selectedProfile = riskProfiles.find(p => p.id === field.value);
                
                return (
                <FormItem>
                  <Collapsible 
                    open={riskProfileSectionOpen} 
                    onOpenChange={setRiskProfileSectionOpen}
                  >
                    <div className="flex items-center justify-between">
                      <FormLabel>Risk Profile *</FormLabel>
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto"
                        >
                          {riskProfileSectionOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <div className="flex items-center text-sm">
                              {selectedProfile ? (
                                <>
                                  <Shield className="mr-1 h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">{selectedProfile.name}</span>
                                  <span className="text-muted-foreground ml-1">({selectedProfile.enabledFactors.length} factors)</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">Select risk profile</span>
                              )}
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </div>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={isLoading || riskProfilesLoading}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select a risk profile" />
                          </SelectTrigger>
                          <SelectContent>
                            {riskProfilesLoading ? (
                              <div className="p-2 text-sm text-muted-foreground flex items-center">
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
                                Loading risk profiles...
                              </div>
                            ) : riskProfiles.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground flex items-center">
                                <Shield className="mr-2 h-4 w-4" />
                                No risk profiles available
                              </div>
                            ) : (
                              riskProfiles.map((profile) => (
                                <SelectItem key={profile.id} value={profile.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center">
                                      <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">{profile.name}</span>
                                      {profile.isDefault && (
                                        <span className="ml-1 text-xs bg-muted text-muted-foreground px-1 rounded">default</span>
                                      )}
                                    </div>
                                    <span className="text-xs text-muted-foreground ml-4">
                                      {profile.enabledFactors.length} factors
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </CollapsibleContent>
                  </Collapsible>
                  <FormMessage />
                </FormItem>
                );
              }}
            />

          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading}
          onClick={form.handleSubmit(handleSubmit)}
        >
          {isLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              Screening...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Screen Entity
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}