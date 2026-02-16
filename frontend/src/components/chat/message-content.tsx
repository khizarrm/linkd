'use client';

import { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';

interface Person {
  name: string;
  role: string;
  location?: string;
  company: string;
  description: string;
  linkedinUrl: string;
}

interface EmailEntry {
  name: string;
  role: string;
  company: string;
  email: string | null;
  emailSource: 'search' | 'guess' | 'none';
}

interface PeopleFinderResult {
  status: 'people_found' | 'emails_found' | 'cant_find' | 'greeting';
  message: string;
  people?: Person[];
  emails?: EmailEntry[];
}

function tryParsePeopleFinder(content: string): PeopleFinderResult | null {
  if (!content.trimStart().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed.status && parsed.message && typeof parsed.status === 'string') {
      return parsed as PeopleFinderResult;
    }
  } catch {
    return null;
  }
  return null;
}

function PersonCard({ person }: { person: Person }) {
  return (
    <div className="rounded-2xl bg-card p-3 gap-2 ring-1 ring-border shadow-sm aspect-square flex flex-col">
      <div className="min-w-0">
        <p className="text-xl font-bold text-foreground leading-tight">
          {person.name.split(' ').map((part, i) => (
            <span key={i} className="block">{part}</span>
          ))}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
          {person.role} · {person.company}
        </p>
      </div>
      {person.linkedinUrl && (
        <a
          href={person.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-[#0077B5] hover:bg-[#006097] active:bg-[#005586] transition-all py-1.5 text-[11px] font-medium text-white mt-auto"
        >
          <ExternalLink className="h-3 w-3" />
          LinkedIn
        </a>
      )}
    </div>
  );
}

function EmailEntryCard({ entry }: { entry: EmailEntry }) {
  const [copied, setCopied] = useState(false);
  const found = !!entry.email;

  const handleCopy = () => {
    if (!entry.email) return;
    navigator.clipboard.writeText(entry.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3.5 ${
        found
          ? 'bg-emerald-950/30 ring-1 ring-emerald-800/50'
          : 'bg-muted ring-1 ring-border'
      }`}
    >
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-foreground">{entry.name}</p>
        <p className="text-[13px] text-muted-foreground">{entry.role} · {entry.company}</p>
      </div>
      {found ? (
        <div className="shrink-0 flex items-center gap-2">
          <a
            href={`mailto:${entry.email}`}
            className="flex items-center rounded-lg bg-emerald-900/50 hover:bg-emerald-900/70 transition-colors px-3 py-2 text-[13px] font-medium text-emerald-400"
          >
            {entry.email}
          </a>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center rounded-lg bg-card hover:bg-muted ring-1 ring-border transition-colors p-2 text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <span className="shrink-0 text-[13px] font-medium text-muted-foreground px-3 py-2">
          Not found
        </span>
      )}
    </div>
  );
}

function PeopleFinderView({ data }: { data: PeopleFinderResult }) {
  return (
    <div className="space-y-4">
      <p className="text-[15px] text-muted-foreground">{data.message}</p>

      {data.people && data.people.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          {data.people.map((person, i) => (
            <PersonCard key={i} person={person} />
          ))}
        </div>
      )}

      {data.emails && data.emails.length > 0 && (
        <div className="space-y-3">
          {data.emails.map((entry, i) => (
            <EmailEntryCard key={i} entry={entry} />
          ))}
        </div>
      )}

    </div>
  );
}

export function MessageContent({ content }: { content: string }) {
  const parsed = tryParsePeopleFinder(content);

  if (parsed) {
    return <PeopleFinderView data={parsed} />;
  }

  return <>{content}</>;
}
