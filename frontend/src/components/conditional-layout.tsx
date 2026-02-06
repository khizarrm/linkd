'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { posthog } from '@/../instrumentation-client';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();

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

  const isAuthPage = pathname === '/login' || pathname === '/sso-callback';
  const showSidebar = isSignedIn && !isAuthPage;

  if (!showSidebar) {
    return (
      <div className="min-h-screen w-full">
        {children}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

