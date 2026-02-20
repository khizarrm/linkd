"use client";

const STEPS = [
  {
    id: "01",
    title: "Pick your internship target",
    body: "Tell Linkd your role, city, and the companies you want to reach.",
  },
  {
    id: "02",
    title: "Get people who can say yes",
    body: "Linkd finds founders, recruiters, and hiring managers with verified or possible emails.",
  },
  {
    id: "03",
    title: "Send your internship intro",
    body: "Generate a personalized internship draft and send from the same workflow.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-5 py-12 md:px-8 md:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-7 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[#949992]">
            Workflow
          </p>
          <h2 className="mt-2 font-serif text-3xl text-[#f7f2e7] md:text-4xl">
            How Linkd works
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {STEPS.map((step) => (
            <article
              key={step.id}
              className="pop-card relative overflow-hidden rounded-2xl p-4 md:p-5"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/6 to-transparent" />
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#40443f] text-[11px] font-semibold text-[#d2d8cf]">
                {step.id}
              </span>
              <h3 className="mt-3 text-base font-semibold text-[#efe9db] md:text-lg">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#abb0aa]">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
