'use client';

import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SSOCallback() {
  const { handleRedirectCallback } = useClerk();
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('[SSOCallback] Processing OAuth callback');
      try {
        await handleRedirectCallback();
        console.log('[SSOCallback] Callback successful, redirecting to home');
        router.push('/');
      } catch (err) {
        console.error('[SSOCallback] Error processing callback:', err);
        router.push('/login?error=auth_failed');
      }
    };

    handleCallback();
  }, [handleRedirectCallback, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
        <p className="text-white/70" style={{ fontFamily: 'var(--font-fira-mono)' }}>
          completing sign in...
        </p>
      </div>
    </div>
  );
}

