'use client';

import { useParams } from 'next/navigation';
import { ProjectEntitiesTable } from '@/components/projects/ProjectEntitiesTable';

export default function ProjectEntitiesPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <div className="space-y-6">
      <ProjectEntitiesTable projectId={projectId} />
    </div>
  );
}