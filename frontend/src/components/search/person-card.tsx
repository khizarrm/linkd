'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { OrchestratorPerson } from '@/lib/api';

interface PersonCardProps {
  person: OrchestratorPerson;
  favicon?: string | null;
  companyName?: string;
  index: number;
}

export function PersonCard({ person, favicon, companyName, index }: PersonCardProps) {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const copyToClipboard = async (email: string) => {
    await navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <article
      className="opacity-0 animate-fade-in-up bg-[#151515] border border-[#2a2a2a] rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 hover:border-[#3a3a3a] active:scale-[0.98] transition-all duration-300 flex flex-col relative"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Favicon - Top Right */}
      {favicon && (
        <div className="absolute top-5 right-5 sm:top-6 sm:right-6 md:top-8 md:right-8">
          <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-[#0a0a0a] border border-[#2a2a2a] p-1.5 sm:p-2 flex items-center justify-center">
            <img
              src={favicon}
              alt={`${companyName} logo`}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      {/* Person Info */}
      <div className="mb-5 sm:mb-6 flex-grow pr-12 sm:pr-14 md:pr-16">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight mb-2 sm:mb-3">
          {person.name}
        </h2>
        {person.role && (
          <p className="text-xs sm:text-sm md:text-base font-sans font-light text-[#6a6a6a] leading-relaxed">
            {person.role}
          </p>
        )}
      </div>

      {/* Emails */}
      {person.emails && person.emails.length > 0 ? (
        <div className="space-y-2 sm:space-y-3">
          {person.emails.map((email, emailIndex) => (
            <div key={`${email}-${emailIndex}`} className="group">
              <div className="flex items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg sm:rounded-xl hover:border-[#3a3a3a] active:bg-[#151515] transition-all duration-300 min-h-[48px] sm:min-h-[52px]">
                <a
                  href={`mailto:${email}`}
                  className="font-sans text-xs sm:text-sm font-light tracking-wide text-[#e8e8e8] hover:text-white active:text-white transition-colors duration-300 truncate flex-1 mr-1 sm:mr-2"
                  title={email}
                >
                  {email}
                </a>
                <button
                  onClick={() => copyToClipboard(email)}
                  className="text-[#6a6a6a] hover:text-[#e8e8e8] active:text-white active:scale-90 transition-all duration-300 flex-shrink-0 p-2 -m-2 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center"
                  title="Copy email"
                >
                  {copiedEmail === email ? (
                    <Check className="h-4 w-4 sm:h-4 sm:w-4" />
                  ) : (
                    <Copy className="h-4 w-4 sm:h-4 sm:w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs sm:text-sm font-sans font-light text-[#4a4a4a] italic">
          No verified emails found
        </p>
      )}
    </article>
  );
}

