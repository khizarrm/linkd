'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { SignIn } from '@clerk/nextjs';
import { Check, Zap, Lock, TrendingUp } from 'lucide-react';

/**
 * Login Page - Creator/Sponsorship Pivot
 * Broadened to target all creators (vloggers, streamers, influencers)
 */
export default function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  if (isLoaded && isSignedIn) {
    return null;
  }

  // Real data serves as proof of concept for any niche
  const verifiedResults = [
    { brand: "Three Ships", status: "Founder Email Verified" },
    { brand: "Cheekbone Beauty", status: "CEO Contact Found" },
    { brand: "Wildcraft Care", status: "Leadership Unlocked" },
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
          
          {/* Headline & Subhead */}
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
                  className="flex items-center justify-between p-4 rounded-lg bg-[#111111] border border-[#2a2a2a]/60 backdrop-blur-md hover:border-[#d4af37]/30 transition-colors duration-300"
                >
                  <span className="text-[#f5f5f0] font-serif tracking-wide">{item.brand}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#d4af37]"><Check size={14} strokeWidth={3} /></span>
                    <span className="text-[#9a9a90] text-xs font-medium tracking-wide">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Value Props / Features */}
          <div className="pt-4 flex flex-col gap-4 animate-slide-in-left stagger-4">
            <div className="flex items-start gap-4">
              <Zap className="text-[#d4af37] mt-1" size={20} />
              <div>
                <h3 className="text-[#f5f5f0] text-sm font-medium">Skip the Support Inbox</h3>
                <p className="text-[#6a6a60] text-sm font-light">Don't get stuck in generic inboxes. Reach the person who signs the checks.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <TrendingUp className="text-[#d4af37] mt-1" size={20} />
              <div>
                <h3 className="text-[#f5f5f0] text-sm font-medium">Secure Better Deals</h3>
                <p className="text-[#6a6a60] text-sm font-light">Founders value creators. Agencies and support teams just see numbers.</p>
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
            <p className="text-[#6a6a60] text-xs font-light">Used by creators to close deals with top brands.</p>
          </div>

        </div>
      </div>

      {/* Subtle accent line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#1f1f1f] to-transparent hidden lg:block" />
    </div>
  );
}