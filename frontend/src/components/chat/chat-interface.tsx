"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { MessageLoading } from "@/components/ui/message-loading";
import { StepItem, type Step } from "./step-item";
import { EmailComposeCard, type EmailData } from "./email-compose-card";
import { ChatComposeModal } from "./chat-compose-modal";
import { ChatPersonCard, type PersonData } from "./person-card";
import { useProtectedApi } from "@/hooks/use-protected-api";
import { useChatContext } from "@/contexts/chat-context";
import { AIInput } from "@/components/ui/ai-input";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

interface Step {
  id: string;
  label: string;
  status: "running" | "done";
}

interface ChatInterfaceProps {
  chatId?: string;
}

function StreamingText({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

function toUiMessages(messages: Array<{ id: string; role: string; content: string }>): UIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as "user" | "assistant",
    parts: [{ type: "text", text: message.content || "" }],
  }));
}

function ChatSession({
  chatId,
  initialMessages,
  onChatIdChange,
  onTitleUpdate,
}: {
  chatId: string | null;
  initialMessages: UIMessage[];
  onChatIdChange: (nextChatId: string) => void;
  onTitleUpdate: (chatId: string, title: string) => Promise<void>;
}) {
  const { getToken } = useAuth();
  const api = useProtectedApi();
  const { addChat } = useChatContext();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${apiBase}/api/agents/research`,
      }),
    [apiBase],
  );

  const { messages, sendMessage, status, stop } = useChat({
    messages: initialMessages,
    transport,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";
  const [composeEmail, setComposeEmail] = useState<EmailData | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewChat = async (): Promise<string> => {
    const response = await api.createChat();
    if (response.success) {
      const newChat = {
        id: response.chat.id,
        title: response.chat.title || "New chat",
        createdAt: response.chat.createdAt || new Date().toISOString(),
        updatedAt: response.chat.updatedAt || new Date().toISOString(),
      };
      addChat(newChat);
      return response.chat.id;
    }
    throw new Error("Failed to create chat");
  };

  const generateTitle = (content: string): string => {
    const truncated = content.slice(0, 50);
    return truncated.length < content.length ? `${truncated}...` : truncated;
  };

  const handleSubmit = async (value: string) => {
    if (!value.trim() || isLoading) return;

    try {
      let currentChatId = chatId;
      if (!currentChatId) {
        currentChatId = await createNewChat();
        onChatIdChange(currentChatId);
        window.history.replaceState(null, "", `/chat/${currentChatId}`);
        await onTitleUpdate(currentChatId, generateTitle(value.trim()));
      }

      const token = await getToken();
      await sendMessage(
        { text: value.trim() },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: {
            chatId: currentChatId,
          },
        },
      );
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto p-6">
        <div
          className={`max-w-2xl mx-auto space-y-8 ${messages.length === 0 ? "flex items-center justify-center h-full" : ""}`}
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center space-y-3">
              <p className="text-lg font-light text-muted-foreground">
                What can I help you find?
              </p>
              <p className="text-xs text-muted-foreground/60">
                Search for people (currently in beta)
              </p>
            </div>
          )}

          <div className="space-y-8">
            {messages.map((message) => {
              const renderedPartIds = new Set<string>();

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`text-[15px] leading-relaxed whitespace-pre-wrap ${
                      message.role === "user"
                        ? "max-w-[80%] rounded-3xl rounded-br-lg bg-primary text-primary-foreground px-5 py-3"
                        : "text-foreground w-full"
                    }`}
                  >
                    {message.role === "user" ? (
                      message.parts
                        .filter((part): part is Extract<UIMessage["parts"][number], { type: "text" }> => part.type === "text")
                        .map((part) => part.text)
                        .join("")
                    ) : (
                      <div className="space-y-3">
                        {message.parts.map((part, index) => {
                          if (
                            ("id" in part && typeof part.id === "string") &&
                            renderedPartIds.has(part.id)
                          ) {
                            return null;
                          }

                          if ("id" in part && typeof part.id === "string") {
                            renderedPartIds.add(part.id);
                          }

                          switch (part.type) {
                            case "text":
                              return <StreamingText key={index} content={part.text} />;

                            case "data-step": {
                              const step = part.data as Step;
                              return <StepItem key={part.id} step={step} />;
                            }

                            case "data-person": {
                              const person = part.data as PersonData;
                              return <ChatPersonCard key={part.id} person={person} />;
                            }

                            case "data-email": {
                              const email = part.data as EmailData;
                              return <EmailComposeCard
                                key={part.id}
                                email={email}
                                onCompose={setComposeEmail}
                              />;
                            }

                            default:
                              return null;
                          }
                        })}

                        {message.parts.length === 0 && isLoading && <MessageLoading />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 pb-8 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-2xl mx-auto">
          <AIInput
            onSubmit={handleSubmit}
            onStop={stop}
            placeholder="What can I help you find?"
            disabled={isLoading}
          />
        </div>
      </div>

      {composeEmail && (
        <ChatComposeModal
          open={!!composeEmail}
          onOpenChange={(open) => {
            if (!open) setComposeEmail(null);
          }}
          emailData={composeEmail}
        />
      )}
    </div>
  );
}

export function ChatInterface({ chatId: initialChatId }: ChatInterfaceProps) {
  const router = useRouter();
  const api = useProtectedApi();

  const [chatId, setChatId] = useState<string | null>(initialChatId || null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [isInitializing, setIsInitializing] = useState(!!initialChatId);
  const [sessionKey, setSessionKey] = useState(initialChatId || "new");

  useEffect(() => {
    if (initialChatId !== chatId) {
      setChatId(initialChatId || null);
      setInitialMessages([]);
      setSessionKey(initialChatId || "new");
    }
  }, [initialChatId]);

  useEffect(() => {
    if (initialChatId) {
      loadExistingChat(initialChatId);
    } else {
      setInitialMessages([]);
      setIsInitializing(false);
    }
  }, [initialChatId]);

  const loadExistingChat = async (id: string) => {
    try {
      setIsInitializing(true);
      const response = await api.getChat(id);
      if (response.success) {
        setChatId(id);
        setInitialMessages(response.messages);
      }
    } catch (error) {
      console.error("Failed to load chat:", error);
      router.push("/chat");
    } finally {
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse" />
            <span>Loading chat...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ChatSession
      key={sessionKey}
      chatId={chatId}
      initialMessages={initialMessages}
      onChatIdChange={setChatId}
      onTitleUpdate={async (id, title) => api.updateChat(id, { title })}
    />
  );
}
