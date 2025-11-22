'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanies } from '@/hooks/use-companies';
import { CompanyCard } from './company-card';
import { CompanyDetailDialog } from './company-detail-dialog';
import { EmployeeComposeModal } from './employee-compose-modal';

interface Employee {
  id: number;
  employeeName: string;
  employeeTitle: string | null;
  email: string | null;
  companyId: number;
}

export function CompanyList() {
  const { companies, isLoading } = useCompanies();
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [composingEmployee, setComposingEmployee] = useState<{ employee: Employee; companyName: string } | null>(null);

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
        <p className="text-[#6a6a6a] font-sans font-light text-sm">
          No companies found
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
        {companies.map((company, index) => (
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
        onCompose={(employee) => {
          setComposingEmployee({ employee, companyName: selectedCompany?.companyName || '' });
          setIsDialogOpen(false); // Close company dialog
        }}
      />

      {/* Employee Compose Modal - rendered at parent level so it persists */}
      {composingEmployee && (
        <EmployeeComposeModal
          open={!!composingEmployee}
          onOpenChange={(open) => {
            if (!open) setComposingEmployee(null);
          }}
          employee={composingEmployee.employee}
          companyName={composingEmployee.companyName}
        />
      )}
    </>
  );
}

