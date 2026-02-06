"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ArrowUp, Square } from "lucide-react";
import { motion } from "framer-motion";
import { MessageContent } from "@/components/chat/message-content";
import { useProtectedApi } from "@/hooks/use-protected-api";
import { useChatContext } from "@/contexts/chat-context";

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
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        setConversationId(response.chat.openaiConversationId || null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
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

            if (data.type === "output") {
              finalContent = JSON.stringify(data.data);
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
                  openaiConversationId: data.conversationId,
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

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);

  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
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
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] text-[15px] leading-relaxed whitespace-pre-wrap ${
                    message.role === "user"
                      ? "rounded-3xl rounded-br-lg bg-primary text-primary-foreground px-5 py-3"
                      : "rounded-3xl rounded-bl-lg glass-chat-bubble text-foreground px-5 py-4 ring-1 ring-black/[0.08] shadow-sm"
                  }`}
                >
                  {message.content ? (
                    message.role === "assistant" ? (
                      <StreamingText content={message.content} />
                    ) : (
                      message.content
                    )
                  ) : message.role === "assistant" && isLoading ? (
                    message.steps && message.steps.length > 0 ? (
                      <div className="space-y-2">
                        {message.steps.map((step) => (
                          <div
                            key={step.id}
                            className={`text-[13px] font-medium ${
                              step.status === "running"
                                ? "text-foreground animate-pulse"
                                : "text-muted-foreground/40"
                            }`}
                          >
                            {step.label}
                            {step.status === "running" && (
                              <span className="text-muted-foreground/50">
                                ...
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 h-6 px-2">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-foreground/60"
                            animate={{
                              y: ["0%", "-30%", "0%"],
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: i * 0.2,
                            }}
                          />
                        ))}
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 pb-8 bg-gradient-to-t from-background via-background to-transparent">
        <div className="flex items-end gap-3 max-w-2xl mx-auto">
          <motion.form
            layout
            onSubmit={handleSubmit}
            className={`relative flex-1 rounded-2xl bg-muted ring-1 shadow-sm transition-all ${
              isFocused ? "ring-ring shadow-md" : "ring-border"
            }`}
          >
            {!input && (
              <span className="absolute left-4 top-3.5 text-muted-foreground pointer-events-none text-[15px]">
                Ask anything...
              </span>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isLoading}
              rows={1}
              className="block w-full resize-none bg-transparent text-[15px] text-foreground px-4 py-3.5 pr-14 outline-none disabled:opacity-50"
              style={{ minHeight: "52px", maxHeight: "200px" }}
            />
            <div className="absolute right-2.5 bottom-2.5">
              {isLoading ? (
                <motion.button
                  type="button"
                  onClick={handleStop}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center h-9 w-9 rounded-xl bg-muted-foreground/10 hover:bg-muted-foreground/20 transition-colors"
                >
                  <Square className="h-3.5 w-3.5 text-muted-foreground fill-muted-foreground" />
                </motion.button>
              ) : (
                <motion.button
                  type="submit"
                  disabled={!input.trim()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-20 disabled:hover:bg-primary transition-all"
                >
                  <motion.div
                    animate={
                      input.trim()
                        ? {
                            rotate: [0, -10, 10, -10, 10, 0],
                            transition: {
                              duration: 0.5,
                              repeat: Infinity,
                              repeatDelay: 2,
                            },
                          }
                        : {}
                    }
                  >
                    <ArrowUp
                      className="h-4 w-4 text-primary-foreground"
                      strokeWidth={2.5}
                    />
                  </motion.div>
                </motion.button>
              )}
            </div>
          </motion.form>
        </div>
      </div>
    </div>
  );
}
