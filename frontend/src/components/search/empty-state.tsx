import React from 'react';

export function EmptyState() {
  return (
    <div className="opacity-0 animate-fade-in-up text-center px-4 max-w-2xl mx-auto">
      <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10">
        <div className="text-4xl sm:text-5xl md:text-6xl mb-4 sm:mb-5 md:mb-6 opacity-40">
          🔍
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight mb-3 sm:mb-4 text-[#e8e8e8]">
          No emails found
        </h2>
        <p className="text-xs sm:text-sm md:text-base font-sans font-light text-[#6a6a6a] leading-relaxed mb-3 sm:mb-4">
          We couldn't find any verified email addresses for your search.
        </p>
        <p className="text-xs sm:text-sm md:text-base font-sans font-light text-[#5a5a5a] leading-relaxed">
          Try adding more context (like their website, what they do, or specific details), or choose a smaller or mid-size company — those usually work best.
        </p>
      </div>
    </div>
  );
}

