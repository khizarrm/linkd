'use client';

import { SidebarSection } from '../sidebar-section';

const RECENT_SEARCHES = [
  'Tim Cook, Apple',
  'Exa AI founders',
  'Cohere leadership',
  'Poolside AI team',
];

export function DiscoverContent() {
  return (
    <SidebarSection title="Recent Searches">
      <div className="space-y-2">
        {RECENT_SEARCHES.map((search, idx) => (
          <button
            key={idx}
            className="w-full text-left px-3 py-2.5 rounded-lg bg-[#151515] border border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#1a1a1a] transition-all duration-300 group"
          >
            <p className="text-sm font-light text-[#e8e8e8] group-hover:text-white transition-colors truncate">
              {search}
            </p>
          </button>
        ))}
      </div>
    </SidebarSection>
  );
}
