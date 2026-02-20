"use client";

import { useEffect, useState } from "react";

type OnboardingModalProps = {
  open: boolean;
  isSaving?: boolean;
  defaultValue?: string | null;
  onSubmit: (data: { onboardingContext: string }) => Promise<void> | void;
};

export function OnboardingModal({
  open,
  isSaving = false,
  defaultValue,
  onSubmit,
}: OnboardingModalProps) {
  const [onboardingContext, setOnboardingContext] = useState(defaultValue || "");

  useEffect(() => {
    setOnboardingContext(defaultValue || "");
  }, [defaultValue, open]);

  if (!open) return null;

  const canSubmit = onboardingContext.trim().length > 0 && !isSaving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({ onboardingContext: onboardingContext.trim() });
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-black shadow-2xl overflow-hidden animate-slide-up-fade">
        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-xs uppercase tracking-[0.16em] text-white/50">onboarding</p>
          <h2 className="mt-2 text-2xl font-semibold text-white tracking-tight">
            Tell the agent why you&apos;re using this app
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Add context about your goals, background, and what good research should focus on.
          </p>
        </div>

        <div className="p-6">
          <textarea
            value={onboardingContext}
            onChange={(event) => setOnboardingContext(event.target.value)}
            placeholder="I&apos;m a CS student looking for backend internships in SF startups. Focus on teams hiring interns and prioritize companies where I can ship production code quickly..."
            className="min-h-[220px] w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/35"
          />
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
