'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CompanyList } from '@/components/companies/company-list';

export default function BankPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 px-4">
        <h1 className="text-lg font-semibold">Bank</h1>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6a6a6a]" />
          <Input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#151515] border-[#2a2a2a] text-[#e8e8e8] placeholder:text-[#6a6a6a] focus-visible:border-[#3a3a3a]"
          />
        </div>
        <CompanyList searchQuery={searchQuery} />
      </div>
    </>
  );
}

