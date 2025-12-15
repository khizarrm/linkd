import React from 'react';

export function SearchHeader() {
  return (
    <div className="mb-5 sm:mb-6 md:mb-8 text-center">
      <h1 className="text-3xl sm:text-5xl md:text-7xl font-light tracking-tight leading-[1.1] opacity-0 animate-fade-in-up">
        linkd
      </h1>
      <p 
        className="mt-2 sm:mt-3 md:mt-4 text-xs sm:text-sm md:text-base font-sans font-light text-[#6a6a6a] opacity-0 animate-fade-in-up px-4 sm:px-0" 
        style={{ animationDelay: '0.05s' }}
      >
        link up ting
      </p>
    </div>
  );
}

