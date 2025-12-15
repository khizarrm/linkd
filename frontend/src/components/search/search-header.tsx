import React from 'react';

export function SearchHeader() {
  return (
    <div className="mb-6 sm:mb-8 md:mb-10 text-center">
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif tracking-tight leading-[1.1] opacity-0 animate-fade-in-up text-[#f5f5f0]">
        linkd
      </h1>
      <p
        className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg font-light text-[#9a9a90] opacity-0 animate-fade-in-up px-4 sm:px-0"
        style={{ animationDelay: '0.05s' }}
      >
        Reach Decision Makers Directly
      </p>
    </div>
  );
}

