import React from 'react';

export function LoadingSkeleton() {
  return (
    <div className="mt-6 sm:mt-10 md:mt-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-5xl mx-auto">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="opacity-0 animate-fade-in-up bg-[#151515] border border-[#2a2a2a] rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 flex flex-col"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            {/* Name skeleton */}
            <div className="h-7 sm:h-8 md:h-9 w-3/4 bg-[#1a1a1a] rounded-lg mb-2 sm:mb-3 animate-shimmer" />
            {/* Role skeleton */}
            <div className="h-4 sm:h-5 md:h-6 w-1/2 bg-[#1a1a1a] rounded-lg mb-4 sm:mb-5 md:mb-6 animate-shimmer" />
            {/* Email skeleton */}
            <div className="space-y-2 sm:space-y-3">
              <div className="h-11 sm:h-12 md:h-14 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-3 sm:p-4 animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

