'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Send } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { posthog } from '@/../instrumentation-client';
import type { OrchestratorResponse } from '@/lib/api';

interface SearchFormProps {
  onSearch: (query: string) => Promise<OrchestratorResponse | Error>;
  isLoading: boolean;
  icon?: 'arrow' | 'send';
  placeholder?: string;
}

export function SearchForm({ onSearch, isLoading, icon = 'arrow', placeholder = 'type a company website here' }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [showLoadingMessage, setShowLoadingMessage] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isLoading) {
      timer = setTimeout(() => {
        setShowLoadingMessage(true);
      }, 3000);
    } else {
      setShowLoadingMessage(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);

  const isValidUrl = (text: string): boolean => {
    if (!text.trim()) return true; // empty is ok
    const urlPattern = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+/;
    return urlPattern.test(text.trim());
  };

  const cleanUrl = (url: string): string => {
    let cleaned = url.trim();
    // Remove protocol
    cleaned = cleaned.replace(/^https?:\/\//, '');
    // Remove www.
    cleaned = cleaned.replace(/^www\./, '');
    // Extract just the domain (remove everything after first /)
    cleaned = cleaned.split('/')[0];
    // Remove query params if any (in case no path but has ?)
    cleaned = cleaned.split('?')[0];
    return cleaned;
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const cleaned = cleanUrl(pastedText);
    setQuery(cleaned);
    if (!isValidUrl(cleaned)) {
      setError('Please enter a valid website URL (e.g., example.com)');
    } else {
      setError('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim() && !isValidUrl(value)) {
      setError('Please enter a valid website URL (e.g., example.com)');
    } else {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !isValidUrl(query)) return;

    // Haptic feedback on submit
    triggerHaptic('light');

    // Blur input to dismiss keyboard on mobile
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const trimmedQuery = query.trim();
    
    // Log company_searched event
    posthog.capture('company_searched', {
      search_query: trimmedQuery,
    });

    try {
      const result = await onSearch(trimmedQuery);
      
      // Log search_completed event
      if (result instanceof Error) {
        posthog.capture('search_completed', {
          search_query: trimmedQuery,
          results_found: false,
          email_count: 0,
          person_count: 0,
          error: result.message,
        });
      } else {
        const resultsFound = result.people && result.people.length > 0 && result.message !== "no emails found";
        const emailCount = resultsFound
          ? result.people.reduce((total, person) => total + (person.emails?.length || 0), 0)
          : 0;
        
        posthog.capture('search_completed', {
          search_query: trimmedQuery,
          company_name: result.company || trimmedQuery,
          results_found: resultsFound,
          email_count: emailCount,
          person_count: result.people?.length || 0,
        });
      }
    } catch (err) {
      posthog.capture('search_completed', {
        search_query: trimmedQuery,
        results_found: false,
        email_count: 0,
        person_count: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="relative flex items-center"
    >
      <input
        type="text"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck="false"
        value={query}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={placeholder}
        disabled={isLoading}
        className="w-full bg-transparent border border-white/20 px-4 py-3 pr-12 rounded text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-all duration-[200ms] caret-white disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ fontFamily: 'var(--font-fira-mono)', willChange: 'border-color', transform: 'translateZ(0)' }}
      />
      <button
        type="submit"
        disabled={isLoading || !query.trim() || !!error}
        className="absolute right-2 p-2 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
        style={{ fontFamily: 'var(--font-fira-mono)' }}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon === 'send' ? (
          <Send className="w-4 h-4" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        )}
      </button>
      {error && (
        <p className="absolute -bottom-6 left-0 text-sm text-red-400" style={{ fontFamily: 'var(--font-fira-mono)' }}>
          {error}
        </p>
      )}
      {showLoadingMessage && (
        <p className="absolute -bottom-6 left-0 right-0 text-sm text-white/50 text-center" style={{ fontFamily: 'var(--font-fira-mono)' }}>
          this can take up to one minute.
        </p>
      )}
    </form>
  );
}
