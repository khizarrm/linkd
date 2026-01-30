'use client';

import { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';

interface Person {
  name: string;
  role: string;
  location?: string;
  company: string;
  description: string;
  profileUrl?: string;
}

interface EmailEntry {
  name: string;
  role: string;
  company: string;
  email: string | null;
  emailSource: 'search' | 'guess' | 'none';
}

interface PeopleFinderResult {
  status: 'people_found' | 'emails_found' | 'cant_find';
  message: string;
  people?: Person[];
  emails?: EmailEntry[];
  followUp: string;
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
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 space-y-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white lowercase">{person.name}</p>
        <p className="text-xs text-white/50 lowercase">
          {person.role} · {person.company}{person.location ? ` · ${person.location}` : ''}
        </p>
      </div>
      {person.description && (
        <p className="text-xs text-white/35 leading-relaxed">{person.description}</p>
      )}
      {person.profileUrl && (
        <a
          href={person.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#0A66C2] hover:bg-[#0A66C2]/85 transition-colors py-2 text-xs font-medium text-white"
        >
          <ExternalLink className="h-3 w-3" />
          view profile
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
      className={`flex items-start justify-between gap-3 rounded-lg border px-3.5 py-3 ${
        found
          ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
          : 'border-red-500/20 bg-red-500/[0.04]'
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-white lowercase">{entry.name}</p>
        <p className="text-xs text-white/60 lowercase">{entry.role} · {entry.company}</p>
      </div>
      {found ? (
        <div className="shrink-0 flex items-center gap-1.5">
          <a
            href={`mailto:${entry.email}`}
            className="flex items-center rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 transition-colors px-3 py-1.5 text-xs font-medium text-emerald-400"
          >
            {entry.email}
          </a>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center rounded-md bg-white/10 hover:bg-white/15 transition-colors p-1.5 text-white/60 hover:text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      ) : (
        <span className="shrink-0 text-xs font-medium text-red-400/80 px-3 py-1.5">
          not found
        </span>
      )}
    </div>
  );
}

function PeopleFinderView({ data }: { data: PeopleFinderResult }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-white lowercase">{data.message}</p>

      {data.people && data.people.length > 0 && (
        <div className="space-y-2">
          {data.people.map((person, i) => (
            <PersonCard key={i} person={person} />
          ))}
        </div>
      )}

      {data.emails && data.emails.length > 0 && (
        <div className="space-y-2">
          {data.emails.map((entry, i) => (
            <EmailEntryCard key={i} entry={entry} />
          ))}
        </div>
      )}

      {data.followUp && (
        <p className="text-sm text-white/70 lowercase leading-relaxed whitespace-pre-wrap">{data.followUp}</p>
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
