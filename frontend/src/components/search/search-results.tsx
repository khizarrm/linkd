import React from 'react';
import type { OrchestratorResponse } from '@/lib/api';
import { PersonCard } from './person-card';
import { LoadingSkeleton } from './loading-skeleton';
import { EmptyState } from './empty-state';

interface SearchResultsProps {
  loading: boolean;
  error: string | null;
  data: OrchestratorResponse | null;
}

export function SearchResults({ loading, error, data }: SearchResultsProps) {
  if (error) {
    return (
      <div className="mt-6 sm:mt-8 opacity-0 animate-fade-in-up px-4">
        <div className="max-w-2xl mx-auto bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5 sm:p-6 text-center">
          <div className="text-2xl sm:text-3xl mb-2 opacity-30">✕</div>
          <p className="text-sm font-light text-[#e8e8e8]/80 leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    return null;
  }

  if (data.message === "No verified emails found") {
    return (
      <div className="mt-6 sm:mt-8">
        <EmptyState people={data.people} company={data.company} />
      </div>
    );
  }

  if (data.people && data.people.length > 0) {
    // Show only the first person (single result)
    const person = data.people[0];
    return (
      <div className="mt-6 sm:mt-8">
        <div className="max-w-3xl mx-auto">
          <PersonCard
            person={person}
            favicon={data.favicon}
            companyName={data.company}
            index={0}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 sm:mt-8 opacity-0 animate-fade-in-up text-center px-4">
      <div className="max-w-2xl mx-auto bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5 sm:p-6">
        <div className="text-2xl sm:text-3xl mb-2 opacity-30">∅</div>
        <p className="text-sm font-light text-[#6a6a6a]">
          No results found
        </p>
      </div>
    </div>
  );
}

