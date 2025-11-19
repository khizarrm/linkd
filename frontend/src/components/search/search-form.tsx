'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

const PLACEHOLDER_TEXTS = [
  'gimme tim cooks email from apple',
  'exa ai, the api search company',
  'cohere',
  'fouders from datacurve',
  'ceo of poolside ai',
];

interface SearchFormProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (query.trim() === '' && !isFocused) {
      intervalRef.current = setInterval(() => {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_TEXTS.length);
      }, 3000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [query, isFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query);
  };

  return (
    <div className="mt-5 sm:mt-6 md:mt-8 mx-auto max-w-3xl opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#151515] border border-[#2a2a2a] rounded-2xl sm:rounded-full px-4 sm:px-6 py-3 sm:py-4 focus-within:border-[#4a4a4a] transition-all duration-500">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isLoading}
              className="w-full bg-transparent text-sm sm:text-lg md:text-xl font-sans font-light tracking-tight focus:outline-none disabled:opacity-50 min-h-[40px] sm:min-h-0 relative z-10"
            />
            {query.trim() === '' && !isFocused && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden slot-machine-container">
                <div
                  className="slot-machine-reel text-sm sm:text-lg md:text-xl font-sans font-light tracking-tight text-[#3a3a3a] w-full"
                  style={{
                    transform: `translateY(-${placeholderIndex * (100 / PLACEHOLDER_TEXTS.length)}%)`
                  }}
                >
                  {PLACEHOLDER_TEXTS.map((text, idx) => (
                    <div 
                      key={idx} 
                      className="slot-machine-item"
                    >
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 bg-white text-[#0a0a0a] rounded-full text-xs sm:text-sm font-sans font-light tracking-wider uppercase hover:bg-[#e8e8e8] active:scale-95 transition-all duration-300 disabled:opacity-30 disabled:hover:bg-white disabled:active:scale-100 min-h-[40px] sm:min-h-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 sm:h-3 sm:w-3 animate-spin" />
                <span className="sm:inline">Searching</span>
              </>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
