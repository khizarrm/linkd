'use client';

import { useRouter } from 'next/navigation';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { mutate } from 'swr';
import { X } from 'lucide-react';
import { useProtectedApi } from '@/hooks/use-protected-api';
import type { OrchestratorResponse } from '@/lib/api';
import { SearchForm } from '@/components/search/search-form';
import { SearchResults } from '@/components/search/search-results';
import { BankModal } from '@/components/bank/bank-modal';

const COMPANIES_KEY = 'companies';

function FAQModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" 
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-black border border-white/10 rounded-lg p-8 overflow-y-auto animate-bounce-in scrollbar-hide"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: 'var(--font-fira-mono)' }}
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-medium text-white">
            faq
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-12">
          <div>
            <h3 className="text-xl md:text-2xl font-medium mb-4 text-white">
              what's linkd?
            </h3>
            <div className="text-sm md:text-base text-white/60 leading-relaxed space-y-3">
              <p>linkd streamlines cold outreach by finding the right decision-makers to contact. instead of reaching out to generic emails that get ignored, linkd finds key people like ceos. reaching out to the ppl at the top makes the process much easier, and is much more effective for smaller to mid size companies.</p>
              <p>the vision is to automate your entire workflow. linkd will research companies that match your criteria, find decision-maker emails, write personalized messages, and queue them for approval. the final flow: open the app, review 5 pre-written emails daily to companies we found for you, and send with one click.</p>
            </div>
          </div>

          <div>
            <h3 className="text-xl md:text-2xl font-medium mb-4 text-white">
              who is linkd for?
            </h3>
            <div className="text-sm md:text-base text-white/60 leading-relaxed space-y-3">
              <p>linkd was initially built for job seekers—cold outreach is incredibly effective when looking for opportunities, especially at startups. however, after early testing, i found it also works really well for creators reaching out to brands, particularly smaller ones.</p>
              <p>if you're a student trying to land a job, linkd is ideal for reaching out to startups where direct contact makes a real difference. if you're a content creator looking for brand deals, linkd works exceptionally well for small to mid-size companies where reaching ceos directly significantly increases your chances.</p>
            </div>
          </div>

          <div>
            <h3 className="text-xl md:text-2xl font-medium mb-4 text-white">
              who am i?
            </h3>
            <div className="text-sm md:text-base text-white/60 leading-relaxed space-y-3">
              <p>i'm a fourth-year cs student at carleton university. this past winter, i was struggling to find a job. i would wake up and keep applying, keep applying and get barely any responses. it felt like throwing my applications into a void.</p>
              <p>a friend told me to try emailing companies directly. within a week, i got 7 interviews and even pitched mark cuban my startup. that's when i realized how effective cold emailing is, and that most people didn't know about this. so i built linkd to ease that pain. here's my <a href="https://khizarmalik.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">website</a>. hope this helps.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const protectedApi = useProtectedApi();
  const [result, setResult] = useState<OrchestratorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showBank, setShowBank] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/login');
    }
  }, [isLoaded, isSignedIn, router]);


  const handleSearch = async (query: string): Promise<OrchestratorResponse | Error> => {
    setError(null);
    setResult(null);
    setLoading(true);

    const trimmedQuery = query.trim();

    try {
      const data = await protectedApi.orchestrator({ query: trimmedQuery });
      setResult(data);

      // Invalidate companies cache so bank page shows new companies immediately
      mutate(COMPANIES_KEY);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run orchestrator';
      setError(errorMessage);
      return new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <>
      <FAQModal isOpen={showFAQ} onClose={() => setShowFAQ(false)} />
      <BankModal open={showBank} onOpenChange={setShowBank} />
      <div className="bg-black relative min-h-screen" style={{ fontFamily: 'var(--font-fira-mono)' }}>
        {/* Top Left Buttons */}
        <div className="fixed top-6 left-6 z-10 flex items-center gap-3">
          <button
            onClick={() => setShowFAQ(true)}
            className="px-4 py-2 border border-white text-white hover:bg-white/10 transition-all duration-200 lowercase rounded"
            style={{ fontFamily: 'var(--font-fira-mono)' }}
          >
            faq
          </button>
          <button
            onClick={() => setShowBank(true)}
            className="px-4 py-2 bg-white text-black hover:bg-white/90 transition-all duration-200 lowercase rounded"
            style={{ fontFamily: 'var(--font-fira-mono)' }}
          >
            bank
          </button>
          <button
            onClick={() => router.push('/guide')}
            className="px-4 py-2 bg-white text-black hover:bg-white/90 transition-all duration-200 lowercase rounded"
            style={{ fontFamily: 'var(--font-fira-mono)' }}
          >
            guide
          </button>
        </div>

        {/* Top Right Sign Out Button */}
        <div className="fixed top-6 right-6 z-10">
          <button
            onClick={async () => {
              try {
                await signOut();
                window.location.href = '/login';
              } catch (error) {
                console.error('Sign out failed:', error);
              }
            }}
            className="px-4 py-2 border border-white text-white hover:bg-white/10 transition-all duration-200 lowercase rounded"
            style={{ fontFamily: 'var(--font-fira-mono)' }}
          >
            sign out
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
          an easier way to outreach
        </p>

        {/* Input Bar */}
        <div className="w-full max-w-2xl mb-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <SearchForm onSearch={handleSearch} isLoading={loading} />
        </div>

        {/* Results Display */}
        <SearchResults 
          loading={loading} 
          error={error} 
          data={result} 
        />
      </div>
      </div>
    </>
  );
}
