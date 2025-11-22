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
  const displayUrl = company.website || 'No website';
  
  return (
    <article
      className="bg-[#151515] border border-[#2a2a2a] rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 hover:border-[#3a3a3a] active:scale-[0.98] transition-all duration-300 flex flex-col h-full group cursor-pointer relative"
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={onClick}
    >
      <div className="flex flex-col gap-4 flex-grow">
        {/* Header with Logo and Name */}
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-white/5 p-2 flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-colors shrink-0 flex-shrink-0">
            {faviconUrl && !faviconError ? (
              <img
                src={faviconUrl}
                alt={`${company.companyName} logo`}
                className="w-full h-full object-contain"
                onError={() => setFaviconError(true)}
              />
            ) : (
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-[#6a6a6a] group-hover:text-[#e8e8e8] transition-colors" />
            )}
          </div>
          
          {/* Company Name */}
          <div className="space-y-2 min-w-0 flex-1">
            <h3 className="text-xl sm:text-2xl font-light tracking-tight break-words text-[#e8e8e8]">
              {company.companyName}
            </h3>
            {company.industry && (
              <p className="text-xs sm:text-sm font-sans font-light text-[#6a6a6a]">
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
            className="flex items-center gap-2 text-xs sm:text-sm font-sans font-light text-[#6a6a6a] hover:text-[#e8e8e8] transition-colors group/link"
          >
            <span 
              className="underline decoration-white/20 hover:decoration-white/50 transition-all min-w-0 truncate"
              style={{ 
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}
            >
              {displayUrl}
            </span>
            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
          </a>
        ) : (
          <p className="text-xs sm:text-sm font-sans font-light text-[#6a6a6a]">
            No website available
          </p>
        )}

        {/* Description */}
        {company.description && (
          <div className="flex-grow">
            <p className="text-sm font-sans font-light text-[#6a6a6a] leading-relaxed line-clamp-3">
              {company.description}
            </p>
          </div>
        )}

        {/* Additional Info */}
        {(company.headquarters || company.employeeCountMin || company.employeeCountMax) && (
          <div className="flex flex-wrap gap-2 text-xs text-[#6a6a6a]">
            {company.headquarters && (
              <span className="font-light">{company.headquarters}</span>
            )}
            {(company.employeeCountMin || company.employeeCountMax) && (
              <span className="font-light">
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

