'use client';

import { SidebarSection } from '../sidebar-section';

interface HistoryItem {
  query: string;
  date: string;
  count: number;
}

const HISTORY_ITEMS: HistoryItem[] = [
  { query: 'Tim Cook, Apple', date: '2 hours ago', count: 3 },
  { query: 'Exa AI founders', date: 'Yesterday', count: 2 },
  { query: 'Cohere team', date: '2 days ago', count: 5 },
];

export function HistoryContent() {
  return (
    <SidebarSection title="Search History">
      <div className="space-y-3">
        {HISTORY_ITEMS.map((item, idx) => (
          <div
            key={idx}
            className="px-3 py-3 rounded-lg bg-[#151515] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all duration-300"
          >
            <p className="text-sm font-light text-[#e8e8e8] mb-1 truncate">
              {item.query}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-light text-[#6a6a6a]">
                {item.date}
              </span>
              <span className="text-xs font-light text-[#4a4a4a]">
                {item.count} results
              </span>
            </div>
          </div>
        ))}
      </div>
    </SidebarSection>
  );
}
