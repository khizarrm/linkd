'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Mail, Copy, Check } from 'lucide-react';
import { agentsApi, type OrchestratorResponse } from '@/lib/api';

const PLACEHOLDER_TEXTS = [
  'gimme tim cooks email from apple',
  'exa ai, the api search company',
  'cohere',
  'fouders from datacurve',
  'ceo of poolside ai',
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrchestratorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const copyToClipboard = async (email: string) => {
    await navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  useEffect(() => {
    // Only rotate placeholders when input is empty and not focused
    if (query.trim() === '' && !isFocused) {
      intervalRef.current = setInterval(() => {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_TEXTS.length);
      }, 3000); // Change every 3 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [query, isFocused]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const data = await agentsApi.orchestrator({ query: query.trim() });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run orchestrator');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8] font-serif">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');

        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .font-serif {
          font-family: 'DM Sans', sans-serif;
        }

        .font-sans {
          font-family: 'DM Sans', sans-serif;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite linear;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.03) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          background-size: 1000px 100%;
        }

        .slot-machine-container {
          height: 100%;
          overflow: hidden;
        }

        .slot-machine-reel {
          transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          display: flex;
          flex-direction: column;
        }

        .slot-machine-item {
          height: 100%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }
      `}</style>

      <main className="flex items-center justify-center min-h-screen px-4 sm:px-6">
        <div className="w-full max-w-4xl -mt-16">
          {/* Heading */}
          <div className="mb-5 sm:mb-6 md:mb-8 text-center">
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-light tracking-tight leading-[1.1] opacity-0 animate-fade-in-up">
              outreach
            </h1>
            <p className="mt-2 sm:mt-3 md:mt-4 text-xs sm:text-sm md:text-base font-sans font-light text-[#6a6a6a] opacity-0 animate-fade-in-up px-4 sm:px-0" style={{ animationDelay: '0.05s' }}>
              use this to find emails. at minimum, make sure to add the name of the company. currently in beta testing
            </p>
          </div>

          {/* Search Form */}
          <div className="mt-5 sm:mt-6 md:mt-8 mx-auto max-w-3xl opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#151515] border border-[#2a2a2a] rounded-2xl sm:rounded-full px-4 sm:px-6 py-3 sm:py-4 focus-within:border-[#4a4a4a] transition-all duration-500">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-transparent text-sm sm:text-lg md:text-xl font-sans font-light tracking-tight focus:outline-none disabled:opacity-50 min-h-[40px] sm:min-h-0 relative z-10"
                />
                {query.trim() === '' && !isFocused && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden slot-machine-container">
                    <div
                      className="slot-machine-reel text-sm sm:text-lg md:text-xl font-sans font-light tracking-tight text-[#3a3a3a] w-full"
                      style={{
                        transform: `translateY(-${placeholderIndex * (100 / PLACEHOLDER_TEXTS.length)}%)`
                      }}
                    >
                      {PLACEHOLDER_TEXTS.map((text, idx) => (
                        <div 
                          key={idx} 
                          className="slot-machine-item"
                        >
                          {text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 bg-white text-[#0a0a0a] rounded-full text-xs sm:text-sm font-sans font-light tracking-wider uppercase hover:bg-[#e8e8e8] active:scale-95 transition-all duration-300 disabled:opacity-30 disabled:hover:bg-white disabled:active:scale-100 min-h-[40px] sm:min-h-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 sm:h-3 sm:w-3 animate-spin" />
                    <span className="sm:inline">Searching</span>
                  </>
                ) : (
                  'Send'
                )}
              </button>
            </div>
          </form>
        </div>

          {/* Error State */}
          {error && (
            <div className="mt-6 sm:mt-8 md:mt-10 opacity-0 animate-fade-in-up text-center px-4">
              <p className="text-sm sm:text-base font-sans font-light text-red-400/80">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="mt-6 sm:mt-10 md:mt-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-5xl mx-auto">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="opacity-0 animate-fade-in-up bg-[#151515] border border-[#2a2a2a] rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 flex flex-col"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    {/* Name skeleton */}
                    <div className="h-7 sm:h-8 md:h-9 w-3/4 bg-[#1a1a1a] rounded-lg mb-2 sm:mb-3 animate-shimmer" />
                    {/* Role skeleton */}
                    <div className="h-4 sm:h-5 md:h-6 w-1/2 bg-[#1a1a1a] rounded-lg mb-4 sm:mb-5 md:mb-6 animate-shimmer" />
                    {/* Email skeleton */}
                    <div className="space-y-2 sm:space-y-3">
                      <div className="h-11 sm:h-12 md:h-14 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-3 sm:p-4 animate-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="mt-6 sm:mt-10 md:mt-12">
              {result.message === "no emails found" ? (
                <div className="opacity-0 animate-fade-in-up text-center px-4 max-w-2xl mx-auto">
                  <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10">
                    <div className="text-4xl sm:text-5xl md:text-6xl mb-4 sm:mb-5 md:mb-6 opacity-40">
                      🔍
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight mb-3 sm:mb-4 text-[#e8e8e8]">
                      No emails found
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base font-sans font-light text-[#6a6a6a] leading-relaxed mb-3 sm:mb-4">
                      We couldn't find any verified email addresses for your search.
                    </p>
                    <p className="text-xs sm:text-sm md:text-base font-sans font-light text-[#5a5a5a] leading-relaxed">
                      Try adding more context (like their website, what they do, or specific details), or choose a smaller or mid-size company — those usually work best.
                    </p>
                  </div>
                </div>
              ) : result.people && result.people.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-5xl mx-auto">
                {result.people.map((person, index) => (
                  <article
                    key={`${person.name}-${index}`}
                    className="opacity-0 animate-fade-in-up bg-[#151515] border border-[#2a2a2a] rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 hover:border-[#3a3a3a] active:scale-[0.98] transition-all duration-300 flex flex-col relative"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Favicon - Top Right */}
                    {result.favicon && (
                      <div className="absolute top-5 right-5 sm:top-6 sm:right-6 md:top-8 md:right-8">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-[#0a0a0a] border border-[#2a2a2a] p-1.5 sm:p-2 flex items-center justify-center">
                          <img
                            src={result.favicon}
                            alt={`${result.company} logo`}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Person Info */}
                    <div className="mb-5 sm:mb-6 flex-grow pr-12 sm:pr-14 md:pr-16">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight mb-2 sm:mb-3">
                        {person.name}
                      </h2>
                      {person.role && (
                        <p className="text-xs sm:text-sm md:text-base font-sans font-light text-[#6a6a6a] leading-relaxed">
                          {person.role}
                        </p>
                      )}
                    </div>

                    {/* Emails */}
                    {person.emails && person.emails.length > 0 ? (
                      <div className="space-y-2 sm:space-y-3">
                        {person.emails.map((email, emailIndex) => (
                          <div
                            key={`${email}-${emailIndex}`}
                            className="group"
                          >
                            <div className="flex items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg sm:rounded-xl hover:border-[#3a3a3a] active:bg-[#151515] transition-all duration-300 min-h-[48px] sm:min-h-[52px]">
                              <a
                                href={`mailto:${email}`}
                                className="font-sans text-xs sm:text-sm font-light tracking-wide text-[#e8e8e8] hover:text-white active:text-white transition-colors duration-300 truncate flex-1 mr-1 sm:mr-2"
                                title={email}
                              >
                                {email}
                              </a>
                              <button
                                onClick={() => copyToClipboard(email)}
                                className="text-[#6a6a6a] hover:text-[#e8e8e8] active:text-white active:scale-90 transition-all duration-300 flex-shrink-0 p-2 -m-2 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center"
                                title="Copy email"
                              >
                                {copiedEmail === email ? (
                                  <Check className="h-4 w-4 sm:h-4 sm:w-4" />
                                ) : (
                                  <Copy className="h-4 w-4 sm:h-4 sm:w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm font-sans font-light text-[#4a4a4a] italic">
                        No verified emails found
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="opacity-0 animate-fade-in-up text-center px-4">
                <p className="text-base sm:text-lg md:text-xl font-light text-[#6a6a6a]">
                  No results found
                </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
