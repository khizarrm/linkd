"use client";

import { useEffect, useState } from "react";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { posthog } from "@/../instrumentation-client";

type SignInModalProps = {
  isOpen: boolean;
  source: string;
  onClose: () => void;
};

export function SignInModal({ isOpen, source, onClose }: SignInModalProps) {
  const { isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    onClose();
    router.push("/");
  }, [isSignedIn, onClose, router]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);

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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-surface w-full max-w-md rounded-2xl p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#9ea29d]">
              Linkd
            </p>
            <h2 className="mt-2 text-2xl font-medium text-[#f7f2e7]">
              Continue with Google
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[#8d928b] transition-colors hover:text-[#f7f2e7]"
            aria-label="Close sign in modal"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-[#b7bcb5]">
          Use your school or personal Gmail to start internship outreach with
          Linkd. We only use Google for auth.
        </p>

        {error ? <p className="mb-3 text-sm text-[#f8a4a4]">{error}</p> : null}

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-full bg-[#f7f2e7] px-5 py-3 font-medium text-[#121311] transition-colors hover:bg-[#ebe4d6] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          {isLoading ? "Redirecting..." : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}
