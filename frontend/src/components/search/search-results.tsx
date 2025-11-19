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
      <div className="mt-6 sm:mt-8 md:mt-10 opacity-0 animate-fade-in-up text-center px-4">
        <p className="text-sm sm:text-base font-sans font-light text-red-400/80">{error}</p>
      </div>
    );
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    return null;
  }

  if (data.message === "no emails found") {
    return (
      <div className="mt-6 sm:mt-10 md:mt-12">
        <EmptyState />
      </div>
    );
  }

  if (data.people && data.people.length > 0) {
    return (
      <div className="mt-6 sm:mt-10 md:mt-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-5xl mx-auto">
          {data.people.map((person, index) => (
            <PersonCard
              key={`${person.name}-${index}`}
              person={person}
              favicon={data.favicon}
              companyName={data.company}
              index={index}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 sm:mt-10 md:mt-12 opacity-0 animate-fade-in-up text-center px-4">
      <p className="text-base sm:text-lg md:text-xl font-light text-[#6a6a6a]">
        No results found
      </p>
    </div>
  );
}

