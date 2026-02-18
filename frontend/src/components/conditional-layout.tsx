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
  const [isResettingOnboarding, setIsResettingOnboarding] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingDefaults, setOnboardingDefaults] = useState<{
    outreachIntents: string[];
    profileBlurb: string | null;
    linkedinUrl: string | null;
    websiteUrl: string | null;
    additionalUrls: Array<{ label: string; url: string }>;
    onboardingStep: number;
  }>({
    outreachIntents: [],
    profileBlurb: null,
    linkedinUrl: null,
    websiteUrl: null,
    additionalUrls: [],
    onboardingStep: 1,
  });

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
        setOnboardingDefaults({
          outreachIntents: response.user.outreachIntents || [],
          profileBlurb: response.user.profileBlurb || null,
          linkedinUrl: response.user.linkedinUrl || null,
          websiteUrl: response.user.websiteUrl || null,
          additionalUrls: response.user.additionalUrls || [],
          onboardingStep: response.user.onboardingStep || 1,
        });
        setNeedsOnboarding(!response.user.onboardingCompleted);
      })
      .catch((error) => {
        console.error("Failed to load user profile for onboarding:", error);
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
        defaultValues={onboardingDefaults}
        onStepSave={async (data) => {
          const response = await apiRef.current.updateCurrentUser(data);
          setOnboardingDefaults({
            outreachIntents: response.user.outreachIntents || [],
            profileBlurb: response.user.profileBlurb || null,
            linkedinUrl: response.user.linkedinUrl || null,
            websiteUrl: response.user.websiteUrl || null,
            additionalUrls: response.user.additionalUrls || [],
            onboardingStep: response.user.onboardingStep || 1,
          });
        }}
        onGenerateTemplate={async ({
          outreachIntents,
          profileBlurb,
          linkedinUrl,
          websiteUrl,
          additionalUrls,
        }) => {
          const response = await apiRef.current.generateTemplateFromOnboarding({
            outreachIntents,
            profileBlurb,
            linkedinUrl,
            websiteUrl,
            additionalUrls,
          });
          return response.templateDraft;
        }}
        onSubmit={async ({
          outreachIntents,
          profileBlurb,
          linkedinUrl,
          websiteUrl,
          additionalUrls,
          templateDraft,
        }) => {
          try {
            setIsSavingOnboarding(true);
            const profileResponse = await apiRef.current.updateCurrentUser({
              outreachIntents,
              profileBlurb,
              linkedinUrl,
              websiteUrl,
              additionalUrls,
              onboardingStep: 3,
              onboardingCompleted: false,
            });
            const createdTemplate = await apiRef.current.createTemplate({
              name: templateDraft.name,
              subject: templateDraft.subject,
              body: templateDraft.body,
              footer: templateDraft.footer,
              attachments: templateDraft.attachments,
            });
            const templateId = createdTemplate?.template?.id;
            if (templateId) {
              await apiRef.current.setDefaultTemplate(templateId);
            }
            const response = await apiRef.current.updateCurrentUser({
              onboardingStep: 3,
              onboardingCompleted: true,
            });
            setOnboardingDefaults({
              outreachIntents: profileResponse.user.outreachIntents || [],
              profileBlurb: profileResponse.user.profileBlurb || null,
              linkedinUrl: profileResponse.user.linkedinUrl || null,
              websiteUrl: profileResponse.user.websiteUrl || null,
              additionalUrls: profileResponse.user.additionalUrls || [],
              onboardingStep: profileResponse.user.onboardingStep || 1,
            });
            setNeedsOnboarding(!response.user.onboardingCompleted);
          } catch (error) {
            console.error("Failed to save onboarding:", error);
          } finally {
            setIsSavingOnboarding(false);
          }
        }}
      />
      {process.env.NODE_ENV !== "production" && (
        <button
          type="button"
          onClick={async () => {
            try {
              setIsResettingOnboarding(true);
              const response = await apiRef.current.updateCurrentUser({
                outreachIntents: [],
                profileBlurb: "",
                linkedinUrl: null,
                websiteUrl: null,
                additionalUrls: [],
                onboardingStep: 1,
                onboardingCompleted: false,
              });
              setOnboardingDefaults({
                outreachIntents: response.user.outreachIntents || [],
                profileBlurb: response.user.profileBlurb || null,
                linkedinUrl: response.user.linkedinUrl || null,
                websiteUrl: response.user.websiteUrl || null,
                additionalUrls: response.user.additionalUrls || [],
                onboardingStep: response.user.onboardingStep || 1,
              });
              setNeedsOnboarding(true);
            } catch (error) {
              console.error("Failed to reset onboarding:", error);
            } finally {
              setIsResettingOnboarding(false);
            }
          }}
          className="fixed bottom-4 right-4 z-[130] rounded-lg border border-white/20 bg-black/80 px-3 py-2 text-xs text-white hover:border-white/40"
        >
          {isResettingOnboarding ? "Resetting..." : "Reset onboarding"}
        </button>
      )}
    </>
  );
}
