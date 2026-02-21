'use client';

import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { posthog } from '@/../instrumentation-client';

export default function SSOCallback() {
  const { handleRedirectCallback } = useClerk();
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await handleRedirectCallback({ redirectUrl: '/' });
        const source = sessionStorage.getItem('linkd_signin_source') || 'unknown';
        posthog.capture('google_signin_succeeded', { source });
        sessionStorage.removeItem('linkd_signin_source');
      } catch (err) {
        const source = sessionStorage.getItem('linkd_signin_source') || 'unknown';
        posthog.capture('google_signin_failed', {
          source,
          error: err instanceof Error ? err.message : 'OAuth callback failed',
        });
        sessionStorage.removeItem('linkd_signin_source');
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
