"use client";

type PersonaCardsProps = {
  onOpenSignIn: (source: string) => void;
};

export function PersonaCards({ onOpenSignIn }: PersonaCardsProps) {
  return (
    <section id="for-students" className="px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#949992]">
            Use cases
          </p>
          <h2 className="mt-3 font-serif text-4xl text-[#f7f2e7] md:text-5xl">
            Built for focused outreach
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-[#2a2d2a] bg-[#111311] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.16em] text-[#93a08c]">
              Students
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-[#efe9db]">
              Internship and job outreach
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#aab0a9]">
              Use Linkd to reach startup founders, hiring managers, and
              recruiters directly instead of sending another ignored application.
            </p>
            <button
              onClick={() => onOpenSignIn("persona_students")}
              className="mt-6 rounded-full border border-[#3a3f39] px-5 py-2.5 text-sm font-medium text-[#e4dfd2] transition-colors hover:bg-[#171918]"
            >
              Start as a student
            </button>
          </article>

          <article className="rounded-3xl border border-[#2d2924] bg-[#15110d] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.16em] text-[#c8a884]">
              Creators and founders
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-[#f3e5d0]">
              Brand outreach and partnerships
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#c5b39d]">
              Reach decision-makers at smaller brands where direct contact moves
              faster than broad “business@” emails.
            </p>
            <button
              onClick={() => onOpenSignIn("persona_creators")}
              className="mt-6 rounded-full border border-[#5a4d3f] px-5 py-2.5 text-sm font-medium text-[#f0ddc4] transition-colors hover:bg-[#201911]"
            >
              Start for partnerships
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}
