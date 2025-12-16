'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface SearchFormProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !isValidUrl(query)) return;
    onSearch(query);
  };

  return (
    <div className="mt-5 sm:mt-6 md:mt-8 mx-auto max-w-3xl opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-gradient-to-br from-[#151515] to-[#0f0f0f] border border-[#2a2a2a] rounded-2xl sm:rounded-full px-4 sm:px-6 py-3 sm:py-4 focus-within:border-[#3a3a3a] transition-all duration-500">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={handleChange}
              onPaste={handlePaste}
              placeholder="Enter website URL (e.g., example.com)"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isLoading}
              className="w-full bg-transparent text-sm sm:text-lg md:text-xl font-light tracking-tight focus:outline-none disabled:opacity-50 min-h-[40px] sm:min-h-0 relative z-10 text-[#f5f5f0] placeholder:text-[#5a5a5a]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !query.trim() || !!error}
            className="flex items-center justify-center gap-2 px-6 py-2.5 sm:py-2 bg-[#d4af37] text-[#0a0a0a] rounded-full text-xs sm:text-sm font-light tracking-wider uppercase hover:bg-[#c49d2a] active:scale-95 transition-all duration-300 disabled:opacity-30 disabled:hover:bg-[#d4af37] disabled:active:scale-100 min-h-[40px] sm:min-h-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 sm:h-3 sm:w-3 animate-spin" />
                <span className="sm:inline">Searching</span>
              </>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>
      {error && (
        <p className="mt-2 text-sm text-red-400 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
