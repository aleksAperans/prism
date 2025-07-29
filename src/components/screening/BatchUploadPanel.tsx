'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  Download, 
  Play,
  X,
  FolderOpen,
  Plus,
  Minimize2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

import { useProjects } from '@/hooks/useProjects';
import { useGlobalRiskProfile } from '@/contexts/RiskProfileContext';
import { CSVParser, type CSVParseError } from '@/services/batch/csvParser';
import type { BatchEntityInput, BatchJobStatus, BatchEntityResult } from '@/services/batch/types';
import { BatchUploadProgress } from './BatchUploadProgress';
import { BatchResultsExport } from './BatchResultsExport';
import { BatchUploadErrorBoundary } from './BatchUploadErrorBoundary';
import { CreateProjectModal } from '../projects/CreateProjectModal';
import { toast } from 'sonner';
import React from 'react';

const batchUploadSchema = z.object({
  projectId: z.string().min(1, 'Please select a project'),
});

interface BatchUploadFormData {
  projectId: string;
}

interface BatchUploadPanelProps {
  onProcessingChange?: (isProcessing: boolean) => void;
  projectIdOverride?: string;
  onJobStatusChange?: (jobData: { 
    jobId: string; 
    status: BatchJobStatus; 
    results: BatchEntityResult[] 
  } | null) => void;
  onMinimize?: () => void;
  onNavigateToProject?: () => void;
  existingJobId?: string;
  existingJobStatus?: BatchJobStatus;
  existingResults?: BatchEntityResult[];
}

export function BatchUploadPanel({ 
  onProcessingChange, 
  projectIdOverride,
  onJobStatusChange,
  onMinimize,
  onNavigateToProject,
  existingJobId,
  existingJobStatus,
  existingResults
}: BatchUploadPanelProps = {}) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<BatchEntityInput[]>([]);
  const [parseErrors, setParseErrors] = useState<CSVParseError[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(!!existingJobId);
  const [jobStatus, setJobStatus] = useState<BatchJobStatus | null>(existingJobStatus || null);
  const [jobResults, setJobResults] = useState<BatchEntityResult[]>(existingResults || []);
  const [currentJobId, setCurrentJobId] = useState<string | null>(existingJobId || null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [previousProjectCount, setPreviousProjectCount] = useState(0);

  const { projects, loading: projectsLoading, error: projectsError, refetch: refetchProjects } = useProjects();
  const { activeProfile } = useGlobalRiskProfile();

  const form = useForm<BatchUploadFormData>({
    resolver: zodResolver(batchUploadSchema),
    defaultValues: {
      projectId: '',
    },
  });


  // Set default project when projects load or when override is provided
  React.useEffect(() => {
    if (projectIdOverride) {
      form.setValue('projectId', projectIdOverride);
    } else if (projects.length > 0 && !form.getValues('projectId')) {
      form.setValue('projectId', projects[0].id);
    }
  }, [projects, form, projectIdOverride]);

  // Notify parent of processing state changes
  React.useEffect(() => {
    if (onProcessingChange) {
      onProcessingChange(isProcessing);
    }
  }, [isProcessing]);

  // Notify parent of job status changes
  React.useEffect(() => {
    if (onJobStatusChange && currentJobId && jobStatus) {
      onJobStatusChange({
        jobId: currentJobId,
        status: jobStatus,
        results: jobResults
      });
    } else if (onJobStatusChange && !currentJobId) {
      onJobStatusChange(null);
    }
  }, [currentJobId, jobStatus, jobResults]);

  // Handle project selection change
  const handleProjectChange = (value: string) => {
    if (value === 'create-new') {
      setShowCreateProject(true);
    } else {
      form.setValue('projectId', value);
    }
  };

  // Handle project creation success
  const handleProjectCreated = async () => {
    await refetchProjects();
  };

  // Auto-select newly created project
  React.useEffect(() => {
    if (showCreateProject && projects.length > previousProjectCount && projects.length > 0) {
      // A new project was created, select the most recently created project (first in sorted list)
      const newestProject = projects[0];
      form.setValue('projectId', newestProject.id);
      setShowCreateProject(false);
      toast.success(`Selected new project: ${newestProject.label}`);
    }
    setPreviousProjectCount(projects.length);
  }, [projects, showCreateProject, form, previousProjectCount]);

  // Poll for job progress when processing
  React.useEffect(() => {
    if (!isProcessing || !currentJobId) {
      return;
    }

    // If we have an existing job that's still processing, ensure we're polling
    if (existingJobId && existingJobStatus?.status === 'processing') {
      console.log('🔄 Resuming polling for existing job:', existingJobId);
    }

    const pollInterval = setInterval(async () => {
      try {
        const projectId = projectIdOverride || form.getValues().projectId;
        const pollUrl = `/api/projects/${projectId}/entities/batch?jobId=${currentJobId}`;
        console.log('🔄 Polling:', pollUrl);
        
        const response = await fetch(pollUrl);
        const result = await response.json();
        
        console.log('📊 Poll result:', result);

        if (result.success && result.data) {
          const newStatus = result.data.status;
          console.log('📈 Status update:', newStatus);
          
          setJobStatus(newStatus);
          if (result.data.results) {
            setJobResults(result.data.results);
          }

          // Stop processing when job is complete
          if (newStatus.status !== 'processing') {
            console.log('✅ Job completed:', newStatus.status);
            setIsProcessing(false);
            clearInterval(pollInterval);
          }
        } else {
          console.warn('Polling failed:', result);
        }
      } catch (err) {
        console.error('Failed to poll job status:', err);
      }
    }, 1000); // Poll every 1 second for more responsive updates

    return () => {
      clearInterval(pollInterval);
    };
  }, [isProcessing, currentJobId, projectIdOverride, existingJobId, existingJobStatus]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size too large. Maximum file size is 10MB.');
      return;
    }

    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parseResult = CSVParser.parse(content);
      
      if (parseResult.success && parseResult.data) {
        setParsedData(parseResult.data);
        setParseErrors([]);
        setUploadError(null);
        toast.success(`Successfully parsed ${parseResult.data.length} entities`);
      } else {
        setParsedData([]);
        setParseErrors(parseResult.errors || []);
        setUploadError('CSV parsing failed');
        toast.error(`CSV parsing failed: ${parseResult.errors?.[0]?.message || 'Unknown error'}`);
      }
    };
    
    reader.readAsText(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      // Create a more complete fake event to satisfy TypeScript
      const fakeEvent = {
        target: { 
          files: [file],
          value: ''
        },
        currentTarget: null,
        nativeEvent: null,
        bubbles: false,
        cancelable: false,
        defaultPrevented: false,
        eventPhase: 0,
        isTrusted: false,
        preventDefault: () => {},
        isDefaultPrevented: () => false,
        stopPropagation: () => {},
        isPropagationStopped: () => false,
        persist: () => {},
        timeStamp: Date.now(),
        type: 'change'
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(fakeEvent);
    }
  }, [handleFileUpload]);

  const downloadTemplate = () => {
    const template = CSVParser.generateTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch-upload-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (data: BatchUploadFormData) => {
    if (!csvFile || parsedData.length === 0) {
      toast.error('Please upload a valid CSV file first');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvContent = e.target?.result as string;
          
          const response = await fetch(`/api/projects/${data.projectId}/entities/batch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              csvContent,
              riskProfile: activeProfile?.id || 'default',
              profile: 'corporate',
              chunkSize: 10,
            }),
          });

          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
          }
          
          if (result.success && result.data) {
            setCurrentJobId(result.data.jobId);
            setJobStatus(result.data.status);
            setJobResults(result.data.results || []);
            // isProcessing already set on button click
            toast.success('Batch processing started successfully');
          } else {
            throw new Error(result.error || 'Batch processing failed');
          }
        } catch (fetchError) {
          console.error('Batch upload fetch error:', fetchError);
          const errorMessage = fetchError instanceof Error ? fetchError.message : 'Batch upload failed';
          setUploadError(errorMessage);
          setIsProcessing(false); // Reset processing on error
          toast.error(errorMessage);
        }
      };
      
      reader.onerror = () => {
        const errorMessage = 'Failed to read CSV file';
        setUploadError(errorMessage);
        setIsProcessing(false); // Reset processing on error
        toast.error(errorMessage);
      };
      
      reader.readAsText(csvFile);
      
    } catch (error) {
      console.error('Batch upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Batch upload failed';
      setUploadError(errorMessage);
      setIsProcessing(false); // Reset processing on error
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      // Don't reset isProcessing here - let the polling handle it
    }
  };

  const resetUpload = () => {
    // Don't reset if we're just minimizing
    if (onMinimize && isProcessing) {
      return;
    }
    
    setCsvFile(null);
    setParsedData([]);
    setParseErrors([]);
    setJobStatus(null);
    setJobResults([]);
    setCurrentJobId(null);
    setUploadError(null);
    setIsProcessing(false);
    
    // Reset file input
    const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Show progress if job is running
  if (jobStatus && currentJobId) {
    return (
      <BatchUploadErrorBoundary>
        <div className="space-y-6">
          <BatchUploadProgress 
            jobId={currentJobId}
            jobStatus={jobStatus}
            results={jobResults}
            riskProfileId={activeProfile?.id || 'default'}
            onStatusUpdate={setJobStatus}
            onResultsUpdate={setJobResults}
            onReset={resetUpload}
            onMinimize={onMinimize}
          />
          
          {jobStatus.status === 'completed' && jobResults.length > 0 && (
            <BatchResultsExport 
              results={jobResults}
              riskProfileId={activeProfile?.id || 'default'}
              onNavigateToProject={onNavigateToProject}
            />
          )}
        </div>
      </BatchUploadErrorBoundary>
    );
  }

  return (
    <BatchUploadErrorBoundary>
    <div className="space-y-6">
      {/* Combined Upload and Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Batch Entity Upload
          </CardTitle>
          <CardDescription>
            Upload a CSV file to screen multiple entities. Supports up to 1,000 entities with automatic rate limiting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project Selection - hide if projectIdOverride is provided */}
                {!projectIdOverride && (
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={handleProjectChange} 
                            value={field.value}
                            disabled={projectsLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  <div className="flex items-center">
                                    <FolderOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span>{project.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                              <SelectItem value="create-new" className="border-t">
                                <div className="flex items-center text-primary">
                                  <Plus className="mr-2 h-4 w-4" />
                                  <span className="font-medium">Create New Project</span>
                                </div>
                              </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                    )}
                  />
                )}

              </div>
            </form>
          </Form>

          <Separator />

          {/* File Upload Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">CSV File Upload</h4>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Required: <span className="font-medium">name</span> • Optional: address, country, type, identifier
            </p>
            
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('csv-file-input')?.click()}
            >
              {csvFile ? (
                <div className="space-y-2">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-600" />
                  <p className="font-medium text-sm">{csvFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {parsedData.length} entities ready to process
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      resetUpload();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="font-medium text-sm">Drop CSV file here or click to browse</p>
                  <p className="text-xs text-muted-foreground">Maximum 10MB</p>
                </div>
              )}
            </div>
            
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Live Progress Component or Preview Table */}
          {parsedData.length > 0 && parseErrors.length === 0 && !isProcessing && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Preview (First 10 rows)</h4>
                  <Badge variant="secondary">{parsedData.length} total entities</Badge>
                </div>
                <div className="border rounded-lg overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead className="min-w-[200px]">Name</TableHead>
                        <TableHead className="w-[100px]">Type</TableHead>
                        <TableHead className="w-[80px]">Country</TableHead>
                        <TableHead className="min-w-[250px]">Address</TableHead>
                        <TableHead className="min-w-[150px]">Identifier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 10).map((entity, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{index + 1}</TableCell>
                          <TableCell className="font-medium">{entity.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {entity.type || 'company'}
                            </Badge>
                          </TableCell>
                          <TableCell>{entity.country || '-'}</TableCell>
                          <TableCell className="break-words">{entity.address || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{entity.identifier || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parsedData.length > 10 && (
                    <div className="text-center py-2 text-sm text-muted-foreground border-t">
                      ... and {parsedData.length - 10} more entities
                    </div>
                  )}
                </div>
              </div>
            </>
          )}



          {/* Submit Button */}
          {parsedData.length > 0 && parseErrors.length === 0 && !isProcessing && (
            <Button
              onClick={async () => {
                setIsProcessing(true);
                
                // Handle the form submission manually
                const formData = form.getValues();
                handleSubmit(formData);
              }}
              disabled={isUploading || parsedData.length === 0 || isProcessing}
              size="lg"
              className="w-full"
            >
              {isUploading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Starting Process...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Process {parsedData.length} Entities
                </>
              )}
            </Button>
          )}
          
        </CardContent>
      </Card>

      {/* Parse Errors */}
      {parseErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>CSV Parsing Errors</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              {parseErrors.slice(0, 5).map((error, index) => (
                <div key={index} className="text-sm">
                  Row {error.row}: {error.message}
                </div>
              ))}
              {parseErrors.length > 5 && (
                <div className="text-sm">
                  ... and {parseErrors.length - 5} more errors
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}


      {/* Error Alert */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {uploadError}
          </AlertDescription>
        </Alert>
      )}

      {/* Project Loading Error */}
      {projectsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load projects. Please refresh the page and try again.
          </AlertDescription>
        </Alert>
      )}


      {/* Create Project Modal */}
      <CreateProjectModal
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onProjectCreated={handleProjectCreated}
      />
    </div>
    </BatchUploadErrorBoundary>
  );
}