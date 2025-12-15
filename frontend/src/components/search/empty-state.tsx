import React from 'react';
import type { OrchestratorPerson } from '@/lib/api';

interface EmptyStateProps {
  people?: OrchestratorPerson[];
  company?: string;
}

export function EmptyState({ people, company }: EmptyStateProps) {
  const personCount = people?.length || 0;

  return (
    <div className="opacity-0 animate-fade-in-up text-center px-4 max-w-2xl mx-auto">
      <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-6 sm:p-8">
        <div className="space-y-4">
          {/* Icon */}
          <div className="text-3xl sm:text-4xl opacity-20">∅</div>

          {/* Message */}
          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-light text-[#f5f5f0]">
              No emails found
            </h2>
            <p className="text-sm font-light text-[#9a9a90] leading-relaxed">
              We searched {company || 'this company'} {personCount > 0 && `and checked ${personCount} ${personCount === 1 ? 'person' : 'people'}`} but couldn't verify any email addresses.
            </p>
          </div>

          {/* People checked */}
          {people && people.length > 0 && (
            <div className="pt-3 border-t border-[#2a2a2a]">
              <p className="text-xs font-light text-[#6a6a6a] mb-2">People checked:</p>
              <div className="space-y-1.5">
                {people.map((person, index) => (
                  <div key={index} className="text-sm font-light text-[#9a9a90]">
                    {person.name} {person.role && <span className="text-[#6a6a6a]">· {person.role}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestion */}
          <p className="text-xs font-light text-[#6a6a6a] pt-3 border-t border-[#2a2a2a]">
            Try a different company or check back later
          </p>
        </div>
      </div>
    </div>
  );
}

