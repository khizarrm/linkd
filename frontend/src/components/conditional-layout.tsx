'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useCallback, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { posthog } from '@/../instrumentation-client';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { ChatProvider } from '@/contexts/chat-context';
import { useProtectedApi } from '@/hooks/use-protected-api';
import { OnboardingModal } from '@/components/onboarding/onboarding-modal';

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
  const api = useProtectedApi();
  const apiRef = useRef(api);
  apiRef.current = api;

  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [isSavingOnboarding, setIsSavingOnboarding] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingContext, setOnboardingContext] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || isAuthPage) {
      setIsCheckingOnboarding(false);
      setNeedsOnboarding(false);
      return;
    }

    let active = true;
    setIsCheckingOnboarding(true);

    apiRef.current.getCurrentUser()
      .then((response) => {
        if (!active) return;
        setOnboardingContext(response.user.onboardingContext || null);
        setNeedsOnboarding(!response.user.onboardingCompleted);
      })
      .catch((error) => {
        console.error('Failed to load user profile for onboarding:', error);
        if (!active) return;
        setNeedsOnboarding(false);
      })
      .finally(() => {
        if (!active) return;
        setIsCheckingOnboarding(false);
      });

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, isAuthPage]);

  if (isAuthPage) {
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

  if (!isSignedIn) {
    return (
      <div className="min-h-screen w-full">
        {children}
      </div>
    );
  }

  if (isCheckingOnboarding) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="h-4 w-4 rounded-full bg-foreground/20 animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <AuthenticatedLayoutInner>
        {children}
      </AuthenticatedLayoutInner>
      <OnboardingModal
        open={needsOnboarding}
        isSaving={isSavingOnboarding}
        defaultValue={onboardingContext}
        onSubmit={async ({ onboardingContext: value }) => {
          try {
            setIsSavingOnboarding(true);
            const response = await apiRef.current.updateCurrentUser({
              onboardingContext: value,
              onboardingCompleted: true,
            });
            setOnboardingContext(response.user.onboardingContext || null);
            setNeedsOnboarding(!response.user.onboardingCompleted);
          } catch (error) {
            console.error('Failed to save onboarding:', error);
          } finally {
            setIsSavingOnboarding(false);
          }
        }}
      />
    </>
  );
}
