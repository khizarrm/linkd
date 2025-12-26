'use client';

import { useState, useEffect } from 'react';
import { Building2, ExternalLink, Copy, Check } from 'lucide-react';
import { useProtectedApi } from '@/hooks/use-protected-api';
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

export function CompanyDetailDialog({ open, onOpenChange, company }: CompanyDetailDialogProps) {
  const protectedApi = useProtectedApi();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faviconError, setFaviconError] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (open && company) {
      setIsLoading(true);
      setError(null);
      protectedApi.getCompanyEmployees(company.id)
        .then(data => {
          if (data.success && data.employees) {
            setEmployees(data.employees);
          } else {
            setError('failed to load employees');
          }
        })
        .catch(err => {
          console.error('Failed to load employees:', err);
          setError('failed to load employees');
        })
        .finally(() => setIsLoading(false));
    } else {
      // Reset when dialog closes
      setEmployees([]);
      setError(null);
      setCopiedEmail(null);
    }
  }, [open, company]);

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
  };

  if (!company) return null;

  const domain = company.website ? extractDomain(company.website) : null;
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 bg-black border-white/10"
        style={{ fontFamily: 'var(--font-fira-mono)' }}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-white/10 flex-shrink-0">
          {/* Logo */}
          <div className="w-12 h-12 rounded bg-white/5 p-2 flex items-center justify-center border border-white/10 shrink-0">
            {faviconUrl && !faviconError ? (
              <img
                src={faviconUrl}
                alt={`${company.companyName} logo`}
                className="w-full h-full object-contain"
                onError={() => setFaviconError(true)}
              />
            ) : (
              <Building2 className="w-6 h-6 text-white/40" />
            )}
          </div>

          {/* Company Info */}
          <div className="flex-1 min-w-0">
            <DialogHeader className="p-0">
              <DialogTitle className="text-xl md:text-2xl font-medium text-white lowercase">
                {company.companyName}
              </DialogTitle>
            </DialogHeader>
            {company.website && (
              <a
                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 mt-2 text-sm text-white/60 hover:text-white transition-colors lowercase"
              >
                <span className="truncate underline decoration-white/20 hover:decoration-white/40">{company.website}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            )}
          </div>
        </div>

        {/* Body - Employees List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-white/60 text-sm lowercase">
                {error}
              </p>
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-white/60 text-sm lowercase">
                no employees found
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-start justify-between gap-4 p-4 bg-black border border-white/10 rounded-lg hover:border-white/20 transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <h4 className="text-base md:text-lg font-medium text-white lowercase break-words">
                        {employee.employeeName}
                      </h4>
                      {employee.employeeTitle && (
                        <p className="text-sm text-white/60 mt-1 lowercase">
                          {employee.employeeTitle}
                        </p>
                      )}
                    </div>
                    {employee.email && (
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white/60 lowercase truncate">
                          {employee.email}
                        </p>
                        <button
                          onClick={() => copyEmail(employee.email!)}
                          className="shrink-0 p-1.5 hover:bg-white/10 rounded transition-colors"
                          title="Copy email"
                        >
                          {copiedEmail === employee.email ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-white/40 hover:text-white/60" />
                          )}
                        </button>
                      </div>
                    )}
                    {!employee.email && (
                      <p className="text-sm text-white/40 lowercase">
                        no email available
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

