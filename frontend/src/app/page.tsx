'use client';

import { useRouter } from 'next/navigation';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { mutate } from 'swr';
import { X } from 'lucide-react';
import { useProtectedApi } from '@/hooks/use-protected-api';
import type { OrchestratorResponse } from '@/lib/api';
import { posthog } from '@/../instrumentation-client';
import { SearchForm } from '@/components/search/search-form';
import { SearchResults } from '@/components/search/search-results';

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

function ColdEmailModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
            how to write a good cold email
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-8 text-white/80 leading-relaxed">
          <p className="text-sm md:text-base">
            cold emailing is simple if you do it right. here's what works.
          </p>

          <div>
            <h3 className="text-lg md:text-xl font-medium mb-3 text-white">
              lead with value
            </h3>
            <p className="text-sm md:text-base">
              open with what you can do for them. something like "this is who i am, this is what i can do, this is what i want to do." get straight to the point—what value are you bringing? that's what they care about.
            </p>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-medium mb-3 text-white">
              keep it short
            </h3>
            <p className="text-sm md:text-base">
              you're reaching out to busy people. respect their time from the start. the shorter your email, the more likely they'll actually read it. say what you need to say and get out.
            </p>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-medium mb-3 text-white">
              be casual
            </h3>
            <p className="text-sm md:text-base">
              talk to them like a normal person. don't grovel or act like they're above you. when you do that, it comes off as desperate, and you're not desperate. if you provide genuine value, there's nothing to be desperate about.
            </p>
            <p className="text-sm md:text-base mt-2">
              don't ask for too much. keep it light.
            </p>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-medium mb-3 text-white">
              skip the resume
            </h3>
            <p className="text-sm md:text-base">
              you don't need to attach your resume. just say what you need to say. your website should function as your resume anyway—if they're interested, they'll click through and look themselves. don't force it on them.
            </p>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-medium mb-3 text-white">
              footer matters
            </h3>
            <p className="text-sm md:text-base">
              always include your info in the footer. have your website, linkedin, and one other link. for tech, i find website, linkedin, and twitter works well. if you're a creator, your portfolio site is usually the move.
            </p>
            <p className="text-sm md:text-base mt-2">
              this gives them easy access to learn more about you without cluttering the email itself.
            </p>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-medium mb-3 text-white">
              the point
            </h3>
            <p className="text-sm md:text-base">
              save them as much time as possible. you're often reaching out to ceos and busy people, especially through linkedin. make it easy for them to say yes by making it easy for them to read.
            </p>
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-sm md:text-base italic text-white/70">
              templates below got me two internships. use them and good luck.
            </p>
          </div>

          <div className="pt-6 space-y-8">
            <h3 className="text-lg md:text-xl font-medium text-white">
              templates
            </h3>

            <div className="space-y-6">
              <div className="bg-white/5 p-6 rounded border border-white/10">
                <p className="text-xs text-white/60 mb-2">fullscript (interning there this fall!)</p>
                <p className="text-sm font-medium text-white mb-3">subject: i'll be brief- 4th year student</p>
                <div className="text-sm text-white/80 space-y-2 whitespace-pre-line">
                  <p>Hey Kyle,</p>
                  <p>I'm Khizar, CS @ Carleton in the Co-op programme. Been making AI applications for 2+ years, quite good with building end to end products.</p>
                  <p>I really admire what you're building at Fullscript. Making healthcare more accessible is pretty cool, your mission is inspiring. I'm reaching out because I'd love the opportunity to contribute to your team.</p>
                  <p>Some of my past projects include:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>thirdspace, a social networking app to share experiences (1,000+ users, ranked top 70 in the App Store)</li>
                    <li>passr, a resume optimization platform where users can directly prompt their resumes (40+ active users)</li>
                    <li>A chrome extension which uses a custom ML model to determine if a website is considered 'productive' or 'unproductive' (launching this week)</li>
                  </ul>
                  <p>I'm free this fall. If you're open to it, I'd be happy to chat further.</p>
                  <p>Best,</p>
                  <p>Khizar Malik</p>
                  <p className="text-xs">website | linkedin</p>
                </div>
              </div>

              <div className="bg-white/5 p-6 rounded border border-white/10">
                <p className="text-xs text-white/60 mb-2">pally ai (yc):</p>
                <p className="text-sm font-medium text-white mb-3">subject: motivated student, will hustle @ pally ai</p>
                <div className="text-sm text-white/80 space-y-2 whitespace-pre-line">
                  <p>Hey Wyatt,</p>
                  <p>I remember using Pally AI for relationship management a while back, love the UI and UX. Can't wait to see what other things you guys have in store.</p>
                  <p>I've been building for fun for ~2 years (thirdspace 1.3k + users, passr 40+), quite good with building end to end products.</p>
                  <p>If you're open, I'd love a quick chat about potential internship opportunities for Winter.</p>
                  <p>Best,</p>
                  <p>Khizar Malik</p>
                  <p className="text-xs">website | linkedin</p>
                </div>
              </div>

              <div className="bg-white/5 p-6 rounded border border-white/10">
                <p className="text-xs text-white/60 mb-2">pitched mark cuban our startup</p>
                <p className="text-sm font-medium text-white mb-3">subject: Solving the loneliness epidemic—1,000+ student users in 4 wks</p>
                <div className="text-sm text-white/80 space-y-2 whitespace-pre-line">
                  <p>Hey Mark,</p>
                  <p>I'm Khizar (CS @ Carleton) building thirdspace, a live "meet-up right now" app. Students type "study in library" and nearby classmates get an instant ping; one tap and they're meeting IRL.</p>
                  <p>The U.S. Surgeon General calls loneliness an "epidemic" hitting Gen Z hardest. We're fixing that.</p>
                  <p className="font-medium">Early proof</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>One-campus launch: 1,000+ active students → #70 in Canada's App Store</li>
                    <li>First paid pilot: Ottawa nightclub logged 200+ live walk-ins (over capacity) in one night</li>
                    <li>Model: venues pay us to fill seats; current run-rate $4.3 k MRR / 1 k actives</li>
                    <li>Closed $50 k; raising $500 k pre-seed to reach five campuses by September</li>
                  </ul>
                  <p>Could I send you our two-page deck?</p>
                  <p>Best,</p>
                  <p>Khizar Malik</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-sm md:text-base text-white/80">
                these all got me insane opportunities. there's doors around you waiting to be opened, all you need to do is knock. you got this!
              </p>
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
  const [showColdEmail, setShowColdEmail] = useState(false);
  const [showLongWaitMessage, setShowLongWaitMessage] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/login');
    }
  }, [isLoaded, isSignedIn, router]);

  // Show "can take up to 30 seconds" message after 3 seconds of loading
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowLongWaitMessage(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowLongWaitMessage(false);
    }
  }, [loading]);


  const handleSearch = async (query: string) => {
    setError(null);
    setResult(null);
    setLoading(true);

    const trimmedQuery = query.trim();

    // Track search initiation
    posthog.capture('company_searched', {
      search_query: trimmedQuery,
    });

    try {
      const data = await protectedApi.orchestrator({ query: trimmedQuery });
      setResult(data);

      // Determine if results were found
      const resultsFound = data.people && data.people.length > 0 && data.message !== "no emails found";
      const emailCount = resultsFound
        ? data.people.reduce((total, person) => total + (person.emails?.length || 0), 0)
        : 0;

      // Track search completion
      posthog.capture('search_completed', {
        search_query: trimmedQuery,
        company_name: data.company || trimmedQuery,
        results_found: resultsFound,
        email_count: emailCount,
        person_count: data.people?.length || 0,
      });

      // Invalidate companies cache so bank page shows new companies immediately
      mutate(COMPANIES_KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run orchestrator');

      // Track search failure
      posthog.capture('search_completed', {
        search_query: trimmedQuery,
        results_found: false,
        email_count: 0,
        person_count: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
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
      <ColdEmailModal isOpen={showColdEmail} onClose={() => setShowColdEmail(false)} />
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
            onClick={() => setShowColdEmail(true)}
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
          {showLongWaitMessage && (
            <p className="mt-3 text-sm text-white/50 text-center animate-fade-in-up" style={{ fontFamily: 'var(--font-fira-mono)' }}>
              this can take up to one minute
            </p>
          )}
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
