"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { X, ArrowRight } from "lucide-react";

function SignInModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      console.log("[SignInModal] User is signed in, redirecting to home");
      onClose();
      router.push("/");
    }
  }, [isSignedIn, onClose, router]);

  const handleGoogleSignIn = async () => {
    console.log("[SignInModal] Google sign-in clicked");
    setError(null);
    setIsLoading(true);

    try {
      if (!signIn) {
        console.error("[SignInModal] signIn object is not available");
        throw new Error("Sign in is not initialized");
      }

      console.log("[SignInModal] Initiating OAuth with Google");
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: any) {
      console.error("[SignInModal] Error during Google sign-in:", err);
      setError(
        err?.message || "Failed to sign in with Google. Please try again.",
      );
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card/95 p-8 shadow-2xl backdrop-blur animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Linkd
            </p>
            <h2 className="text-2xl font-semibold text-foreground">
              Sign in
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {error && (
            <p className="text-sm text-destructive-foreground/90">{error}</p>
          )}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full rounded-full bg-primary px-5 py-3 text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 font-medium flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? "Loading..." : "Continue with Google"}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            We only use your Google account to create your workspace.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  if (isLoaded && isSignedIn) {
    return null;
  }

  const handleSignIn = () => {
    setShowSignIn(true);
  };

  return (
    <>
      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
          <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Linkd
                </p>
                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                  Find the right people. Send the right email.
                </h1>
              </div>
              <p className="text-base text-muted-foreground max-w-lg">
                A simple outreach agent for students looking for internships.
              </p>
              <ul className="space-y-4">
                {["Ask for recruiters or hiring managers at any company.", "Get verified emails you can actually reach.", "Send a clean intro directly from Linkd."].map(
                  (item) => (
                    <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <span className="text-foreground/90">{item}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card/90 p-8 shadow-xl">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Sign in
                </p>
                <h2 className="text-2xl font-semibold">
                  Continue with Google
                </h2>
                <p className="text-sm text-muted-foreground">
                  Use your school or personal Gmail account.
                </p>
                <button
                  onClick={handleSignIn}
                  className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 inline-flex items-center justify-center gap-2"
                >
                  Sign in with Google
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-xs text-muted-foreground">
                  We only use Google for authentication.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
