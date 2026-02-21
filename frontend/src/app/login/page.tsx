"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { CheckCircle2, Loader2 } from "lucide-react";
import { posthog } from "@/../instrumentation-client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { signIn } = useSignIn();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  if (isLoaded && isSignedIn) {
    return null;
  }

  const handleGoogleSignIn = async (source: string) => {
    setError(null);
    setIsLoading(true);
    posthog.capture("landing_cta_clicked", { source });

    try {
      if (!signIn) {
        throw new Error("Sign in is not initialized");
      }

      sessionStorage.setItem("linkd_signin_source", source);
      posthog.capture("google_signin_started", { source });

      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to sign in with Google. Please try again.";

      posthog.capture("google_signin_failed", { source, error: message });
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f7f3e9]">
      <main className="grid min-h-screen lg:grid-cols-[2fr_1fr]">
        <section className="flex items-center px-6 py-12 md:px-10 lg:px-16">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.22em] text-[#9ba099]">
              Linkd
            </p>
            <h1 className="mt-3 font-serif text-4xl leading-[1] md:text-5xl lg:text-6xl">
              Outreach that reaches real people.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-[#b9beb8] md:text-lg">
              Linkd helps you find decision-makers, verify emails, and send
              clean outreach from one place.
            </p>

            <div className="mt-8 space-y-4">
              {[
                "Find founders, recruiters, and hiring managers quickly",
                "Get verified or likely-valid emails with less guesswork",
                "Draft and send outreach without tool hopping",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 text-[#d6d0c2]" />
                  <p className="text-sm text-[#d2d7d1] md:text-base">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="flex items-center justify-center border-t border-white/10 px-6 py-12 md:px-10 lg:border-l lg:border-t-0 lg:px-12">
          <div className="w-full max-w-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8d928b]">
              Sign in
            </p>
            <h2 className="mt-2 text-3xl font-medium text-[#f7f3e9]">
              Continue with Google
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#aab0a9]">
              Start using Linkd for outreach in under a minute.
            </p>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <Button
              onClick={() => handleGoogleSignIn("split_right_panel")}
              disabled={isLoading}
              className="mt-6 h-11 w-full rounded-full bg-[#f1e8d4] text-sm font-semibold text-[#111210] hover:bg-[#e7ddc5]"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              {isLoading ? "Redirecting..." : "Sign in with Google"}
            </Button>

            <Separator className="my-5 bg-white/10" />

            <p className="text-xs text-[#8f938d]">
              Google is used for authentication only.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
