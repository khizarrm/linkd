'use client';

import { Building2, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface Company {
  id: number;
  companyName: string;
  website: string | null;
  description: string | null;
  industry: string | null;
  headquarters: string | null;
  [key: string]: any;
}

interface CompanyCardProps {
  company: Company;
  index: number;
  onClick?: () => void;
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

export function CompanyCard({ company, index, onClick }: CompanyCardProps) {
  const [faviconError, setFaviconError] = useState(false);

  const domain = company.website ? extractDomain(company.website) : null;
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;
  const displayUrl = company.website || 'no website';

  return (
    <article
      className="bg-black border border-white/10 rounded-lg p-6 hover:border-white/20 transition-all duration-200 flex flex-col h-full group cursor-pointer"
      style={{
        animationDelay: `${index * 0.05}s`,
        fontFamily: 'var(--font-fira-mono)'
      }}
      onClick={onClick}
    >
      <div className="flex flex-col gap-4 flex-grow">
        {/* Header with Logo and Name */}
        <div className="flex items-start gap-3">
          {/* Logo */}
          <div className="w-10 h-10 rounded bg-white/5 p-2 flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-colors shrink-0">
            {faviconUrl && !faviconError ? (
              <img
                src={faviconUrl}
                alt={`${company.companyName} logo`}
                className="w-full h-full object-contain"
                onError={() => setFaviconError(true)}
              />
            ) : (
              <Building2 className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
            )}
          </div>

          {/* Company Name and Industry */}
          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="text-lg font-medium text-white lowercase break-words">
              {company.companyName}
            </h3>
            {company.industry && (
              <p className="text-sm text-white/60 lowercase">
                {company.industry}
              </p>
            )}
          </div>
        </div>

        {/* Website URL */}
        {company.website ? (
          <a
            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors group/link lowercase"
          >
            <span
              className="underline decoration-white/20 hover:decoration-white/40 transition-all min-w-0 truncate"
            >
              {displayUrl}
            </span>
            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
          </a>
        ) : (
          <p className="text-sm text-white/60 lowercase">
            no website available
          </p>
        )}

        {/* Description */}
        {company.description && (
          <div className="flex-grow">
            <p className="text-sm text-white/60 leading-relaxed line-clamp-3 lowercase">
              {company.description}
            </p>
          </div>
        )}

        {/* Additional Info */}
        {(company.headquarters || company.employeeCountMin || company.employeeCountMax) && (
          <div className="flex flex-wrap gap-3 text-sm text-white/60 lowercase">
            {company.headquarters && (
              <span>{company.headquarters}</span>
            )}
            {(company.employeeCountMin || company.employeeCountMax) && (
              <span>
                {company.employeeCountMin && company.employeeCountMax
                  ? `${company.employeeCountMin}-${company.employeeCountMax} employees`
                  : company.employeeCountMin
                  ? `${company.employeeCountMin}+ employees`
                  : `${company.employeeCountMax} employees`}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

