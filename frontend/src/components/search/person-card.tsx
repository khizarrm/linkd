'use client';

import React, { useState } from 'react';
import { BadgeCheck, Building2, Copy, Check } from 'lucide-react';
import type { OrchestratorPerson } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PersonCardProps {
  person: OrchestratorPerson;
  favicon?: string | null;
  companyName?: string;
  index: number;
}

export function PersonCard({ person, favicon, companyName, index }: PersonCardProps) {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [faviconError, setFaviconError] = useState(false);

  const hasEmail = person.emails && person.emails.length > 0;
  const emails = person.emails || [];
  const firstEmail = emails[0] ?? null;
  
  const domain = firstEmail ? firstEmail.split('@')[1] : null;
  const companyUrl = domain ? `https://${domain}` : null;
  
  // Generate favicon URL from domain if not provided as prop
  const faviconUrl = favicon || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null);

  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (error) {
      console.error('Failed to copy email:', error);
    }
  };

  return (
    <>
    <article
        className="opacity-0 animate-fade-in-up bg-[#151515] border border-[#2a2a2a] rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 hover:border-[#3a3a3a] active:scale-[0.98] transition-all duration-300 flex flex-col h-full"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
        <div className="flex flex-col gap-4">
          {/* Header: Name and Badge */}
          <div className="flex items-start gap-3 min-w-0 w-full">
            <h2 
              className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight flex-1 min-w-0"
              style={{ 
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                hyphens: 'auto'
              }}
            >
              {person.name}
            </h2>
            {hasEmail && (
              <Badge variant="secondary" className="bg-blue-500 text-white dark:bg-blue-600 h-6 px-2 font-sans font-light tracking-wide shrink-0 whitespace-nowrap flex-shrink-0 mt-0.5">
                <BadgeCheck className="w-3.5 h-3.5 mr-1.5" />
                Verified
              </Badge>
            )}
          </div>
            
          {/* Info Section */}
          <div className="space-y-3 flex-grow">
            {person.role && (
              <p 
                className="text-xs sm:text-sm md:text-base font-sans font-light text-[#6a6a6a] leading-relaxed min-w-0"
                style={{ 
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere'
                }}
              >
                {person.role}
              </p>
            )}

            {/* Company Info Row */}
            <div className="flex items-center gap-2 text-[#6a6a6a] min-w-0">
              {companyUrl ? (
                <a 
                  href={companyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[#e8e8e8] transition-colors group min-w-0 flex-1"
                >
                  {faviconUrl && !faviconError ? (
                    <div className="w-5 h-5 rounded bg-white/5 p-0.5 flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-colors shrink-0 flex-shrink-0">
                      <img
                        src={faviconUrl}
                        alt={`${companyName} logo`}
                        className="w-full h-full object-contain"
                        onError={() => setFaviconError(true)}
                      />
                    </div>
                  ) : (
                    <Building2 className="w-4 h-4 shrink-0 flex-shrink-0" />
                  )}
                  <span 
                    className="text-xs sm:text-sm font-sans font-light tracking-wide underline decoration-white/20 hover:decoration-white/50 transition-all min-w-0"
                    style={{ 
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {companyName || domain || 'Company Website'}
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Building2 className="w-4 h-4 shrink-0 flex-shrink-0" />
                  <span 
                    className="text-xs sm:text-sm font-sans font-light tracking-wide min-w-0"
                    style={{ 
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {companyName}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Email Status & Action */}
        {hasEmail ? (
          <div className="mt-auto pt-6 space-y-2">
            {emails.map((email, emailIndex) => (
              <div 
                key={emailIndex}
                className="flex items-center gap-2 justify-between bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 hover:border-[#3a3a3a] transition-colors"
              >
                <span className="text-xs sm:text-sm font-sans font-light text-[#e8e8e8] flex-1 min-w-0 break-all">
                  {email}
                </span>
                <Button
                  onClick={() => handleCopyEmail(email)}
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 shrink-0 text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                >
                  {copiedEmail === email ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs sm:text-sm font-sans font-light text-[#4a4a4a] italic mt-auto pt-6">
            No verified emails found
          </p>
        )}
      </article>
    </>
  );
}
