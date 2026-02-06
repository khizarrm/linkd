'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { posthog } from '@/../instrumentation-client';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { ChatProvider } from '@/contexts/chat-context';
import { useProtectedApi } from '@/hooks/use-protected-api';

function AuthenticatedLayoutInner({ children }: { children: React.ReactNode }) {
  const api = useProtectedApi();
  
  const fetchChatsFn = useCallback(async () => {
    return api.listChats();
  }, [api]);
  
  return (
    <ChatProvider fetchChatsFn={fetchChatsFn}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </ChatProvider>
  );
}

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
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

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="h-4 w-4 rounded-full bg-foreground/20 animate-pulse" />
      </div>
    );
  }

  return (
    <AuthenticatedLayoutInner>
      {children}
    </AuthenticatedLayoutInner>
  );
}

