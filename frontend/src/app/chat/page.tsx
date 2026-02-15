'use client';

import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen bg-background font-sans">
      <ChatInterface />
    </div>
  );
}
