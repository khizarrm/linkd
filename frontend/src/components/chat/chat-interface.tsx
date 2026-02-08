"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MessageContent } from "@/components/chat/message-content";
import { MessageLoading } from "@/components/ui/message-loading";
import { ToolCallAccordion } from "./tool-call-accordion";
import { useProtectedApi } from "@/hooks/use-protected-api";
import { useChatContext } from "@/contexts/chat-context";
import { AIInput } from "@/components/ui/ai-input";

interface Step {
  id: string;
  label: string;
  status: "running" | "done";
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  steps?: Step[];
}

interface ChatInterfaceProps {
  chatId?: string;
}

function StreamingText({ content }: { content: string }) {
  if (content.trimStart().startsWith("{")) {
    return <MessageContent content={content} />;
  }

  return (
    <motion.div>
      {content.split(/(\s+)/).map((segment, i) => {
        if (segment.match(/^\s+$/)) {
          return <span key={i}>{segment}</span>;
        }
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
            }}
            className="inline-block"
          >
            {segment}
          </motion.span>
        );
      })}
    </motion.div>
  );
}

export function ChatInterface({ chatId: initialChatId }: ChatInterfaceProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const api = useProtectedApi();
  const { addChat } = useChatContext();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(initialChatId || null);

  useEffect(() => {
    if (initialChatId !== chatId) {
      setChatId(initialChatId || null);
      setMessages([]);
      setConversationId(null);
    }
  }, [initialChatId]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(!!initialChatId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (initialChatId) {
      loadExistingChat(initialChatId);
    }
  }, [initialChatId]);

  const loadExistingChat = async (id: string) => {
    try {
      setIsInitializing(true);
      const response = await api.getChat(id);
      if (response.success) {
        setChatId(id);
        setConversationId(response.chat.claudeConversationId || null);
        setMessages(
          response.messages.map(
            (msg: { id: string; role: string; content: string }) => ({
              id: msg.id,
              role: msg.role as "user" | "assistant",
              content: msg.content,
            }),
          ),
        );
      }
    } catch (error) {
      console.error("Failed to load chat:", error);
      router.push("/chat");
    } finally {
      setIsInitializing(false);
    }
  };

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
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: value.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    let currentChatId = chatId;

    try {
      if (!currentChatId) {
        currentChatId = await createNewChat();
        setChatId(currentChatId);
        window.history.replaceState(null, "", `/chat/${currentChatId}`);

        await api.updateChat(currentChatId, {
          title: generateTitle(userMessage.content),
        });
      }

      await api.addMessage(currentChatId, {
        role: "user",
        content: userMessage.content,
      });

      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);

      const token = await getToken();
      abortControllerRef.current = new AbortController();

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
      const response = await fetch(`${apiBase}/api/agents/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          query: userMessage.content,
          ...(conversationId && { conversationId }),
          chatId: currentChatId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

let buffer = "";
          let finalContent = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ")) continue;

              const dataStr = trimmed.slice(6);
              if (!dataStr) continue;

              try {
                const data = JSON.parse(dataStr);

                if (data.type === "step") {
                  setMessages((prev) =>
                    prev.map((msg) => {
                      if (msg.id !== assistantMessageId) return msg;
                      const steps = msg.steps ?? [];
                      const existing = steps.find((s) => s.id === data.id);
                      if (existing) {
                        return {
                          ...msg,
                          steps: steps.map((s) =>
                            s.id === data.id ? { ...s, status: data.status } : s,
                          ),
                        };
                      }
                      return {
                        ...msg,
                        steps: [
                          ...steps,
                          { id: data.id, label: data.label, status: data.status },
                        ],
                      };
                    }),
                  );
                }

                if (data.type === "text-delta") {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: (msg.content || "") + data.delta }
                        : msg,
                    ),
                  );
                }

            if (data.type === "output") {
              finalContent = data.data.message || "";
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: finalContent,
                        steps: undefined,
                      }
                    : msg,
                ),
              );
            }

            if (data.done && data.conversationId) {
              setConversationId(data.conversationId);
              if (currentChatId) {
                await api.updateChat(currentChatId, {
                  claudeConversationId: data.conversationId,
                });
              }
            }

            if (data.error) {
              finalContent = "Error: " + data.error;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: finalContent, steps: undefined }
                    : msg,
                ),
              );
            }
          } catch {}
        }
      }

      if (finalContent && currentChatId) {
        await api.addMessage(currentChatId, {
          role: "assistant",
          content: finalContent,
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === (Date.now() + 1).toString()
              ? { ...msg, content: msg.content + " (stopped)" }
              : msg,
          ),
        );
      } else {
        const errorMsgId = (Date.now() + 1).toString();
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === errorMsgId
              ? { ...msg, content: "Error: Failed to get response" }
              : msg,
          ),
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
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
              const hasResponseContent = message.content && message.content.trim().length > 0;
              const shouldShowAccordion = message.steps && message.steps.length > 0 && !hasResponseContent && message.role === "assistant" && isLoading;

              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {message.content ? (
                    <div
                      className={`text-[15px] leading-relaxed whitespace-pre-wrap ${
                        message.role === "user"
                          ? "max-w-[80%] rounded-3xl rounded-br-lg bg-primary text-primary-foreground px-5 py-3"
                          : "text-foreground w-full"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <StreamingText content={message.content} />
                      ) : (
                        message.content
                      )}
                    </div>
                  ) : shouldShowAccordion ? (
                    <div className="space-y-2">
                      <ToolCallAccordion
                        steps={message.steps}
                        isLoading={isLoading}
                      />
                    </div>
                  ) : message.role === "assistant" && isLoading ? (
                    <MessageLoading />
                  ) : null}
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
            onStop={handleStop}
            placeholder="What can I help you find?"
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
