'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface BreadcrumbData {
  projectName?: string;
  projectId?: string;
  referrer?: string;
  referrerLabel?: string;
}

interface BreadcrumbContextType {
  data: BreadcrumbData;
  setData: (data: BreadcrumbData) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider');
  }
  return context;
}

interface BreadcrumbProviderProps {
  children: ReactNode;
}

export function BreadcrumbProvider({ children }: BreadcrumbProviderProps) {
  const [data, setData] = useState<BreadcrumbData>({});
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Handle referrer information from URL params or storage
  useEffect(() => {
    // First check if referrer info is in URL params (more reliable)
    const fromParam = searchParams.get('from');
    if (fromParam) {
      let referrerLabel = 'Back';
      if (fromParam === 'screening') {
        referrerLabel = 'Screen Entities';
      } else if (fromParam.startsWith('projects')) {
        referrerLabel = 'Project';
      }
      
      const referrerPath = fromParam === 'screening' ? '/screening' : `/${fromParam}`;
      
      // Store in sessionStorage for persistence
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('breadcrumb_referrer', referrerPath);
        sessionStorage.setItem('breadcrumb_referrer_label', referrerLabel);
      }
      
      setData(prev => ({
        ...prev,
        referrer: referrerPath,
        referrerLabel: referrerLabel,
      }));
      return;
    }

    // Fallback to sessionStorage or document.referrer
    if (typeof window !== 'undefined') {
      let referrer = sessionStorage.getItem('breadcrumb_referrer');
      let referrerLabel = sessionStorage.getItem('breadcrumb_referrer_label');
      
      // If no stored referrer, try to get from document.referrer
      if (!referrer) {
        const docReferrer = document.referrer;
        const currentDomain = window.location.origin;
        
        if (docReferrer && docReferrer.startsWith(currentDomain)) {
          const referrerPath = docReferrer.replace(currentDomain, '');
          
          if (referrerPath === '/screening') {
            referrer = '/screening';
            referrerLabel = 'Screen Entities';
          } else if (referrerPath.startsWith('/projects/')) {
            referrer = referrerPath;
            referrerLabel = 'Project';
          }
          
          if (referrer && referrerLabel) {
            sessionStorage.setItem('breadcrumb_referrer', referrer);
            sessionStorage.setItem('breadcrumb_referrer_label', referrerLabel);
          }
        }
      }
      
      setData(prev => ({
        ...prev,
        referrer: referrer || undefined,
        referrerLabel: referrerLabel || undefined,
      }));
    }
  }, [pathname, searchParams]);

  return (
    <BreadcrumbContext.Provider value={{ data, setData }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}