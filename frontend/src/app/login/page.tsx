'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { SignIn } from '@clerk/nextjs';

/**
 * Login Page
 * Centered authentication page with Clerk sign-in
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
      <div className="w-full max-w-md">
        <SignIn 
          routing="hash"
          afterSignInUrl="/"
          afterSignUpUrl="/"
          fallbackRedirectUrl="/login"
          appearance={{
            variables: {
              colorPrimary: '#3b82f6',
              colorBackground: '#151515',
              colorInputBackground: '#151515',
              colorInputText: '#e8e8e8',
              colorText: '#e8e8e8',
              colorTextSecondary: '#6a6a6a',
              colorDanger: '#ef4444',
              borderRadius: '0.5rem',
            },
            elements: {
              rootBox: "mx-auto",
              card: "bg-[#151515] border-[#2a2a2a] shadow-none",
              headerTitle: "text-[#e8e8e8] font-light",
              headerSubtitle: "text-[#6a6a6a] font-light",
              socialButtonsBlockButton: "bg-[#151515] border-[#2a2a2a] text-white hover:bg-[#1a1a1a]",
              socialButtonsBlockButtonText: "!text-white font-light",
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white font-light",
              formFieldInput: "bg-[#151515] border-[#2a2a2a] text-[#e8e8e8] placeholder:text-[#6a6a6a] focus:border-blue-600",
              formFieldLabel: "text-[#e8e8e8] font-light",
              footerActionLink: "hidden",
              dividerLine: "bg-[#2a2a2a]",
              dividerText: "bg-[#6a6a6a]",
              formFieldErrorText: "text-red-400",
              formFieldSuccessText: "text-green-400",
              identityPreviewText: "text-[#e8e8e8]",
              identityPreviewEditButton: "text-blue-400 hover:text-blue-300",
              alertText: "text-[#e8e8e8]",
              formResendCodeLink: "text-blue-400 hover:text-blue-300",
              footer: "hidden",
            },
          }}
        />
      </div>
    </div>
  );
}

