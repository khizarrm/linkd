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
    <div className="rounded-2xl bg-card px-4 py-4 space-y-3 ring-1 ring-border shadow-sm">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-foreground">{person.name}</p>
        {person.snippet && (
          <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            {person.snippet}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {person.linkedinUrl && (
          <a
            href={person.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#0077B5] hover:bg-[#006097] active:bg-[#005586] transition-all py-2.5 text-[13px] font-medium text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View LinkedIn
          </a>
        )}
        <button
          onClick={handleCopyMessage}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-card hover:bg-muted ring-1 ring-border transition-all py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy Invite Message
            </>
          )}
        </button>
      </div>
    </div>
  );
}
