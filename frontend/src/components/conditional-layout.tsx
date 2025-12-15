'use client';

import { usePathname } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { posthog } from '@/../instrumentation-client';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';

/**
 * Conditional Layout Wrapper
 * Shows sidebar on all pages except login
 */
export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const isLoginPage = pathname === '/login';

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

  if (isLoginPage) {
    return (
      <div className="min-h-screen w-full">
        {children}
      </div>
    );
  }

  // Only show sidebar if signed in
  if (!isSignedIn) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="w-full">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

