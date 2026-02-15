"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { Mail, X, Search, Send, ArrowRight, Users } from "lucide-react";

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-black border border-white/10 rounded-lg p-8 animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "var(--font-fira-mono)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-medium text-white">sign in</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-white text-black rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-3"
            style={{ fontFamily: "var(--font-fira-mono)" }}
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
            {isLoading ? "Loading..." : "continue with google"}
          </button>
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
      <div
        className="bg-black min-h-screen relative overflow-x-hidden"
        style={{ fontFamily: "var(--font-fira-mono)" }}
      >
        <div className="grain-overlay" />

        <nav className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
          <div className="text-white font-bold text-xl tracking-tight">linkd</div>
          <button
            onClick={handleSignIn}
            className="px-4 py-2 border border-white/20 text-white hover:bg-white/10 transition-all duration-200 lowercase rounded text-sm"
          >
            sign in
          </button>
        </nav>

        <div className="relative pt-32 pb-20 px-6 flex flex-col items-center justify-center min-h-[80vh] w-full max-w-5xl mx-auto text-center z-10">
          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 text-white opacity-0 animate-fade-in-up tracking-tighter"
            style={{ animationDelay: "0ms" }}
          >
            stop applying<br />into the void.
          </h1>

          <p
            className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl opacity-0 animate-fade-in-up leading-relaxed"
            style={{ animationDelay: "150ms" }}
          >
            automate your outreach with AI. find decision-makers, get verified emails, and send personalized messages in seconds.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-4 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "300ms" }}
          >
            <button
              onClick={handleSignIn}
              className="px-8 py-4 bg-white text-black hover:bg-white/90 transition-all duration-200 rounded font-medium flex items-center gap-2 group"
            >
              start for free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-4 border border-white/20 text-white hover:bg-white/10 transition-all duration-200 rounded"
            >
              how it works
            </button>
          </div>
        </div>

        <div id="how-it-works" className="py-24 px-6 bg-[#050505] border-t border-white/5 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded flex items-center justify-center mb-6 text-white">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-medium text-white mb-3">1. find people</h3>
                <p className="text-white/50 leading-relaxed">
                  skip the gatekeepers. instantly find recruiters, founders, and decision-makers at your target companies.
                </p>
              </div>

              <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: "550ms" }}>
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded flex items-center justify-center mb-6 text-white">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-medium text-white mb-3">2. get emails</h3>
                <p className="text-white/50 leading-relaxed">
                  access verified professional email addresses. no more guessing patterns or bouncing emails.
                </p>
              </div>

              <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: "700ms" }}>
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded flex items-center justify-center mb-6 text-white">
                  <Send className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-medium text-white mb-3">3. send outreach</h3>
                <p className="text-white/50 leading-relaxed">
                  generate personalized cold emails with AI and send them directly from the app. track opens and replies.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="py-24 px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 opacity-0 animate-fade-in-up" style={{ animationDelay: "800ms" }}>
              why linkd?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div className="p-8 bg-[#0a0a0a] border border-white/10 rounded hover:border-white/20 transition-colors opacity-0 animate-fade-in-up" style={{ animationDelay: "900ms" }}>
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-5 h-5 text-white/80" />
                  <h3 className="text-lg font-medium text-white">for students</h3>
                </div>
                <p className="text-white/50 leading-relaxed">
                  land your dream internship by reaching out directly to hiring managers and founders. stand out from the pile of resumes.
                </p>
              </div>

              <div className="p-8 bg-[#0a0a0a] border border-white/10 rounded hover:border-white/20 transition-colors opacity-0 animate-fade-in-up" style={{ animationDelay: "1000ms" }}>
                <div className="flex items-center gap-3 mb-4">
                  <Send className="w-5 h-5 text-white/80" />
                  <h3 className="text-lg font-medium text-white">for creators</h3>
                </div>
                <p className="text-white/50 leading-relaxed">
                  secure brand deals by contacting marketing directors directly. stop waiting for inbound leads and take control.
                </p>
              </div>
            </div>

            <div className="mt-16 opacity-0 animate-fade-in-up" style={{ animationDelay: "1100ms" }}>
              <button
                onClick={handleSignIn}
                className="px-8 py-4 bg-white text-black hover:bg-white/90 transition-all duration-200 rounded font-medium inline-flex items-center gap-2 hover:scale-105 transform"
              >
                get started now
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="mt-4 text-white/30 text-sm">no credit card required</p>
            </div>
          </div>
        </div>

        <footer className="py-8 px-6 border-t border-white/5 text-center text-white/20 text-sm relative z-10">
          <p>&copy; {new Date().getFullYear()} linkd. all rights reserved.</p>
        </footer>
      </div>
    </>
  );
}
