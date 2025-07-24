'use client';

import { useState } from 'react';
import { Loader2, Folder, CheckCircle, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { SayariProject } from '@/types/api.types';

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: () => Promise<void>;
}

type ShareLevel = 'none' | 'viewer' | 'editor' | 'admin';

export function CreateProjectModal({ 
  open, 
  onOpenChange, 
  onProjectCreated 
}: CreateProjectModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [label, setLabel] = useState('');
  const [shareLevel, setShareLevel] = useState<ShareLevel>('none');
  const [error, setError] = useState<string | null>(null);
  const [createdProject, setCreatedProject] = useState<SayariProject | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Project name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label: label.trim(),
          ...(shareLevel !== 'none' && {
            share: {
              org: shareLevel as 'viewer' | 'editor' | 'admin'
            }
          })
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const result = await response.json();
      setCreatedProject(result.data);
      
      // Show refreshing state and trigger refresh
      setIsRefreshing(true);
      await onProjectCreated();
      setIsRefreshing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !isRefreshing) {
      setLabel('');
      setShareLevel('none');
      setError(null);
      setCreatedProject(null);
      setIsRefreshing(false);
      onOpenChange(false);
    }
  };

  const copyProjectId = () => {
    if (createdProject) {
      navigator.clipboard.writeText(createdProject.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {createdProject ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Project Created Successfully
              </>
            ) : (
              <>
                <Folder className="h-5 w-5" />
                Create New Project
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {createdProject ? (
              `Your project "${createdProject.label}" has been created and is ready to use.`
            ) : (
              'Create a new project to organize and manage entity screenings together.'
            )}
          </DialogDescription>
        </DialogHeader>

        {createdProject ? (
          // Success State
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{createdProject.label}</CardTitle>
                    <CardDescription>
                      Created {new Date(createdProject.created).toLocaleString()}
                    </CardDescription>
                  </div>
                  {isRefreshing && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Updating...</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Project ID</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 font-mono text-sm bg-muted px-3 py-2 rounded border">
                        {createdProject.id}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyProjectId}
                        className="px-2"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div className="font-medium">
                        {createdProject.archived ? 'Archived' : 'Active'}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Entities:</span>
                      <div className="font-medium">
                        {createdProject.counts?.entity || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button 
                onClick={handleClose} 
                className="w-full"
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing projects...
                  </>
                ) : (
                  'Done'
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Create Form
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Enter project name..."
                disabled={isLoading}
                className={error && !label.trim() ? 'border-destructive' : ''}
              />
              {error && !label.trim() && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Organization Sharing</Label>
              <p className="text-sm text-muted-foreground">
                Choose how members of your organization can access this project.
              </p>
              <RadioGroup 
                value={shareLevel} 
                onValueChange={(value) => setShareLevel(value as ShareLevel)}
                disabled={isLoading}
              >
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id="share-none" />
                      <Label htmlFor="share-none" className="cursor-pointer">
                        <CardTitle className="text-sm">Private</CardTitle>
                      </Label>
                    </div>
                    <CardDescription className="text-xs ml-6">
                      Only you can access this project
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="viewer" id="share-viewer" />
                      <Label htmlFor="share-viewer" className="cursor-pointer">
                        <CardTitle className="text-sm">Organization Viewer</CardTitle>
                      </Label>
                    </div>
                    <CardDescription className="text-xs ml-6">
                      Organization members can view the project
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="editor" id="share-editor" />
                      <Label htmlFor="share-editor" className="cursor-pointer">
                        <CardTitle className="text-sm">Organization Editor</CardTitle>
                      </Label>
                    </div>
                    <CardDescription className="text-xs ml-6">
                      Organization members can view and edit the project
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="admin" id="share-admin" />
                      <Label htmlFor="share-admin" className="cursor-pointer">
                        <CardTitle className="text-sm">Organization Admin</CardTitle>
                      </Label>
                    </div>
                    <CardDescription className="text-xs ml-6">
                      Organization members have full access to the project
                    </CardDescription>
                  </CardHeader>
                </Card>
              </RadioGroup>
            </div>

            {error && label.trim() && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !label.trim()}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}