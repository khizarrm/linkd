"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ArrowDown } from "lucide-react";
import { MessageLoading } from "@/components/ui/message-loading";
import { Button } from "@/components/ui/button";
import { StepItem, type Step } from "./step-item";
import { EmailComposeCard, type EmailData, type ProcessedEmailContent } from "./email-compose-card";
import { ChatComposeModal } from "./chat-compose-modal";
import { ChatBulkComposeModal } from "./chat-bulk-compose-modal";
import { ChatPersonCard, type PersonData } from "./person-card";
import { useProtectedApi } from "@/hooks/use-protected-api";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { useChatContext } from "@/contexts/chat-context";
import { AIInput } from "@/components/ui/ai-input";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { posthog } from "@/../instrumentation-client";

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

function ChatSession({
  chatId,
  initialMessages,
  onChatIdChange,
}: {
  chatId: string | null;
  initialMessages: UIMessage[];
  onChatIdChange: (nextChatId: string) => void;
}) {
  const { getToken } = useAuth();
  const api = useProtectedApi();
  const { addChat } = useChatContext();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
  const sendLastMessageOnly =
    process.env.NEXT_PUBLIC_RESEARCH_SEND_LAST_MESSAGE_ONLY === "true";

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${apiBase}/api/agents/research`,
        prepareSendMessagesRequest: ({ messages, body, trigger }) => {
          if (!sendLastMessageOnly || trigger === "regenerate-message") {
            return {
              body: {
                ...(body || {}),
                messages,
              },
            };
          }

          const latestMessage = messages[messages.length - 1];
          return {
            body: {
              ...(body || {}),
              messages: latestMessage ? [latestMessage] : [],
            },
          };
        },
      }),
    [apiBase, sendLastMessageOnly],
  );

  const { messages, sendMessage, status, stop } = useChat({
    messages: initialMessages,
    transport,
  });

  const { containerRef, endRef, isAtBottom, scrollToBottom } =
    useScrollToBottom();
  const isLoading = status === "submitted" || status === "streaming";
  const [composeEmail, setComposeEmail] = useState<EmailData | null>(null);
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [sentEmailIds, setSentEmailIds] = useState<Set<string>>(new Set());
  const [bulkComposeOpen, setBulkComposeOpen] = useState(false);
  const trackedGeneratedEmailIds = useRef<Set<string>>(new Set());

  const availableEmails = useMemo(() => {
    const map = new Map<string, EmailData>();
    for (const message of messages) {
      if (message.role !== "assistant" || !Array.isArray(message.parts)) continue;

      const emailContentMap = new Map<string, ProcessedEmailContent>();
      for (const part of message.parts) {
        if (part.type !== "data-email-content" || !("data" in part)) continue;
        const data = part.data as {
          emailId: string;
          templateId: string;
          subject: string;
          body: string;
          footer: string | null;
          attachments: string | null;
        };
        emailContentMap.set(data.emailId, {
          templateId: data.templateId,
          subject: data.subject,
          body: data.body,
          footer: data.footer,
          attachments: data.attachments,
        });
      }

      message.parts.forEach((part, index) => {
        if (part.type !== "data-email" || !("data" in part)) return;
        const base = part.data as EmailData;
        const preProcessed = emailContentMap.get(base.id);
        const partId =
          "id" in part && typeof part.id === "string" ? part.id : `email_part_${index}`;
        const uiId = `${message.id}:${partId}`;
        map.set(
          uiId,
          preProcessed
            ? { ...base, uiId, processedEmail: preProcessed }
            : { ...base, uiId },
        );
      });
    }
    return map;
  }, [messages]);

  const selectedEmails = useMemo(
    () =>
      [...selectedEmailIds]
        .map((id) => availableEmails.get(id))
        .filter((email): email is EmailData => Boolean(email))
        .filter((email) => !sentEmailIds.has(email.uiId ?? email.id)),
    [selectedEmailIds, availableEmails, sentEmailIds],
  );
  const unsentAvailableEmailIds = useMemo(
    () => [...availableEmails.keys()].filter((id) => !sentEmailIds.has(id)),
    [availableEmails, sentEmailIds],
  );
  const totalAvailableEmails = unsentAvailableEmailIds.length;
  const allEmailsSelected =
    totalAvailableEmails > 0 && selectedEmails.length === totalAvailableEmails;

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
      const wasNewChat = !chatId;
      let currentChatId = chatId;
      if (!currentChatId) {
        currentChatId = await createNewChat();
        onChatIdChange(currentChatId);
        window.history.replaceState(null, "", `/chat/${currentChatId}`);

        const title = generateTitle(value.trim());
        await api.updateChat(currentChatId, { title });
        addChat({
          id: currentChatId,
          title,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      posthog.capture("chat_user_message_sent", {
        source: "research_agent",
        chat_id: currentChatId,
        message_length: value.trim().length,
        is_new_chat: wasNewChat,
      });

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

  useEffect(() => {
    for (const message of messages) {
      if (message.role !== "assistant" || !Array.isArray(message.parts)) continue;
      for (const part of message.parts) {
        if (part.type !== "data-email" || !("data" in part)) continue;
        const email = part.data as EmailData;
        const trackingKey = `${message.id}:${email.id}`;
        if (trackedGeneratedEmailIds.current.has(trackingKey)) continue;
        trackedGeneratedEmailIds.current.add(trackingKey);

        posthog.capture("agent_email_target_generated", {
          source: "research_agent",
          chat_id: chatId,
          email_id: email.id,
          generated_email: email.email,
          person_name: email.name,
          recipient_domain: email.domain,
          verification_status: email.verificationStatus,
        });
      }
    }
  }, [messages, chatId]);

  const handleComposeClick = (email: EmailData) => {
    if (sentEmailIds.has(email.uiId ?? email.id)) return;
    posthog.capture("email_compose_clicked", {
      source: "research_agent",
      chat_id: chatId,
      email_id: email.id,
      generated_email: email.email,
      person_name: email.name,
      recipient_domain: email.domain,
      verification_status: email.verificationStatus,
    });
    setComposeEmail(email);
  };

  const handleToggleSelect = (email: EmailData) => {
    const targetId = email.uiId ?? email.id;
    if (sentEmailIds.has(targetId)) return;
    setSelectedEmailIds((prev) => {
      const next = new Set(prev);
      if (next.has(targetId)) {
        next.delete(targetId);
      } else {
        next.add(targetId);
      }
      return next;
    });
  };

  const handleSelectAllToggle = () => {
    if (allEmailsSelected) {
      setSelectedEmailIds(new Set());
      return;
    }
    setSelectedEmailIds(new Set(unsentAvailableEmailIds));
  };

  useEffect(() => {
    setSelectedEmailIds((prev) => {
      const filtered = [...prev].filter(
        (id) => availableEmails.has(id) && !sentEmailIds.has(id),
      );
      if (filtered.length === prev.size) return prev;
      return new Set(filtered);
    });
  }, [availableEmails, sentEmailIds]);

  const handleEmailSent = (emailId: string) => {
    setSentEmailIds((prev) => {
      const next = new Set(prev);
      next.add(emailId);
      return next;
    });
    setSelectedEmailIds((prev) => {
      const next = new Set(prev);
      next.delete(emailId);
      return next;
    });
  };

  const handleBulkSent = (emailIds: string[]) => {
    setSentEmailIds((prev) => {
      const next = new Set(prev);
      for (const id of emailIds) next.add(id);
      return next;
    });
    setSelectedEmailIds((prev) => {
      const next = new Set(prev);
      for (const id of emailIds) next.delete(id);
      return next;
    });
  };

  const isEmpty = messages.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col h-full bg-black">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-2xl px-6 flex flex-col items-center gap-8">
            <div className="text-center space-y-3">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
                Let&apos;s find you people
              </h1>
              <p className="text-base text-neutral-500">
                Tell us who you&apos;re looking to reach and we&apos;ll help you connect
              </p>
            </div>
            <div className="w-full">
              <AIInput
                onSubmit={handleSubmit}
                onStop={stop}
                placeholder="Who can I help you find?"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="relative flex-1">
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-y-auto p-6"
        >
          <div className="max-w-2xl mx-auto space-y-8">
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
                      className={`text-[15px] leading-relaxed ${
                        message.role === "user"
                          ? "max-w-[80%] rounded-3xl rounded-br-lg bg-primary text-primary-foreground px-5 py-3 whitespace-pre-wrap"
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
                          {(() => {
                            const elements: React.ReactNode[] = [];
                            let personBatch: PersonData[] = [];
                            let batchStartIndex = 0;

                            const emailContentMap = new Map<string, ProcessedEmailContent>();
                            for (const p of message.parts) {
                              if (p.type === "data-email-content" && "data" in p) {
                                const d = p.data as { emailId: string; templateId: string; subject: string; body: string; footer: string | null; attachments: string | null };
                                emailContentMap.set(d.emailId, {
                                  templateId: d.templateId,
                                  subject: d.subject,
                                  body: d.body,
                                  footer: d.footer,
                                  attachments: d.attachments,
                                });
                              }
                            }

                            const flushPersonBatch = () => {
                              if (personBatch.length === 0) return;
                              elements.push(
                                <div key={`person-grid-${batchStartIndex}`} className="grid grid-cols-3 gap-2.5">
                                  {personBatch.map((person) => (
                                    <ChatPersonCard key={person.id} person={person} />
                                  ))}
                                </div>
                              );
                              personBatch = [];
                            };

                            message.parts.forEach((part, index) => {
                              if (
                                ("id" in part && typeof part.id === "string") &&
                                renderedPartIds.has(part.id)
                              ) {
                                return;
                              }
                              if ("id" in part && typeof part.id === "string") {
                                renderedPartIds.add(part.id);
                              }

                              if (part.type === "data-person") {
                                if (personBatch.length === 0) batchStartIndex = index;
                                personBatch.push(part.data as PersonData);
                                return;
                              }

                              if (part.type === "data-email-content") return;

                              flushPersonBatch();

                              switch (part.type) {
                                case "text":
                                  elements.push(<StreamingText key={index} content={part.text} />);
                                  break;
                                case "data-step": {
                                  const step = part.data as Step;
                                  elements.push(<StepItem key={part.id} step={step} />);
                                  break;
                                }
                                case "data-email": {
                                  const emailBase = part.data as EmailData;
                                  const preProcessed = emailContentMap.get(emailBase.id);
                                  const partId =
                                    "id" in part && typeof part.id === "string"
                                      ? part.id
                                      : `email_part_${index}`;
                                  const uiId = `${message.id}:${partId}`;
                                  const email: EmailData = preProcessed
                                    ? { ...emailBase, uiId, processedEmail: preProcessed }
                                    : { ...emailBase, uiId };
                                  const isSent = sentEmailIds.has(uiId);
                                  elements.push(
                                    <EmailComposeCard
                                      key={uiId}
                                      email={email}
                                      onCompose={handleComposeClick}
                                      isSelected={selectedEmailIds.has(uiId)}
                                      onToggleSelect={handleToggleSelect}
                                      isSent={isSent}
                                    />
                                  );
                                  break;
                                }
                                default:
                                  break;
                              }
                            });

                            flushPersonBatch();
                            return elements;
                          })()}

                          {message.parts.length === 0 && isLoading && <MessageLoading />}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={endRef} className="min-h-[24px] shrink-0" />
          </div>
        </div>

        <button
          aria-label="Scroll to bottom"
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className={`absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border-0 bg-blue-500 p-2 shadow-lg transition-all hover:bg-blue-600 ${
            isAtBottom
              ? "pointer-events-none scale-0 opacity-0"
              : "pointer-events-auto scale-100 opacity-100"
          }`}
        >
          <ArrowDown className="size-4 text-white" />
        </button>
      </div>

      <div className="p-4 pb-8 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-2xl mx-auto">
          {totalAvailableEmails > 0 && (
            <div className="mb-3 rounded-xl border border-[#2a2a2a] bg-[#111111] px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-[#d0d0d0]">
                {selectedEmails.length} / {totalAvailableEmails} selected
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllToggle}
                  className="text-[#8a8a8a] hover:text-[#e8e8e8] hover:bg-[#1a1a1a]"
                >
                  {allEmailsSelected ? "Unselect all" : "Select all"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEmailIds(new Set())}
                  className="text-[#8a8a8a] hover:text-[#e8e8e8] hover:bg-[#1a1a1a]"
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={() => setBulkComposeOpen(true)}
                  disabled={selectedEmails.length === 0}
                  className="bg-[#e8e8e8] text-black hover:bg-white"
                >
                  Send selected
                </Button>
              </div>
            </div>
          )}
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
          chatId={chatId}
          onSendSuccess={handleEmailSent}
        />
      )}

      {bulkComposeOpen && selectedEmails.length > 0 && (
        <ChatBulkComposeModal
          open={bulkComposeOpen}
          onOpenChange={(open) => {
            setBulkComposeOpen(open);
            if (!open) setSelectedEmailIds(new Set());
          }}
          recipients={selectedEmails}
          onSendSuccess={handleBulkSent}
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
    const handleNewChat = () => {
      if (window.location.pathname !== "/chat") {
        window.history.replaceState(null, "", "/chat");
      }
      setChatId(null);
      setInitialMessages([]);
      setIsInitializing(false);
      setSessionKey(`new-${Date.now()}`);
    };

    window.addEventListener("linkd:new-chat", handleNewChat);
    return () => window.removeEventListener("linkd:new-chat", handleNewChat);
  }, []);

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
    />
  );
}
