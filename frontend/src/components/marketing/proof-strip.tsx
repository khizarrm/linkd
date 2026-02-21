"use client";

const PROOF_ITEMS = [
  {
    title: "Built for internship search",
    body: "Designed for students who need interviews, not generic networking.",
  },
  {
    title: "Reach real decision-makers",
    body: "Target founders, hiring managers, and recruiters instead of dead inboxes.",
  },
  {
    title: "Move faster than job boards",
    body: "Find contacts and send outreach without waiting in crowded applications.",
  },
  {
    title: "Personalized to your goals",
    body: "Linkd tailors search and messaging based on your target internship profile.",
  },
];

export function ProofStrip() {
  return (
    <section id="proof" className="px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-3 md:grid-cols-2 xl:grid-cols-4">
        {PROOF_ITEMS.map((item) => (
          <article
            key={item.title}
            className="pop-card relative overflow-hidden rounded-2xl p-5"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/7 to-transparent" />
            <h3 className="text-sm font-semibold tracking-tight text-[#f1ecde]">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#aab0aa]">
              {item.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
