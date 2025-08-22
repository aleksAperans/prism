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
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import type { EntityFormData } from '@/types/app.types';
import { useProjects } from '@/hooks/useProjects';
import { useGlobalRiskProfile } from '@/contexts/RiskProfileContext';
import { toast } from 'sonner';

const entityFormSchema = z.object({
  project_id: z.string().min(1, 'Please select a project'),
  name: z.string().min(1, 'Entity name is required'),
  type: z.enum(['company', 'person']),
  risk_profile: z.string(),
  identifier: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  date_of_birth: z.string().optional(),
});

interface EntityFormProps {
  onSubmit: (data: EntityFormData) => void;
  onFormReady?: (setter: (field: string, value: unknown) => void) => void;
  className?: string;
  isLoading?: boolean;
}

export function EntityForm({ onSubmit, onFormReady, className, isLoading = false }: EntityFormProps) {
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectSectionOpen, setProjectSectionOpen] = useState(true);
  const [additionalFieldsOpen, setAdditionalFieldsOpen] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [previousProjectCount, setPreviousProjectCount] = useState(0);
  
  const { projects, loading: projectsLoading, error: projectsError, refetch } = useProjects();
  const { activeProfile } = useGlobalRiskProfile();
  
  
  const form = useForm<EntityFormData>({
    resolver: zodResolver(entityFormSchema),
    defaultValues: {
      name: '',
      type: 'company',
      risk_profile: activeProfile?.id || 'default',
      identifier: '',
      address: '',
      country: '',
      date_of_birth: '',
      project_id: '',
    },
  });


  // Clear any old cached form data and set default project when projects load
  React.useEffect(() => {
    // Clear any old profile field that might be cached
    const currentValues = form.getValues();
    if ('profile' in currentValues) {
      // Force reset the form to remove any old fields
      form.reset({
        name: '',
        type: 'company',
        risk_profile: activeProfile?.id || 'default',
        identifier: '',
        address: '',
        country: '',
        date_of_birth: '',
        project_id: '',
      });
    }
    
    if (projects.length > 0 && !form.getValues('project_id')) {
      // Try to get the user's preferred default project
      const savedDefaultId = typeof window !== 'undefined' ? localStorage.getItem('defaultProjectId') : null;
      const defaultProject = savedDefaultId 
        ? projects.find(p => p.id === savedDefaultId) || projects[0]
        : projects[0]; // Use the first project (most recently updated) as fallback
      
      form.setValue('project_id', defaultProject.id);
    }
  }, [projects, activeProfile?.id]);

  // Expose form setValue method when component mounts
  React.useEffect(() => {
    if (onFormReady) {
      onFormReady((field, value) => form.setValue(field as keyof EntityFormData, value as string));
    }
  }, [onFormReady]);

  // Update risk profile when active profile changes
  React.useEffect(() => {
    if (activeProfile?.id) {
      form.setValue('risk_profile', activeProfile.id);
    }
  }, [activeProfile?.id, form]);



  // Handle project creation success
  const handleProjectCreated = async () => {
    await refetch();
  };

  // Auto-select newly created project
  React.useEffect(() => {
    if (showCreateProject && projects.length > previousProjectCount && projects.length > 0) {
      // A new project was created, select the most recently created project (first in sorted list)
      const newestProject = projects[0];
      form.setValue('project_id', newestProject.id);
      setShowCreateProject(false);
      toast.success(`Selected new project: ${newestProject.label}`);
    }
    setPreviousProjectCount(projects.length);
  }, [projects, showCreateProject, form, previousProjectCount]);

  const handleSubmit = (data: EntityFormData) => {
    console.log('🔍 Form submission - raw data:', data);
    
    // Clean up optional fields - remove empty strings and ensure no old profile field exists
    const cleanedData: EntityFormData = {
      project_id: data.project_id,
      name: data.name,
      type: data.type,
      risk_profile: data.risk_profile,
      identifier: data.identifier || undefined,
      address: data.address || undefined,
      country: data.country || undefined,
      date_of_birth: data.date_of_birth || undefined,
    };
    
    console.log('🔍 Form submission - cleaned data:', cleanedData);
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
        <Form {...form} key="form-v2">
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
                
                const handleProjectChange = (value: string) => {
                  if (value === 'create-new') {
                    setShowCreateProject(true);
                  } else {
                    field.onChange(value);
                  }
                };
                
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
                        {projectsError ? (
                          <div className="mt-2 p-2 text-sm text-red-600 flex items-center border rounded-md">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Failed to load projects
                          </div>
                        ) : projectsLoading ? (
                          <div className="mt-2 p-2 text-sm text-muted-foreground flex items-center border rounded-md">
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
                            Loading projects...
                          </div>
                        ) : projects.length === 0 ? (
                          <div className="mt-2 p-2 space-y-2 border rounded-md">
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
                        <Select 
                          onValueChange={handleProjectChange} 
                          value={field.value}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                <FolderOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>{project.label}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({project.counts.entity})
                                </span>
                              </SelectItem>
                            ))}
                            <SelectItem value="create-new" className="border-t">
                              <Plus className="mr-2 h-4 w-4" />
                              <span>Create New Project</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        )}
                      </FormControl>
                    </CollapsibleContent>
                  </Collapsible>
                  <FormMessage />
                </FormItem>
                );
              }}
            />


            {/* Submit Button - moved inside form */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
              onClick={(e) => {
                console.log('🔍 Button clicked!', e);
                console.log('🔍 Form is valid:', form.formState.isValid);
                console.log('🔍 Current form values:', form.getValues());
              }}
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
          </form>
        </Form>
      </CardContent>
      
      {/* Create Project Modal */}
      <CreateProjectModal
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onProjectCreated={handleProjectCreated}
      />
    </Card>
  );
}