'use client';

import { ChatInterface } from "@/components/chat/chat-interface";
import { use } from "react";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex flex-col h-screen bg-background font-sans">
      <ChatInterface chatId={id} />
    </div>
  );
}