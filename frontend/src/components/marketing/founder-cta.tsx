"use client";

type FounderCtaProps = {
  onOpenSignIn: (source: string) => void;
};

export function FounderCta({ onOpenSignIn }: FounderCtaProps) {
  return (
    <section className="px-5 pb-28 pt-6 md:px-8 md:pb-24 md:pt-8">
      <div className="mx-auto w-full max-w-6xl rounded-3xl border border-[#2a2c2a] bg-gradient-to-br from-[#151714] to-[#0e100e] p-7 md:p-10">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9da39b]">
          Founder note
        </p>
        <p className="mt-4 max-w-4xl font-serif text-2xl leading-tight text-[#f5efdf] md:text-4xl">
          I got 7 interviews and real startup conversations from cold outreach.
          Linkd exists to make that process repeatable.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={() => onOpenSignIn("founder_cta")}
            className="rounded-full bg-[#efe6d3] px-6 py-3 text-sm font-semibold text-[#121311] transition-colors hover:bg-[#e4d8bf]"
          >
            Start with Google
          </button>
          <a
            href="https://khizarmalik.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-[#3d403d] px-6 py-3 text-sm font-semibold text-[#dcd7cb] transition-colors hover:bg-[#181a18]"
          >
            Meet the founder
          </a>
        </div>
      </div>
    </section>
  );
}
