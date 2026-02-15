'use client';

import { ChatInterface } from "@/components/chat/chat-interface";
import { ChatProvider } from "@/contexts/chat-context";
import { useProtectedApi } from "@/hooks/use-protected-api";
import { useCallback } from "react";

export default function Home() {
  const api = useProtectedApi();

  const fetchChatsFn = useCallback(async () => {
    return api.listChats();
  }, [api]);

  return (
    <ChatProvider fetchChatsFn={fetchChatsFn}>
      <div className="flex flex-col h-screen bg-background font-sans">
        <ChatInterface />
      </div>
    </ChatProvider>
  );
}
