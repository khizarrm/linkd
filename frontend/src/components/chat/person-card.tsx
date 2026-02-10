"use client";

import { ExternalLink } from "lucide-react";

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
    </div>
  );
}
