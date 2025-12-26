'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CompanyList } from '@/components/companies/company-list';

/**
 * BankContent - Reusable bank interface component
 *
 * Displays company search and grid. Designed to work within modal or page context.
 * Handles search state internally and passes to CompanyList for filtering.
 */
export function BankContent() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'var(--font-fira-mono)' }}>
      {/* Search section - fixed at top */}
      <div className="p-6 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            type="text"
            placeholder="search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-black border-white/10 text-white placeholder:text-white/40 focus-visible:border-white/20 lowercase"
            style={{ fontFamily: 'var(--font-fira-mono)' }}
          />
        </div>
      </div>

      {/* Company list - scrollable content */}
      <div className="flex-1 overflow-y-auto p-6">
        <CompanyList searchQuery={searchQuery} />
      </div>
    </div>
  );
}
