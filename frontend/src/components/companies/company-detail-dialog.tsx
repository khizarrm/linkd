'use client';

import { useState, useEffect } from 'react';
import { Building2, ExternalLink, Loader2, Mail } from 'lucide-react';
import { protectedApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Company {
  id: number;
  companyName: string;
  website: string | null;
  description: string | null;
  industry: string | null;
  [key: string]: any;
}

interface Employee {
  id: number;
  employeeName: string;
  employeeTitle: string | null;
  email: string | null;
  companyId: number;
}

interface CompanyDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onCompose: (employee: Employee) => void;
}

function extractDomain(url: string | null | undefined): string | null {
  if (!url || url.trim() === "") {
    return null;
  }
  
  try {
    const trimmed = url.trim();
    let normalized = trimmed;
    
    // Add protocol if missing
    if (!trimmed.match(/^https?:\/\//i)) {
      normalized = `https://${trimmed}`;
    }
    
    const urlObj = new URL(normalized);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

export function CompanyDetailDialog({ open, onOpenChange, company, onCompose }: CompanyDetailDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faviconError, setFaviconError] = useState(false);

  useEffect(() => {
    if (open && company) {
      setIsLoading(true);
      setError(null);
      protectedApi.getCompanyEmployees(company.id)
        .then(data => {
          if (data.success && data.employees) {
            setEmployees(data.employees);
          } else {
            setError('Failed to load employees');
          }
        })
        .catch(err => {
          console.error('Failed to load employees:', err);
          setError('Failed to load employees');
        })
        .finally(() => setIsLoading(false));
    } else {
      // Reset when dialog closes
      setEmployees([]);
      setError(null);
    }
  }, [open, company]);

  if (!company) return null;

  const domain = company.website ? extractDomain(company.website) : null;
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
          {/* Header */}
          <div className="flex items-start gap-4 p-4 sm:p-6 border-b border-[#2a2a2a] flex-shrink-0">
            {/* Logo */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-white/5 p-2 flex items-center justify-center border border-white/10 shrink-0">
              {faviconUrl && !faviconError ? (
                <img
                  src={faviconUrl}
                  alt={`${company.companyName} logo`}
                  className="w-full h-full object-contain"
                  onError={() => setFaviconError(true)}
                />
              ) : (
                <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-[#6a6a6a]" />
              )}
            </div>

            {/* Company Info */}
            <div className="flex-1 min-w-0">
              <DialogHeader className="p-0">
                <DialogTitle className="text-xl sm:text-2xl font-light tracking-tight text-[#e8e8e8]">
                  {company.companyName}
                </DialogTitle>
              </DialogHeader>
              {company.website && (
                <a
                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 mt-2 text-xs sm:text-sm font-sans font-light text-[#6a6a6a] hover:text-[#e8e8e8] transition-colors"
                >
                  <span className="truncate">{company.website}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              )}
            </div>
          </div>

          {/* Body - Employees List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-[#6a6a6a] font-sans font-light text-sm">
                  {error}
                </p>
              </div>
            ) : employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-[#6a6a6a] font-sans font-light text-sm">
                  No employees found
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between gap-4 p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-lg font-light tracking-tight text-[#e8e8e8] break-words">
                        {employee.employeeName}
                      </h4>
                      {employee.employeeTitle && (
                        <p className="text-xs sm:text-sm font-sans font-light text-[#6a6a6a] mt-1">
                          {employee.employeeTitle}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => onCompose(employee)}
                      disabled={!employee.email}
                      className="bg-white text-black hover:bg-gray-200 font-sans font-light tracking-wide shrink-0"
                      size="sm"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Compose
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

