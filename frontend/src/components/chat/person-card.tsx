"use client";

import { useState } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";

export interface PersonData {
  id: string;
  name: string;
  linkedinUrl: string;
  snippet: string;
}

interface ChatPersonCardProps {
  person: PersonData;
}

export function ChatPersonCard({ person }: ChatPersonCardProps) {
  const [copied, setCopied] = useState(false);

  const generateInviteMessage = (person: PersonData): string => {
    const firstName = person.name.split(' ')[0];
    const companyMatch = person.snippet?.match(/at\s+([A-Z][a-zA-Z\s]+)/);
    const company = companyMatch ? companyMatch[1].trim() : 'your company';

    return `Hi ${firstName}, hope you're well! I'm interested in opportunities at ${company} and thought it'd be great to connect. Would appreciate any insights you could share. Thanks!`;
  };

  const handleCopyMessage = async () => {
    try {
      const message = generateInviteMessage(person);
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  return (
    <div className="rounded-2xl bg-card p-3 gap-2 ring-1 ring-border shadow-sm aspect-square flex flex-col">
      <p className="text-xl font-bold text-foreground leading-tight">
        {person.name.split(' ').map((part, i) => (
          <span key={i} className="block">{part}</span>
        ))}
      </p>
      <div className="flex flex-col gap-1.5 mt-auto">
        {person.linkedinUrl && (
          <a
            href={person.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-[#0077B5] hover:bg-[#006097] active:bg-[#005586] transition-all py-1.5 text-[11px] font-medium text-white"
          >
            <ExternalLink className="h-3 w-3" />
            LinkedIn
          </a>
        )}
        <button
          onClick={handleCopyMessage}
          className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-card hover:bg-muted ring-1 ring-border transition-all py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy Invite
            </>
          )}
        </button>
      </div>
    </div>
  );
}
