'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useSignIn } from '@clerk/nextjs';
import { Check, Copy, Loader2, Mail, X } from 'lucide-react';
import type { OrchestratorResponse } from '@/lib/api';
import { apiFetch } from '@/lib/api';
import { triggerHaptic } from '@/lib/haptics';
import { SearchForm } from '@/components/search/search-form';

const DEMO_TRIES_KEY = 'linkd_demo_tries';

interface QuestionSectionProps {
  title: string;
  delay: number;
  children?: React.ReactNode;
}

function QuestionSection({ title, delay, children }: QuestionSectionProps) {
  return (
    <div
      className="opacity-0 animate-fade-in-up"
      style={{
        animationDelay: `${delay}ms`,
        fontFamily: 'var(--font-fira-mono)',
      }}
    >
      <h3 className="text-lg md:text-xl font-medium mb-3 text-white">
        {title}
      </h3>
      <div className="text-sm md:text-base text-white/60 leading-relaxed">
        {children || (
          <>
            <p className="mb-3">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
            <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
          </>
        )}
      </div>
    </div>
  );
}

function ResultsCard({ result }: { result: OrchestratorResponse }) {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [faviconError, setFaviconError] = useState(false);
  const person = result.people?.[0];
  const email = person?.emails?.[0];
  const faviconUrl = result.favicon || (result.website ? `https://www.google.com/s2/favicons?domain=${result.website}&sz=128` : null);

  if (!person || !email) {
    return (
      <div className="mt-8 w-full max-w-2xl mx-auto p-6 bg-[#0a0a0a] border border-white/10 rounded-lg animate-slide-up-fade">
        <p className="text-center text-white/70" style={{ fontFamily: 'var(--font-fira-mono)' }}>
          No verified email found
        </p>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      triggerHaptic('medium');
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      triggerHaptic('error');
    }
  };

  return (
    <div className="mt-8 w-full max-w-2xl mx-auto p-6 bg-[#0a0a0a] border border-white/10 rounded-lg animate-bounce-in">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {faviconUrl && !faviconError && (
            <img
              src={faviconUrl}
              alt={`${result.company} favicon`}
              className="w-6 h-6 rounded shrink-0 mt-1"
              onError={() => setFaviconError(true)}
            />
          )}
          <div className="flex-1">
            <h3 className="text-xl font-medium mb-1" style={{ fontFamily: 'var(--font-fira-mono)' }}>
              {person.name}
            </h3>
            {person.role && (
              <p className="text-sm text-white/70" style={{ fontFamily: 'var(--font-fira-mono)' }}>
                {person.role}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-[#141414] border border-white/5 rounded">
          <Mail className="w-4 h-4 text-white/50 shrink-0" />
          <code className="flex-1 text-sm text-white/90 truncate" style={{ fontFamily: 'var(--font-fira-mono)' }}>
            {email}
          </code>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-sm transition-all duration-[150ms] hover:scale-[1.02] will-change-transform"
            style={{ fontFamily: 'var(--font-fira-mono)', transform: 'translateZ(0)' }}
          >
            {copiedEmail === email ? (
              <span className="flex items-center gap-2">
                <Check className="w-3 h-3" />
                Copied
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Copy className="w-3 h-3" />
                Copy
              </span>
            )}
          </button>
        </div>
        <p className="text-sm text-white/50 text-center pt-2" style={{ fontFamily: 'var(--font-fira-mono)' }}>
          scroll below to find out more
        </p>
      </div>
    </div>
  );
}

function SignInModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      console.log('[SignInModal] User is signed in, redirecting to home');
      onClose();
      router.push('/');
    }
  }, [isSignedIn, onClose, router]);

  const handleGoogleSignIn = async () => {
    console.log('[SignInModal] Google sign-in clicked');
    setError(null);
    setIsLoading(true);
    
    try {
      if (!signIn) {
        console.error('[SignInModal] signIn object is not available');
        throw new Error('Sign in is not initialized');
      }

      console.log('[SignInModal] Initiating OAuth with Google');
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (err: any) {
      console.error('[SignInModal] Error during Google sign-in:', err);
      setError(err?.message || 'Failed to sign in with Google. Please try again.');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-black border border-white/10 rounded-lg p-8 animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: 'var(--font-fira-mono)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-medium text-white">
            sign in
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-white text-black rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-3"
            style={{ fontFamily: 'var(--font-fira-mono)' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isLoading ? 'Loading...' : 'continue with google'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<OrchestratorResponse | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [triesRemaining, setTriesRemaining] = useState(3);
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const savedTries = localStorage.getItem(DEMO_TRIES_KEY);
    if (savedTries) {
      const remaining = parseInt(savedTries, 10);
      setTriesRemaining(Math.max(0, remaining));
    }
  }, []);

  if (isLoaded && isSignedIn) {
    return null;
  }

  const cleanUrl = (url: string): string => {
    let cleaned = url.trim();
    cleaned = cleaned.replace(/^https?:\/\//, '');
    cleaned = cleaned.replace(/^www\./, '');
    cleaned = cleaned.split('/')[0];
    cleaned = cleaned.split('?')[0];
    return cleaned;
  };

  const handleDemoSearch = async (query: string): Promise<OrchestratorResponse | Error> => {
    if (triesRemaining <= 0) {
      const errorMessage = 'You\'ve used all 3 free tries. Sign in to continue searching.';
      setDemoError(errorMessage);
      return new Error(errorMessage);
    }

    setDemoError(null);
    setDemoResult(null);
    setDemoLoading(true);

    const trimmedQuery = cleanUrl(query);

    try {
      const params = { query: trimmedQuery };
      const response = await apiFetch('/api/agents/orchestrator', {
        method: 'POST',
        body: JSON.stringify(params),
      }, null);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'An unexpected error occurred' }));
        const errorMessage = error.error || 'Failed to run orchestrator';
        setDemoError(errorMessage);
        return new Error(errorMessage);
      }

      const data: OrchestratorResponse = await response.json();
      setDemoResult(data);
      
      const newTriesRemaining = triesRemaining - 1;
      setTriesRemaining(newTriesRemaining);
      localStorage.setItem(DEMO_TRIES_KEY, newTriesRemaining.toString());
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run orchestrator';
      setDemoError(errorMessage);
      return new Error(errorMessage);
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSignIn = () => {
    setShowSignIn(true);
  };

  const handleSearchSubmit = async (query: string): Promise<OrchestratorResponse | Error> => {
    if (triesRemaining > 0) {
      return await handleDemoSearch(query);
    } else {
      handleSignIn();
      return new Error('No tries remaining');
    }
  };

  return (
    <>
      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
      <div className="bg-black relative" style={{ fontFamily: 'var(--font-fira-mono)' }}>
        {/* Top Left Guide Button */}
        <div className="fixed top-6 left-6 z-10">
          <button
            onClick={() => router.push('/guide')}
            className="px-4 py-2 bg-white text-black hover:bg-white/90 transition-all duration-200 lowercase rounded"
            style={{ fontFamily: 'var(--font-fira-mono)' }}
          >
            guide
          </button>
        </div>

        {/* Top Right Buttons */}
        <div className="fixed top-6 right-6 flex items-center gap-4 z-10">
        <button
          onClick={handleSignIn}
          className="px-4 py-2 border border-white text-white hover:bg-white/10 transition-all duration-200 lowercase rounded"
          style={{ fontFamily: 'var(--font-fira-mono)' }}
        >
          sign in
        </button>
      </div>

      {/* Main Centered Section */}
      <div className="min-h-screen flex flex-col items-center justify-center p-6 w-full max-w-4xl mx-auto">
        {/* Title */}
        <h1 className="text-6xl md:text-7xl font-bold mb-4 text-white opacity-0 animate-fade-in-up" style={{ fontFamily: 'var(--font-fira-mono)' }}>
            linkd
          </h1>
        
        {/* Subtitle */}
        <p className="text-lg md:text-xl text-white/60 mb-8 opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms', fontFamily: 'var(--font-fira-mono)' }}>
          an easier way to outreach (scroll below for more info)
        </p>

        {/* Input Bar */}
        <div className="w-full max-w-2xl mb-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <SearchForm
            onSearch={handleSearchSubmit}
            isLoading={demoLoading}
            icon="arrow"
            placeholder={triesRemaining <= 0 ? "sign in to continue searching" : "type a company website here"}
          />
          {triesRemaining <= 0 && (
            <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded text-white/70 text-sm text-center animate-fade-in-up" style={{ fontFamily: 'var(--font-fira-mono)' }}>
              <p className="mb-2">You've used all 3 free tries.</p>
              <button
                onClick={handleSignIn}
                className="text-white underline hover:text-white/80 transition-colors"
                style={{ fontFamily: 'var(--font-fira-mono)' }}
              >
                Sign in or create an account to continue
              </button>
            </div>
          )}
        </div>

            {/* Results Display */}
            {demoResult && !demoLoading && (
          <ResultsCard result={demoResult} />
        )}

        {/* Error Display */}
        {demoError && !demoLoading && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm animate-bounce-in" style={{ fontFamily: 'var(--font-fira-mono)' }}>
            {demoError}
                  </div>
        )}

        {/* Try Another Button */}
        {demoResult && !demoLoading && triesRemaining > 0 && (
          <button
            onClick={() => {
              setDemoResult(null);
              setDemoError(null);
            }}
            className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-sm transition-all duration-[150ms] hover:scale-[1.02] will-change-transform animate-fade-in-up"
            style={{ fontFamily: 'var(--font-fira-mono)', transform: 'translateZ(0)' }}
          >
            Try another
          </button>
        )}
      </div>

      {/* Bottom Section - Question Sections (Only visible on scroll) */}
      <div className="w-full max-w-6xl pb-12 pt-32 px-6 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <QuestionSection
            title="what's linkd?"
            delay={400}
          >
            <p className="mb-3">linkd streamlines cold outreach by finding the right decision-makers to contact. instead of reaching out to generic emails that get ignored, linkd finds key people like ceos. reaching out to the ppl at the top makes the process much easier, and is much more effective for smaller to mid size companies.</p>
            <p>the vision is to automate your entire workflow. linkd will research companies that match your criteria, find decision-maker emails, write personalized messages, and queue them for approval. the final flow: open the app, review 5 pre-written emails daily to companies we found for you, and send with one click.</p>
          </QuestionSection>
          <QuestionSection
            title="who is linkd for?"
            delay={500}
          >
            <p className="mb-3">linkd was initially built for job seekers—cold outreach is incredibly effective when looking for opportunities, especially at startups. however, after early testing, i found it also works really well for creators reaching out to brands, particularly smaller ones.</p>
            <p>if you're a student trying to land a job, linkd is ideal for reaching out to startups where direct contact makes a real difference. if you're a content creator looking for brand deals, linkd works exceptionally well for small to mid-size companies where reaching ceos directly significantly increases your chances.</p>
          </QuestionSection>
          <QuestionSection
            title="who am i?"
            delay={600}
          >
            <p className="mb-3">i'm a fourth-year cs student at carleton university. this past winter, i was struggling to find a job. i would wake up and keep applying, keep applying and get barely any responses. it felt like throwing my applications into a void.</p>
            <p>a friend told me to try emailing companies directly. within a week, i got 7 interviews and even pitched mark cuban my startup. that's when i realized how effective cold emailing is, and that most people didn't know about this. so i built linkd to ease that pain. here's my <a href="https://khizarmalik.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">website</a>. hope this helps.</p>
          </QuestionSection>
        </div>
      </div>
      </div>
    </>
  );
}
