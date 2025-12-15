'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { mutate } from 'swr';
import { useProtectedApi } from '@/hooks/use-protected-api';
import type { OrchestratorResponse } from '@/lib/api';
import { SearchHeader } from '@/components/search/search-header';
import { SearchForm } from '@/components/search/search-form';
import { SearchResults } from '@/components/search/search-results';

const COMPANIES_KEY = 'companies';

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const protectedApi = useProtectedApi();
  const [result, setResult] = useState<OrchestratorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/login');
    }
  }, [isLoaded, isSignedIn, router]);

  const handleSearch = async (query: string) => {
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const data = await protectedApi.orchestrator({ query: query.trim() });
      setResult(data);
      // Invalidate companies cache so bank page shows new companies immediately
      mutate(COMPANIES_KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run orchestrator');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8] font-sans">
      <main className="flex items-center justify-center min-h-screen px-4 sm:px-6">
        <div className="w-full max-w-4xl -mt-16">
          <SearchHeader />
          
          <SearchForm onSearch={handleSearch} isLoading={loading} />

          <SearchResults 
            loading={loading} 
            error={error} 
            data={result} 
          />
        </div>
      </main>
    </div>
  );
}
