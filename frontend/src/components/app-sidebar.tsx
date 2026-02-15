'use client';

import { User, LogOut, FileText, Info, Plus, LayoutTemplate } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { useState } from "react"
import { useUser, useClerk } from "@clerk/nextjs"
import { FeedbackDialog } from "./feedback-dialog"
import { InfoDialog } from "./info-dialog"
import { ChatHistoryList } from "./chat/chat-history-list"
import { TemplateManagementModal } from "./templates/template-management-modal"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [imageError, setImageError] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  // const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const { user } = useUser();
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    try {
      // Sign out using Clerk
      await signOut();
      // Manually redirect after signout completes
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  // Get user info from Clerk
  const userName = user?.fullName || user?.firstName || 'User';
  const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';
  const userImage = user?.imageUrl || null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-12 items-center gap-2 px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span className="font-medium text-lg tracking-tight group-data-[collapsible=icon]:hidden">LINKD</span>
          <button
            onClick={() => setIsInfoDialogOpen(true)}
            className="ml-auto p-1 hover:bg-sidebar-accent rounded-md transition-colors group-data-[collapsible=icon]:hidden"
            aria-label="About linkd"
          >
            <Info className="size-4" />
          </button>
          <SidebarTrigger className="group-data-[collapsible=icon]:ml-0" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    if (pathname === '/chat') {
                      window.location.href = '/chat';
                    } else {
                      router.push('/chat');
                    }
                  }}
                  tooltip="New chat"
                >
                  <Plus className="size-4" />
                  <span>New chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setIsTemplatesModalOpen(true)}
                  tooltip="Templates"
                >
                  <LayoutTemplate className="size-4" />
                  <span>Templates</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="group-data-[collapsible=icon]:hidden">
          <ChatHistoryList />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setIsFeedbackDialogOpen(true)}
              tooltip="Feedback"
              className="text-muted-foreground hover:text-foreground"
            >
              <FileText />
              <span>Feedback</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {showSignOut && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleSignOut}
                tooltip="Sign out"
                className="text-muted-foreground hover:text-destructive animate-in slide-in-from-bottom-2 fade-in duration-200"
              >
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {/* <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setIsSettingsDialogOpen(true)}
              tooltip="Settings"
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem> */}
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              onClick={() => setShowSignOut(!showSignOut)}
            >
              {userImage && !imageError ? (
                <Image 
                  src={userImage} 
                  alt={userName}
                  width={32}
                  height={32}
                  className="rounded-full object-cover bg-sidebar-primary"
                  onError={() => setImageError(true)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground border border-sidebar-border">
                  <User className="size-5" />
                </div>
              )}
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{userName}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">{userEmail || 'Loading...'}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      {/* <ProfileSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
      /> */}
      <FeedbackDialog
        open={isFeedbackDialogOpen}
        onOpenChange={setIsFeedbackDialogOpen}
      />
      <InfoDialog
        open={isInfoDialogOpen}
        onOpenChange={setIsInfoDialogOpen}
      />
      <TemplateManagementModal
        open={isTemplatesModalOpen}
        onOpenChange={setIsTemplatesModalOpen}
      />
      <SidebarRail />
    </Sidebar>
  )
}
