"use client";

import { VideoPlayer } from "@/components/ui/video-player";

export function DemoSection() {
  return (
    <section id="demo" className="px-5 py-14 md:px-8 md:py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-8 rounded-3xl border border-[#242724] bg-[#0f110f] p-6 md:grid-cols-[0.95fr_1.05fr] md:p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#949992]">
            Product demo
          </p>
          <h2 className="mt-3 font-serif text-3xl text-[#f7f2e7] md:text-4xl">
            See the workflow in action
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[#aeb4ad] md:text-base">
            You should understand the product from one glance: search target
            company, get decision-makers, then draft and send.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-[#c7ccc5]">
            <li>Find recruiters, founders, and hiring managers.</li>
            <li>Surface verified or possible emails quickly.</li>
            <li>Generate concise outreach drafts without context switching.</li>
          </ul>
        </div>
        <div>
          <VideoPlayer
            src="https://youtu.be/3kL3nEbxLi0"
            title="Linkd product demo"
            aspectRatio="16/9"
            className="border-[#2d312d] bg-black"
          />
        </div>
      </div>
    </section>
  );
}
