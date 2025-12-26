'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanies } from '@/hooks/use-companies';
import { CompanyCard } from './company-card';
import { CompanyDetailDialog } from './company-detail-dialog';

interface CompanyListProps {
  searchQuery?: string;
}

export function CompanyList({ searchQuery = '' }: CompanyListProps) {
  const { companies, isLoading } = useCompanies();
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter companies based on search query and email availability
  const filteredCompanies = companies.filter((company: any) => {
    // Filter out companies with no emails
    // TODO: Backend should provide hasEmailableEmployees flag to optimize this
    // For now, we filter based on emailableEmployeesCount if available
    if (company.emailableEmployeesCount !== undefined && company.emailableEmployeesCount === 0) {
      return false;
    }

    // Apply search query filter
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const companyName = company.companyName?.toLowerCase() || '';
    const industry = company.industry?.toLowerCase() || '';
    const description = company.description?.toLowerCase() || '';
    const website = company.website?.toLowerCase() || '';
    const headquarters = company.headquarters?.toLowerCase() || '';

    return (
      companyName.includes(query) ||
      industry.includes(query) ||
      description.includes(query) ||
      website.includes(query) ||
      headquarters.includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[200px]" />
        ))}
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-white/60 text-sm lowercase" style={{ fontFamily: 'var(--font-fira-mono)' }}>
          no companies found
        </p>
      </div>
    );
  }

  if (filteredCompanies.length === 0 && searchQuery.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-white/60 text-sm lowercase" style={{ fontFamily: 'var(--font-fira-mono)' }}>
          no companies match your search
        </p>
      </div>
    );
  }

  const handleCompanyClick = (company: any) => {
    setSelectedCompany(company);
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCompanies.map((company: any, index: number) => (
          <CompanyCard
            key={company.id}
            company={company}
            index={index}
            onClick={() => handleCompanyClick(company)}
          />
        ))}
      </div>

      <CompanyDetailDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        company={selectedCompany}
      />
    </>
  );
}

