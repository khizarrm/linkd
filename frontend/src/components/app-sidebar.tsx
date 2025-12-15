'use client';

import { Search, User, LogOut, FileText, Settings } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { useState } from "react"
import Link from "next/link"
import { useUser, useClerk } from "@clerk/nextjs"
// import { ProfileSettingsDialog } from "./settings/profile-settings-dialog"
import { clearProfileCache } from "@/lib/profile-cache"

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

// Menu items.
const items = [
  {
    title: "Search",
    url: "/",
    icon: Search,
  },
  // {
  //   title: "Templates",
  //   url: "/templates",
  //   icon: FileText,
  // },
]

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [imageError, setImageError] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  // const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    try {
      // Clear profile cache on sign out
      clearProfileCache();
      // Sign out using Clerk
      await signOut();
      router.push('/login');
      router.refresh();
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
          <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
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
      <SidebarRail />
    </Sidebar>
  )
}
