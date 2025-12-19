'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { SignIn } from '@clerk/nextjs';
import { Check, Zap, TrendingUp, ArrowRight, Search, Loader2 } from 'lucide-react';
import type { OrchestratorResponse } from '@/lib/api';
import { apiFetch } from '@/lib/api';
import { PersonCard } from '@/components/search/person-card';
import { EmptyState } from '@/components/search/empty-state';

/**
 * Login Page - Creator Pivot
 * Includes: Hero, Social Proof, Mini-Tutorial, and Value Props
 */
const DEMO_TRIES_KEY = 'linkd_demo_tries';

export default function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [demoQuery, setDemoQuery] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<OrchestratorResponse | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [triesRemaining, setTriesRemaining] = useState(3);

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
    // Remove protocol
    cleaned = cleaned.replace(/^https?:\/\//, '');
    // Remove www.
    cleaned = cleaned.replace(/^www\./, '');
    // Extract just the domain (remove everything after first /)
    cleaned = cleaned.split('/')[0];
    // Remove query params if any (in case no path but has ?)
    cleaned = cleaned.split('?')[0];
    return cleaned;
  };

  const handleDemoSearch = async (query: string) => {
    if (triesRemaining <= 0) {
      setDemoError('You\'ve used all 3 free tries. Sign in to continue searching.');
      return;
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
        throw new Error(error.error || 'Failed to run orchestrator');
      }

      const data: OrchestratorResponse = await response.json();
      setDemoResult(data);
      
      const newTriesRemaining = triesRemaining - 1;
      setTriesRemaining(newTriesRemaining);
      localStorage.setItem(DEMO_TRIES_KEY, newTriesRemaining.toString());
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : 'Failed to run orchestrator');
    } finally {
      setDemoLoading(false);
    }
  };

  const verifiedResults = [
    { brand: "Three Ships", status: "Founder Email Verified", url: "https://www.threeshipsbeauty.com/" },
    { brand: "Cheekbone Beauty", status: "CEO Contact Found", url: "https://cheekbonebeauty.com" },
  ];

  return (
    <div className="min-h-screen flex bg-[#0a0a0a] relative overflow-hidden font-sans">
      {/* Grain texture overlay */}
      <div className="grain-overlay" />

      {/* Left side - Brand & messaging */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-center p-12 xl:p-16 relative z-10">
        
        {/* Logo */}
        <div className="absolute top-12 left-12 xl:left-16 animate-slide-in-left">
          <h1 className="font-serif text-5xl xl:text-6xl text-[#f5f5f0] tracking-tight leading-none">
            linkd
          </h1>
        </div>

        {/* Main Content Container */}
        <div className="max-w-xl space-y-10 mt-12">
          
          {/* Headline */}
          <div className="space-y-6">
            <h2 className="font-serif text-4xl xl:text-6xl text-[#f5f5f0] leading-tight animate-slide-in-left stagger-1">
              Stop DMing Brands.
              <br />
              <span className="text-[#d4af37]">Email the Founder.</span>
            </h2>
            <p className="text-lg text-[#9a9a90] leading-relaxed font-light animate-slide-in-left stagger-2 max-w-md">
              The secret weapon for professional creators. Paste any brand URL and get the direct personal email of the decision maker instantly.
            </p>
          </div>

          {/* Social Proof Cards */}
          <div className="space-y-3 animate-slide-in-left stagger-3">
            <p className="text-[#6a6a60] text-xs font-medium tracking-widest uppercase mb-4">
              Recently Unlocked Brands
            </p>
            <div className="grid gap-3">
              {verifiedResults.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 rounded-lg bg-[#111111] border border-[#2a2a2a]/60 backdrop-blur-md"
                >
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#f5f5f0] font-serif tracking-wide text-sm hover:underline transition-all"
                  >
                    {item.brand}
                  </a>
                  <div className="flex items-center gap-2">
                    <span className="text-[#d4af37]"><Check size={14} strokeWidth={3} /></span>
                    <span className="text-[#9a9a90] text-xs font-medium tracking-wide">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Try it out Section */}
          <div className="py-2 animate-slide-in-left stagger-4">
            <div className="mb-4">
              <p className="text-[#6a6a60] text-xs font-medium tracking-widest uppercase mb-2">
                Try it out
              </p>
              <p className="text-[#9a9a90] text-xs font-light leading-relaxed">
                Enter a DTC brand name. Works best with brands with &lt;1000 employees.
              </p>
              {triesRemaining > 0 && (
                <p className="text-[#6a6a60] text-xs font-light mt-1">
                  {triesRemaining} {triesRemaining === 1 ? 'try' : 'tries'} remaining
                </p>
              )}
            </div>
            
            {!demoResult && !demoLoading && (
              <div className="space-y-3">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (demoQuery.trim() && triesRemaining > 0) {
                      handleDemoSearch(demoQuery);
                    }
                  }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Search className="text-[#6a6a60]" size={16} />
                    </div>
                    <input
                      type="text"
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      value={demoQuery}
                      onChange={(e) => setDemoQuery(e.target.value)}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pastedText = e.clipboardData.getData('text');
                        const cleaned = cleanUrl(pastedText);
                        setDemoQuery(cleaned);
                      }}
                      placeholder="brand-website.com"
                      disabled={demoLoading || triesRemaining <= 0}
                      className="w-full bg-[#141414] border border-[#2a2a2a] p-3 pl-10 rounded-lg text-[#f5f5f0] placeholder:text-[#6a6a60] font-mono text-xs sm:text-sm focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  
                  <ArrowRight className="text-[#d4af37] shrink-0" size={20} />
                  
                  <button
                    type="submit"
                    disabled={!demoQuery.trim() || demoLoading || triesRemaining <= 0}
                    className="flex-1 bg-[#141414] border border-[#d4af37]/40 shadow-[0_0_15px_-3px_rgba(212,175,55,0.1)] p-3 rounded-lg flex items-center justify-center gap-2 hover:border-[#d4af37] hover:shadow-[0_0_20px_-3px_rgba(212,175,55,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[#d4af37]/40"
                  >
                    {demoLoading ? (
                      <>
                        <Loader2 className="text-[#d4af37] animate-spin" size={14} />
                        <span className="text-[#d4af37] text-[10px] uppercase tracking-wider">Searching</span>
                      </>
                    ) : triesRemaining <= 0 ? (
                      <span className="text-[#6a6a60] text-[10px] uppercase tracking-wider">Limit Reached</span>
                    ) : (
                      <span className="text-[#d4af37] text-[10px] uppercase tracking-wider">Try it</span>
                    )}
                  </button>
                </form>
                
                {triesRemaining <= 0 && (
                  <p className="text-[#6a6a60] text-xs font-light text-center">
                    Sign in to get unlimited searches
                  </p>
                )}
              </div>
            )}

            {/* Loading State */}
            {demoLoading && (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#141414] border border-[#2a2a2a] p-3 rounded-lg flex items-center gap-3">
                  <Search className="text-[#6a6a60]" size={16} />
                  <span className="text-[#6a6a60] font-mono text-xs sm:text-sm">{demoQuery || 'brand-website.com'}</span>
                </div>
                <ArrowRight className="text-[#d4af37]" size={20} />
                <div className="flex-1 bg-[#141414] border border-[#d4af37]/40 shadow-[0_0_15px_-3px_rgba(212,175,55,0.1)] p-3 rounded-lg flex items-center justify-center gap-2">
                  <Loader2 className="text-[#d4af37] animate-spin" size={14} />
                  <span className="text-[#d4af37] text-[10px] uppercase tracking-wider">Searching</span>
                </div>
              </div>
            )}

            {/* Results Display */}
            {demoResult && !demoLoading && (
              <div className="space-y-4 mt-4">
                {demoResult.people && demoResult.people.length > 0 && demoResult.message !== "No verified emails found" ? (
                  <div className="space-y-3">
                    {demoResult.people.slice(0, 1).map((person, index) => (
                      <PersonCard
                        key={index}
                        person={person}
                        favicon={demoResult.favicon}
                        companyName={demoResult.company}
                        index={index}
                      />
                    ))}
                    {triesRemaining > 0 ? (
                      <button
                        onClick={() => {
                          setDemoResult(null);
                          setDemoQuery('');
                          setDemoError(null);
                        }}
                        className="w-full mt-3 px-4 py-2 bg-[#141414] border border-[#2a2a2a] rounded-lg text-[#d4af37] text-xs font-light hover:border-[#d4af37] transition-all"
                      >
                        Try another company
                      </button>
                    ) : (
                      <p className="text-[#6a6a60] text-xs font-light text-center mt-3">
                        Sign in to see all results and get unlimited searches
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <EmptyState people={demoResult.people} company={demoResult.company} />
                    {triesRemaining > 0 ? (
                      <button
                        onClick={() => {
                          setDemoResult(null);
                          setDemoQuery('');
                          setDemoError(null);
                        }}
                        className="w-full mt-3 px-4 py-2 bg-[#141414] border border-[#2a2a2a] rounded-lg text-[#d4af37] text-xs font-light hover:border-[#d4af37] transition-all"
                      >
                        Try another company
                      </button>
                    ) : (
                      <p className="text-[#6a6a60] text-xs font-light text-center mt-3">
                        Sign in to try more companies
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {demoError && !demoLoading && (
              <div className="mt-3 p-3 bg-[#151515] border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-xs font-light text-center">{demoError}</p>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="pt-2 flex flex-col gap-4 animate-slide-in-left stagger-5">
            <div className="flex items-start gap-4">
              <Zap className="text-[#d4af37] mt-1" size={20} />
              <div>
                <h3 className="text-[#f5f5f0] text-sm font-medium">Skip the Support Inbox</h3>
                <p className="text-[#6a6a60] text-sm font-light">Don't get stuck in generic inboxes. Reach the person who signs the checks.</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden mb-8 animate-fade-in">
            <h1 className="font-serif text-4xl text-[#f5f5f0] mb-3">
              linkd
            </h1>
            <p className="text-[#9a9a90] font-light">
              Stop DMing. Start closing.
            </p>
          </div>

          {/* Clerk sign-in */}
          <div className="relative animate-slide-in-right">
            <div className="absolute -inset-4 bg-gradient-to-br from-[#d4af37]/5 via-transparent to-[#d4af37]/5 rounded-3xl blur-2xl opacity-50" />
            <div className="relative">
              <SignIn
                routing="hash"
                afterSignInUrl="/"
                afterSignUpUrl="/"
                fallbackRedirectUrl="/login"
                appearance={{
                  variables: {
                    colorPrimary: '#d4af37',
                    colorBackground: '#0f0f0f',
                    colorInputBackground: '#141414',
                    colorInputText: '#f5f5f0',
                    colorText: '#f5f5f0',
                    colorTextSecondary: '#9a9a90',
                    colorDanger: '#ef4444',
                    borderRadius: '0.5rem',
                    fontFamily: 'var(--font-geist-sans)',
                    fontSize: '0.9375rem',
                    spacingUnit: '1rem',
                  },
                  elements: {
                    rootBox: "mx-auto",
                    card: "bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-[#2a2a2a]/50 shadow-2xl shadow-black/60 backdrop-blur-sm",
                    headerTitle: "text-[#f5f5f0] font-normal text-2xl tracking-tight mb-1",
                    headerSubtitle: "text-[#9a9a90] font-light text-sm mt-2",
                    socialButtonsBlockButton: "bg-gradient-to-b from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] text-[#f5f5f0] hover:from-[#1f1f1f] hover:to-[#1a1a1a] hover:border-[#3a3a3a] hover:shadow-lg hover:shadow-[#d4af37]/5 transition-all duration-300 font-light",
                    socialButtonsBlockButtonText: "!text-[#f5f5f0] font-light",
                    formButtonPrimary: "bg-gradient-to-r from-[#d4af37] to-[#c49d2a] hover:from-[#c49d2a] hover:to-[#b38c1f] text-[#0a0a0a] font-medium tracking-wide shadow-lg shadow-[#d4af37]/20 hover:shadow-xl hover:shadow-[#d4af37]/30 transition-all duration-300 py-3",
                    formFieldInput: "bg-[#141414] border border-[#2a2a2a]/50 text-[#f5f5f0] placeholder:text-[#5a5a50] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 focus:bg-[#1a1a1a] transition-all duration-200 py-3",
                    formFieldLabel: "text-[#b8b8a8] font-light text-sm mb-2",
                    footerActionLink: "hidden",
                    dividerLine: "bg-gradient-to-r from-transparent via-[#2a2a2a] to-transparent",
                    dividerText: "text-[#6a6a60] font-light text-xs tracking-wider uppercase",
                    formFieldErrorText: "text-red-400 text-xs font-light mt-1",
                    formFieldSuccessText: "text-green-400 text-xs font-light mt-1",
                    identityPreviewText: "text-[#f5f5f0] font-light",
                    identityPreviewEditButton: "text-[#d4af37] hover:text-[#c49d2a] transition-colors duration-200",
                    alertText: "text-[#f5f5f0] font-light",
                    formResendCodeLink: "text-[#d4af37] hover:text-[#c49d2a] font-light transition-colors duration-200",
                    footer: "hidden",
                    otpCodeFieldInput: "bg-[#141414] border-[#2a2a2a] text-[#f5f5f0] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20",
                    formFieldInputShowPasswordButton: "text-[#9a9a90] hover:text-[#f5f5f0]",
                    identityPreview: "border border-[#2a2a2a]/50 bg-[#141414]",
                    formFieldAction: "text-[#d4af37] hover:text-[#c49d2a]",
                  },
                }}
              />
            </div>
          </div>
          
          {/* Mobile Footer Text */}
          <div className="lg:hidden mt-8 text-center animate-fade-in stagger-2">
            <p className="text-[#6a6a60] text-xs font-light">Paste a URL. Get the Founder. It's that simple.</p>
          </div>

        </div>
      </div>

      {/* Subtle accent line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#1f1f1f] to-transparent hidden lg:block" />
    </div>
  );
}