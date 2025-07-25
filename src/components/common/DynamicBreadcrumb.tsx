'use client';

import { usePathname } from 'next/navigation';
import { Home, Search, Folder, Settings, MoreHorizontal } from 'lucide-react';
import { useBreadcrumb } from '@/components/providers/BreadcrumbProvider';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BreadcrumbSegment {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isCurrentPage?: boolean;
}

const pathConfig: Record<string, BreadcrumbSegment> = {
  '/': { label: 'Home', icon: Home },
  '/screening': { label: 'Screen Entities', icon: Search },
  '/projects': { label: 'Projects', icon: Folder },
  '/settings': { label: 'Settings', icon: Settings },
};

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  const { data } = useBreadcrumb();
  
  // Skip breadcrumbs on the home page
  if (pathname === '/') {
    return null;
  }

  const segments = generateBreadcrumbSegmentsWithData(pathname, data);
  
  // Don't show breadcrumbs if we only have one segment (the current page)
  if (segments.length <= 1) {
    return null;
  }

  return (
    <div className="mb-6">
      <Breadcrumb>
        <BreadcrumbList>
          {segments.map((segment, index) => {
            const isLast = index === segments.length - 1;
            const Icon = segment.icon;

            return (
              <div key={segment.href || segment.label} className="flex items-center">
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="flex items-center">
                      {Icon && <Icon className="h-4 w-4 mr-1" />}
                      {segment.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={segment.href} className="flex items-center">
                      {Icon && <Icon className="h-4 w-4 mr-1" />}
                      {segment.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

function generateBreadcrumbSegments(pathname: string): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [];
  
  // Always start with Home
  segments.push({
    label: 'Home',
    href: '/',
    icon: Home,
  });

  // Parse the pathname
  const pathParts = pathname.split('/').filter(Boolean);
  let currentPath = '';

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    currentPath += `/${part}`;
    const isLast = i === pathParts.length - 1;

    // Check if this is a known route
    const config = pathConfig[currentPath];
    
    if (config) {
      segments.push({
        label: config.label,
        href: isLast ? undefined : currentPath,
        icon: config.icon,
        isCurrentPage: isLast,
      });
    } else {
      // Handle dynamic routes
      const segment = generateDynamicSegment(part, currentPath, pathParts, i, isLast);
      if (segment) {
        segments.push(segment);
      }
    }
  }

  return segments;
}

function generateDynamicSegment(
  part: string,
  currentPath: string,
  pathParts: string[],
  index: number,
  isLast: boolean
): BreadcrumbSegment | null {
  // Handle project ID routes
  if (pathParts[index - 1] === 'projects' && index === 1) {
    return {
      label: `Project ${part}`,
      href: isLast ? undefined : currentPath,
      icon: Folder,
      isCurrentPage: isLast,
    };
  }

  // Skip entities sub-route - it's redundant when we're already in project context
  if (part === 'entities' && pathParts[index - 2] === 'projects') {
    return null;
  }

  // Handle other dynamic routes
  if (part.length > 0) {
    return {
      label: formatSegmentLabel(part),
      href: isLast ? undefined : currentPath,
      isCurrentPage: isLast,
    };
  }

  return null;
}

function formatSegmentLabel(segment: string): string {
  // Convert kebab-case and snake_case to Title Case
  return segment
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Enhanced version with project name resolution for dynamic project pages
interface DynamicBreadcrumbWithDataProps {
  projectName?: string;
  projectId?: string;
}

export function DynamicBreadcrumbWithData({ 
  projectName, 
  projectId 
}: DynamicBreadcrumbWithDataProps) {
  const pathname = usePathname();
  
  // Skip breadcrumbs on the home page
  if (pathname === '/') {
    return null;
  }

  const segments = generateBreadcrumbSegmentsWithData(pathname, { projectName, projectId });
  
  // Don't show breadcrumbs if we only have one segment (the current page)
  if (segments.length <= 1) {
    return null;
  }

  return (
    <div className="mb-6">
      <Breadcrumb>
        <BreadcrumbList>
          {segments.map((segment, index) => {
            const isLast = index === segments.length - 1;
            const Icon = segment.icon;

            return (
              <div key={segment.href || segment.label} className="flex items-center">
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="flex items-center">
                      {Icon && <Icon className="h-4 w-4 mr-1" />}
                      {segment.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={segment.href} className="flex items-center">
                      {Icon && <Icon className="h-4 w-4 mr-1" />}
                      {segment.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

function generateBreadcrumbSegmentsWithData(
  pathname: string,
  data: { projectName?: string; projectId?: string }
): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [];
  
  // Always start with Home
  segments.push({
    label: 'Home',
    href: '/',
    icon: Home,
  });

  // Parse the pathname
  const pathParts = pathname.split('/').filter(Boolean);
  let currentPath = '';

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    currentPath += `/${part}`;
    const isLast = i === pathParts.length - 1;

    // Check if this is a known route
    const config = pathConfig[currentPath];
    
    if (config) {
      segments.push({
        label: config.label,
        href: isLast ? undefined : currentPath,
        icon: config.icon,
        isCurrentPage: isLast,
      });
    } else {
      // Handle dynamic routes with data
      const segment = generateDynamicSegmentWithData(part, currentPath, pathParts, i, isLast, data);
      if (segment) {
        segments.push(segment);
      }
    }
  }

  return segments;
}

function generateDynamicSegmentWithData(
  part: string,
  currentPath: string,
  pathParts: string[],
  index: number,
  isLast: boolean,
  data: { projectName?: string; projectId?: string }
): BreadcrumbSegment | null {
  // Handle project ID routes with actual project name
  if (pathParts[index - 1] === 'projects' && index === 1) {
    const projectLabel = data.projectName || `Project ${part}`;
    return {
      label: projectLabel,
      href: isLast ? undefined : currentPath,
      icon: Folder,
      isCurrentPage: isLast,
    };
  }

  // Skip entities sub-route - it's redundant when we're already in project context
  if (part === 'entities' && pathParts[index - 2] === 'projects') {
    return null;
  }

  // Handle other dynamic routes
  if (part.length > 0) {
    return {
      label: formatSegmentLabel(part),
      href: isLast ? undefined : currentPath,
      isCurrentPage: isLast,
    };
  }

  return null;
}