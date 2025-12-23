'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { posthog } from '@/../instrumentation-client';

/**
 * Conditional Layout Wrapper
 * Shows sidebar on all pages except login
 */
export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  // Identify user in PostHog when signed in
  useEffect(() => {
    if (isSignedIn && user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    }
  }, [isSignedIn, user]);

  // No sidebar for now - just render children
  return (
    <div className="min-h-screen w-full">
      {children}
    </div>
  );
}

