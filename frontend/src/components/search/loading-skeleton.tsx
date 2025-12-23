import React from 'react';

interface LoadingSkeletonProps {
  isExiting?: boolean;
}

export function LoadingSkeleton({ isExiting = false }: LoadingSkeletonProps) {
  return (
    <div className={`mt-8 w-full max-w-2xl mx-auto ${isExiting ? 'animate-fade-out-down' : 'animate-bounce-in'}`}>
      <div className="p-6 bg-[#0a0a0a] border border-white/10 rounded-lg">
        <div className="space-y-4">
          {/* Name and role skeleton */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-white/5 rounded animate-pulse" />
            <div className="flex-1">
              <div className="h-6 w-3/4 bg-white/5 rounded mb-2 animate-pulse" />
              <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
          {/* Email skeleton */}
          <div className="flex items-center gap-3 p-3 bg-[#141414] border border-white/5 rounded">
            <div className="w-4 h-4 bg-white/5 rounded animate-pulse" />
            <div className="flex-1 h-4 bg-white/5 rounded animate-pulse" />
            <div className="w-20 h-8 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

