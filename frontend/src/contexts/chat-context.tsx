'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface Chat {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChatContextType {
  chats: Chat[];
  addChat: (chat: Chat) => void;
  removeChat: (id: string) => void;
  updateChats: (chats: Chat[]) => void;
  refreshChats: () => Promise<void>;
  isLoading: boolean;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ 
  children,
  fetchChatsFn 
}: { 
  children: React.ReactNode;
  fetchChatsFn: () => Promise<{ chats: Chat[] }>;
}) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  const refreshChats = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchChatsFn();
      setChats(response.chats || []);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setIsLoading(false);
      setHasInitialized(true);
    }
  }, [fetchChatsFn]);

  useEffect(() => {
    if (!hasInitialized) {
      refreshChats();
    }
  }, [hasInitialized, refreshChats]);

  useEffect(() => {
    const onFocus = () => {
      if (hasInitialized) refreshChats();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [hasInitialized, refreshChats]);

  const addChat = useCallback((chat: Chat) => {
    setChats((prev) => {
      const exists = prev.find((c) => c.id === chat.id);
      if (exists) {
        return prev.map((c) => (c.id === chat.id ? chat : c));
      }
      return [chat, ...prev];
    });
  }, []);

  const removeChat = useCallback((id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateChats = useCallback((newChats: Chat[]) => {
    setChats(newChats);
  }, []);

  const value = React.useMemo(() => ({
    chats,
    addChat,
    removeChat,
    updateChats,
    refreshChats,
    isLoading,
  }), [chats, isLoading, addChat, removeChat, updateChats, refreshChats]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === null) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
