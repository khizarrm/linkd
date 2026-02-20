"use client";

import { Check, Mail, Search } from "lucide-react";

const PEOPLE = [
  { name: "Avery Kim", title: "Founding Engineer", email: "avery@arcana.ai" },
  { name: "Nora Patel", title: "Head of Talent", email: "nora@arcana.ai" },
];

export function ProductPreview() {
  return (
    <div className="pop-card relative overflow-hidden rounded-[28px] p-4 md:p-6">
      <div className="pointer-events-none absolute inset-x-4 top-0 h-16 bg-gradient-to-b from-white/6 to-transparent" />

      <div className="glass-surface mb-4 rounded-xl p-3 transition-colors">
        <div className="mb-2 flex items-center gap-2 text-xs text-[#8f948e]">
          <Search className="size-3.5" />
          Company search
        </div>
        <div className="rounded-lg border border-[#2f322f] bg-[#0a0b0a] px-3 py-2 text-sm text-[#d6dbd3]">
          fintech startups backend internship
        </div>
      </div>

      <div className="mb-4 grid gap-2">
        {PEOPLE.map((person) => (
          <div key={person.email} className="glass-surface flex items-center justify-between rounded-xl px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-[#f2ecdc]">{person.name}</p>
              <p className="text-xs text-[#a6aba5]">
                {person.title} · {person.email}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#28402a] bg-[#152317] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[#8fd28e]">
              <Check className="size-3" />
              Verified
            </span>
          </div>
        ))}
      </div>

      <div className="glass-surface rounded-xl p-4">
        <div className="mb-2 inline-flex items-center gap-1 text-xs text-[#92a6ff]">
          <Mail className="size-3.5" />
          Draft ready
        </div>
        <p className="text-xs uppercase tracking-[0.14em] text-[#8e938d]">
          Subject
        </p>
        <p className="mb-3 mt-1 text-sm text-[#ece6d8]">
          Backend internship - quick intro
        </p>
        <p className="text-sm leading-relaxed text-[#b9beb8]">
          Hey Avery, I am a CS student and I have been building production apps
          for 2+ years. I really like what your team is building at Arcana and
          I would love to contribute as a backend intern this term.
        </p>
      </div>
    </div>
  );
}
