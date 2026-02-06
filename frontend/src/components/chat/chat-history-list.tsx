'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Trash2, MoreHorizontal } from 'lucide-react';
import { motion } from "framer-motion";
import { useProtectedApi } from '@/hooks/use-protected-api';
import { useChatContext } from '@/contexts/chat-context';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Chat {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GroupedChats {
  today: Chat[];
  yesterday: Chat[];
  thisWeek: Chat[];
  older: Chat[];
}

function groupChatsByDate(chats: Chat[]): GroupedChats {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const grouped: GroupedChats = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  for (const chat of chats) {
    const chatDate = new Date(chat.updatedAt);
    if (chatDate >= today) {
      grouped.today.push(chat);
    } else if (chatDate >= yesterday) {
      grouped.yesterday.push(chat);
    } else if (chatDate >= weekAgo) {
      grouped.thisWeek.push(chat);
    } else {
      grouped.older.push(chat);
    }
  }

  return grouped;
}

function ChatItem({ chat, isActive, onDelete }: { 
  chat: Chat; 
  isActive: boolean;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const displayTitle = chat.title || 'New chat';

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        onClick={() => router.push(`/chat/${chat.id}`)}
        tooltip={displayTitle}
        className="h-auto py-2 relative overflow-hidden"
      >
        <span className="truncate">
          {displayTitle}
        </span>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover className="top-2.5 hover:bg-transparent hover:text-sidebar-foreground data-[state=open]:bg-transparent data-[state=open]:text-sidebar-foreground">
            <MoreHorizontal className="size-4" />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem
            onClick={() => onDelete(chat.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

function ChatGroup({ label, chats, currentChatId, onDelete }: {
  label: string;
  chats: Chat[];
  currentChatId: string | null;
  onDelete: (id: string) => void;
}) {
  if (chats.length === 0) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {chats.map((chat, index) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ChatItem
                chat={chat}
                isActive={chat.id === currentChatId}
                onDelete={onDelete}
              />
            </motion.div>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function ChatHistoryList() {
  const { chats, removeChat, isLoading } = useChatContext();
  const api = useProtectedApi();
  const pathname = usePathname();

  const currentChatId = pathname?.startsWith('/chat/') 
    ? pathname.split('/chat/')[1] 
    : null;

  const handleDelete = async (id: string) => {
    try {
      await api.deleteChat(id);
      removeChat(id);
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  if (isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Chat History</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="px-2 py-4 text-xs text-muted-foreground">Loading...</div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (chats.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Chat History</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="px-2 py-4 text-xs text-muted-foreground">No chats yet</div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  const grouped = groupChatsByDate(chats);

  return (
    <>
      <ChatGroup label="Today" chats={grouped.today} currentChatId={currentChatId} onDelete={handleDelete} />
      <ChatGroup label="Yesterday" chats={grouped.yesterday} currentChatId={currentChatId} onDelete={handleDelete} />
      <ChatGroup label="This Week" chats={grouped.thisWeek} currentChatId={currentChatId} onDelete={handleDelete} />
      <ChatGroup label="Older" chats={grouped.older} currentChatId={currentChatId} onDelete={handleDelete} />
    </>
  );
}
