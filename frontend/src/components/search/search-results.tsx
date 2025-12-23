'use client';

import React, { useState, useEffect } from 'react';
import type { OrchestratorResponse } from '@/lib/api';
import { PersonCard } from './person-card';
import { LoadingSkeleton } from './loading-skeleton';
import { EmptyState } from './empty-state';

interface SearchResultsProps {
  loading: boolean;
  error: string | null;
  data: OrchestratorResponse | null;
}

type DisplayState = 'idle' | 'loading' | 'results' | 'empty' | 'error' | 'no-results';

export function SearchResults({ loading, error, data }: SearchResultsProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [displayState, setDisplayState] = useState<DisplayState>('idle');

  // Orchestrate exit → enter transitions
  useEffect(() => {
    let newState: DisplayState = 'idle';

    if (loading) {
      newState = 'loading';
    } else if (error) {
      newState = 'error';
    } else if (data) {
      if (data.message === "No verified emails found") {
        newState = 'empty';
      } else if (data.people && data.people.length > 0) {
        newState = 'results';
      } else {
        newState = 'no-results';
      }
    }

    // Only trigger transition if state actually changed
    if (newState !== displayState && displayState !== 'idle') {
      setIsExiting(true);
      setTimeout(() => {
        setDisplayState(newState);
        setIsExiting(false);
      }, 300); // Match fadeOutDown duration
    } else if (displayState === 'idle') {
      setDisplayState(newState);
    }
  }, [loading, error, data, displayState]);

  if (displayState === 'error' && error) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-4">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm animate-bounce-in" style={{ fontFamily: 'var(--font-fira-mono)' }}>
          {error}
        </div>
      </div>
    );
  }

  if (displayState === 'loading') {
    return <LoadingSkeleton isExiting={isExiting} />;
  }

  if (displayState === 'idle' || !data) {
    return null;
  }

  if (displayState === 'empty') {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <EmptyState people={data.people} company={data.company} />
      </div>
    );
  }

  if (displayState === 'results' && data.people && data.people.length > 0) {
    const person = data.people[0];
    return (
      <PersonCard
        person={person}
        favicon={data.favicon}
        companyName={data.company}
        index={0}
      />
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-4">
      <div className="p-6 bg-[#0a0a0a] border border-white/10 rounded-lg">
        <p className="text-center text-white/70" style={{ fontFamily: 'var(--font-fira-mono)' }}>
          no results found
        </p>
      </div>
    </div>
  );
}

