"use client";

import { ArrowRight } from "lucide-react";
import { ProductPreview } from "./product-preview";

type HeroProps = {
  onOpenSignIn: (source: string) => void;
};

export function Hero({ onOpenSignIn }: HeroProps) {
  return (
    <section id="top" className="relative overflow-hidden px-5 pb-12 pt-12 md:px-8 md:pb-18 md:pt-14">
      <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-[#6e7f5a]/20 blur-3xl" />
      <div className="absolute -right-20 bottom-4 h-72 w-72 rounded-full bg-[#7d5f4a]/20 blur-3xl" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div className="relative z-10">
          <span className="glass-surface mb-4 inline-flex rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#d4d8d1]">
            Built for students
          </span>
          <p className="mb-4 text-xs uppercase tracking-[0.22em] text-[#9ea49b]">
            Internship Outreach Agent
          </p>
          <h1 className="font-serif text-[2.35rem] leading-[0.95] tracking-tight text-[#f7f2e7] sm:text-6xl">
            Get internship interviews with better outreach.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#b9bfb8] sm:text-lg">
            Linkd helps students find hiring managers and founders, verify
            emails, and send internship outreach in one flow. No scraping
            chaos. No dead inboxes.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onOpenSignIn("hero_primary")}
              className="inline-flex items-center gap-2 rounded-full bg-[#efe6d3] px-6 py-3 text-sm font-semibold text-[#121311] shadow-[0_10px_24px_rgba(0,0,0,0.26)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e5dac2] active:translate-y-0"
            >
              Start internship outreach
              <ArrowRight className="size-4" />
            </button>
          </div>

          <p className="mt-3 text-xs text-[#8f948e]">
            Google is used for authentication only.
          </p>
        </div>

        <div className="relative z-10">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
