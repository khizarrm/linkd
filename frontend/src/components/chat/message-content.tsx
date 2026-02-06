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
    <div className="rounded-2xl bg-stone-50 px-4 py-4 space-y-3">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-stone-900">{person.name}</p>
        <p className="text-[13px] text-stone-500 mt-0.5">
          {person.role} · {person.company}{person.location ? ` · ${person.location}` : ''}
        </p>
      </div>
      {person.description && (
        <p className="text-[13px] text-stone-400 leading-relaxed">{person.description}</p>
      )}
      {person.linkedinUrl && (
        <a
          href={person.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-stone-900 hover:bg-stone-800 transition-colors py-2.5 text-[13px] font-medium text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View LinkedIn
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
          ? 'bg-emerald-50 ring-1 ring-emerald-100'
          : 'bg-stone-100 ring-1 ring-stone-200'
      }`}
    >
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-stone-900">{entry.name}</p>
        <p className="text-[13px] text-stone-500">{entry.role} · {entry.company}</p>
      </div>
      {found ? (
        <div className="shrink-0 flex items-center gap-2">
          <a
            href={`mailto:${entry.email}`}
            className="flex items-center rounded-lg bg-emerald-100 hover:bg-emerald-200 transition-colors px-3 py-2 text-[13px] font-medium text-emerald-700"
          >
            {entry.email}
          </a>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center rounded-lg bg-white hover:bg-stone-50 ring-1 ring-stone-200 transition-colors p-2 text-stone-400 hover:text-stone-600"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <span className="shrink-0 text-[13px] font-medium text-stone-400 px-3 py-2">
          Not found
        </span>
      )}
    </div>
  );
}

function PeopleFinderView({ data }: { data: PeopleFinderResult }) {
  return (
    <div className="space-y-4">
      <p className="text-[15px] text-stone-700">{data.message}</p>

      {data.people && data.people.length > 0 && (
        <div className="space-y-3">
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
