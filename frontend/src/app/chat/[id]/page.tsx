import { ChatInterface } from "@/components/chat/chat-interface";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <div className="flex flex-col h-screen bg-background font-sans">
      <header className="flex h-14 shrink-0 items-center justify-center border-b border-border">
        <h1 className="text-sm font-medium text-foreground tracking-tight">
          linkd
        </h1>
      </header>
      <ChatInterface chatId={id} />
    </div>
  );
}