'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface BreadcrumbData {
  projectName?: string;
  projectId?: string;
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

  // Clear data when route changes
  useEffect(() => {
    setData({});
  }, [pathname]);

  return (
    <BreadcrumbContext.Provider value={{ data, setData }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}