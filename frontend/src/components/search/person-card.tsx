'use client';

import React, { useState } from 'react';
import { BadgeCheck, Building2, Copy, Check, Mail } from 'lucide-react';
import type { OrchestratorPerson } from '@/lib/api';
import { Button } from '@/components/ui/button';

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
    <article
      className="opacity-0 animate-fade-in-up bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5 sm:p-6 hover:border-[#3a3a3a] transition-all duration-300"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {hasEmail && firstEmail ? (
        <div className="space-y-4">
          {/* Top row: Name, role, company */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg sm:text-xl font-light text-[#f5f5f0] truncate">
                  {person.name}
                </h2>
                <BadgeCheck className="w-4 h-4 text-[#d4af37] shrink-0" />
              </div>
              {person.role && (
                <p className="text-sm font-light text-[#9a9a90] truncate mb-2">
                  {person.role}
                </p>
              )}
              {companyUrl ? (
                <a
                  href={companyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#6a6a6a] hover:text-[#e8e8e8] transition-colors w-fit"
                >
                  {faviconUrl && !faviconError ? (
                    <div className="w-4 h-4 rounded bg-white/5 p-0.5 flex items-center justify-center">
                      <img
                        src={faviconUrl}
                        alt={`${companyName} logo`}
                        className="w-full h-full object-contain"
                        onError={() => setFaviconError(true)}
                      />
                    </div>
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                  <span className="text-xs font-light truncate">{companyName || domain}</span>
                </a>
              ) : companyName && (
                <div className="flex items-center gap-2 text-[#6a6a6a]">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs font-light truncate">{companyName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom row: Email with copy button */}
          <div className="flex items-center gap-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3">
            <Mail className="w-4 h-4 text-[#6a6a6a] shrink-0" />
            <code className="flex-1 text-sm font-mono text-[#e8e8e8] truncate">
              {firstEmail}
            </code>
            <Button
              onClick={() => handleCopyEmail(firstEmail)}
              size="sm"
              className="shrink-0 bg-[#d4af37] hover:bg-[#c49d2a] text-[#0a0a0a] h-8 px-4 rounded-md font-light text-xs"
            >
              {copiedEmail === firstEmail ? (
                <>
                  <Check className="w-3 h-3 mr-1.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="text-3xl mb-2 opacity-20">✕</div>
          <p className="text-sm font-light text-[#6a6a6a]">
            No verified email found
          </p>
        </div>
      )}
    </article>
  );
}
