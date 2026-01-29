'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ArrowUp, Square } from 'lucide-react';
import { MessageContent } from '@/components/chat/message-content';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: 'assistant', content: '' },
    ]);

    try {
      const token = await getToken();
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/agents/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          query: userMessage.content,
          ...(conversationId && { conversationId }),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          const dataStr = trimmed.slice(6);
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (data.chunk) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + data.chunk }
                    : msg
                )
              );
            }

            if (data.done && data.conversationId) {
              setConversationId(data.conversationId);
            }

            if (data.error) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: 'Error: ' + data.error }
                    : msg
                )
              );
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content + ' (stopped)' }
              : msg
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: 'Error: Failed to get response' }
              : msg
          )
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
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, []);

  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black" style={{ fontFamily: 'var(--font-fira-mono)' }}>
      <header className="flex h-16 shrink-0 items-center justify-center border-b border-white/[0.06]">
        <h1 className="text-lg font-semibold text-white lowercase tracking-wide">linkd — chat</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className={`max-w-3xl mx-auto space-y-5 ${messages.length === 0 ? 'flex items-center justify-center h-full' : ''}`}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center text-white/30 space-y-2">
              <p className="text-base lowercase">let&apos;s get you employed</p>
              <p className="text-xs text-white/20 lowercase">currently in testing</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] text-sm whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'rounded-2xl rounded-br-md bg-white text-black px-4 py-2.5'
                    : 'rounded-2xl rounded-bl-md bg-white/[0.07] text-white/85 px-4 py-3'
                }`}
              >
                {message.content ? (
                  message.role === 'assistant' ? (
                    <MessageContent content={message.content} />
                  ) : (
                    message.content
                  )
                ) : (
                  isLoading && message.role === 'assistant' && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse" />
                      <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse [animation-delay:300ms]" />
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 pb-6">
        <form
          onSubmit={handleSubmit}
          className="relative max-w-3xl mx-auto rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-colors focus-within:border-white/[0.15] focus-within:bg-white/[0.05]"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ask anything..."
            disabled={isLoading}
            rows={1}
            className="block w-full resize-none bg-transparent text-sm text-white/90 placeholder:text-white/25 px-4 py-3.5 pr-14 outline-none disabled:opacity-50 lowercase"
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />
          <div className="absolute right-2.5 bottom-2.5">
            {isLoading ? (
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 hover:bg-white/15 transition-colors"
              >
                <Square className="h-3 w-3 text-white/70 fill-white/70" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-white hover:bg-white/90 disabled:opacity-20 disabled:hover:bg-white transition-all"
              >
                <ArrowUp className="h-4 w-4 text-black" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
