'use client';

import React, { useState } from 'react';
import { Copy, Check, Mail } from 'lucide-react';
import type { OrchestratorPerson } from '@/lib/api';
import { triggerHaptic } from '@/lib/haptics';

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

      // Success haptic feedback
      triggerHaptic('medium');

      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (error) {
      console.error('Failed to copy email:', error);

      // Error haptic feedback
      triggerHaptic('error');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-[#0a0a0a] border border-white/10 rounded-lg animate-bounce-in">
      {hasEmail && firstEmail ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            {faviconUrl && !faviconError && (
              <img
                src={faviconUrl}
                alt={`${companyName} favicon`}
                className="w-6 h-6 rounded shrink-0 mt-1"
                onError={() => setFaviconError(true)}
              />
            )}
            <div className="flex-1">
              <h3 className="text-xl font-medium mb-1" style={{ fontFamily: 'var(--font-fira-mono)' }}>
                {person.name}
              </h3>
              {person.role && (
                <p className="text-sm text-white/70" style={{ fontFamily: 'var(--font-fira-mono)' }}>
                  {person.role}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[#141414] border border-white/5 rounded">
            <Mail className="w-4 h-4 text-white/50 shrink-0" />
            <code className="flex-1 text-sm text-white/90 truncate" style={{ fontFamily: 'var(--font-fira-mono)' }}>
              {firstEmail}
            </code>
            <button
              onClick={() => handleCopyEmail(firstEmail)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-sm transition-all duration-[150ms] hover:scale-[1.02] will-change-transform"
              style={{ fontFamily: 'var(--font-fira-mono)', transform: 'translateZ(0)' }}
            >
              {copiedEmail === firstEmail ? (
                <span className="flex items-center gap-2">
                  <Check className="w-3 h-3" />
                  Copied
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Copy className="w-3 h-3" />
                  Copy
                </span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-center text-white/70" style={{ fontFamily: 'var(--font-fira-mono)' }}>
          No verified email found
        </p>
      )}
    </div>
  );
}
