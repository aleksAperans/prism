'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LoadingCard } from '@/components/common/LoadingStates';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (session) {
      // User is authenticated, redirect to screening
      router.push('/screening');
    } else {
      // User is not authenticated, redirect to signin
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <LoadingCard 
        title="Loading application..."
        description="Redirecting to the appropriate page"
      />
    </div>
  );
}
