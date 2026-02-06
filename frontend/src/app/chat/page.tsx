"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { ArrowUp, Square } from "lucide-react";
import { MessageContent } from "@/components/chat/message-content";

interface ToolCall {
  toolName: string;
  status: "called" | "completed";
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

export default function ChatPage() {
  const { getToken, userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);

    try {
      const token = await getToken();
      abortControllerRef.current = new AbortController();

      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiBase}/api/agents/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          query: userMessage.content,
          clerkUserId: userId,
          ...(conversationId && { conversationId }),
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

            if (data.type === "tool_call") {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMessageId) return msg;
                  const calls = msg.toolCalls ?? [];
                  if (data.status === "called") {
                    return {
                      ...msg,
                      toolCalls: [
                        ...calls,
                        { toolName: data.toolName, status: "called" as const },
                      ],
                    };
                  }
                  // mark existing call as completed
                  return {
                    ...msg,
                    toolCalls: calls.map((tc) =>
                      tc.toolName === data.toolName
                        ? { ...tc, status: "completed" as const }
                        : tc,
                    ),
                  };
                }),
              );
            }

            if (data.type === "output") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: JSON.stringify(data.data),
                        toolCalls: undefined,
                      }
                    : msg,
                ),
              );
            }

            if (data.done && data.conversationId) {
              setConversationId(data.conversationId);
            }

            if (data.error) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: "Error: " + data.error, toolCalls: undefined }
                    : msg,
                ),
              );
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content + " (stopped)" }
              : msg,
          ),
        );
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="flex flex-col h-screen bg-stone-50 font-sans">
      <header className="flex h-14 shrink-0 items-center justify-center border-b border-stone-100">
        <h1 className="text-sm font-medium text-stone-800 tracking-tight">
          linkd
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div
          className={`max-w-2xl mx-auto space-y-5 ${messages.length === 0 ? "flex items-center justify-center h-full" : ""}`}
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center space-y-3">
              <p className="text-lg font-light text-stone-400">What can I help you find?</p>
              <p className="text-xs text-stone-300">
                Search for companies, people, or emails
              </p>
            </div>
          )}

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
                    ? "rounded-3xl rounded-br-lg bg-stone-900 text-white px-5 py-3"
                    : "rounded-3xl rounded-bl-lg bg-white ring-1 ring-stone-100 shadow-sm text-stone-700 px-5 py-4"
                }`}
              >
                {message.content ? (
                  message.role === "assistant" ? (
                    <MessageContent content={message.content} />
                  ) : (
                    message.content
                  )
                ) : message.role === "assistant" && isLoading ? (
                  message.toolCalls && message.toolCalls.length > 0 ? (
                    <div className="space-y-2.5">
                      {message.toolCalls.map((tc, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2.5 text-[13px]"
                        >
                          {tc.status === "called" ? (
                            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          )}
                          <span
                            className={`font-medium ${
                              tc.status === "called"
                                ? "text-stone-600"
                                : "text-stone-500"
                            }`}
                          >
                            {tc.toolName.replace(/_/g, " ")}
                          </span>
                          <span className="text-stone-300 text-xs">
                            {tc.status === "called" ? "running..." : "done"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-stone-200 animate-pulse" />
                      <span className="h-2 w-2 rounded-full bg-stone-200 animate-pulse [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-stone-200 animate-pulse [animation-delay:300ms]" />
                    </div>
                  )
                ) : null}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 pb-8 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent">
        <div className="flex items-end gap-3 max-w-2xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="relative flex-1 rounded-2xl bg-white ring-1 ring-stone-200 shadow-sm transition-all focus-within:ring-stone-300 focus-within:shadow-md"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={isLoading}
              rows={1}
              className="block w-full resize-none bg-transparent text-[15px] text-stone-800 placeholder:text-stone-400 px-4 py-3.5 pr-14 outline-none disabled:opacity-50"
              style={{ minHeight: "52px", maxHeight: "200px" }}
            />
            <div className="absolute right-2.5 bottom-2.5">
              {isLoading ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex items-center justify-center h-9 w-9 rounded-xl bg-stone-100 hover:bg-stone-200 transition-colors"
                >
                  <Square className="h-3.5 w-3.5 text-stone-500 fill-stone-500" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex items-center justify-center h-9 w-9 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-20 disabled:hover:bg-stone-900 transition-all"
                >
                  <ArrowUp className="h-4 w-4 text-white" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
