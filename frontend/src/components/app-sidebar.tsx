'use client';

import { User, FileText, Info, Plus, LayoutTemplate, LogOut } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { useState } from "react"
import { useUser, useClerk } from "@clerk/nextjs"
import { FeedbackDialog } from "./feedback-dialog"
import { InfoDialog } from "./info-dialog"
import { ChatHistoryList } from "./chat/chat-history-list"
import { TemplateManagementModal } from "./templates/template-management-modal"
import { ProfileModal } from "./profile-modal"

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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  // const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const { user } = useUser();
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleNewChat = () => {
    const isChatRoot = pathname === '/chat' || pathname === '/chat/';
    const isChatRoute = pathname?.startsWith('/chat/');

    if (isChatRoot || isChatRoute) {
      window.dispatchEvent(new Event('linkd:new-chat'));
    }

    if (!isChatRoot) {
      router.push('/chat');
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
                  onClick={handleNewChat}
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
          {showProfileMenu && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => { setShowProfileMenu(false); setIsProfileModalOpen(true); }}
                  tooltip="Personalize"
                  className="text-muted-foreground hover:text-foreground animate-in slide-in-from-bottom-2 fade-in duration-200"
                >
                  <User />
                  <span>Personalize</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
            </>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              tooltip="Profile"
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
      <ProfileModal
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
      />
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
