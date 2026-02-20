'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Link as LinkIcon, Unlink, ExternalLink, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
  readOnly?: boolean;
}

function isHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

function plainTextToHtml(text: string): string {
  if (!text) return '';
  if (isHtml(text)) return text;
  return text
    .split('\n')
    .map((line) => `<p>${line || '<br>'}</p>`)
    .join('');
}

function LinkEditForm({
  initialUrl,
  onSave,
  onRemove,
  onClose,
}: {
  initialUrl: string;
  onSave: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      onSave(finalUrl);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-1.5 p-1.5"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste link..."
        className="h-7 w-[200px] rounded px-2 text-xs bg-[#1a1a1a] border border-[#3a3a3a] text-[#e8e8e8] placeholder:text-[#5a5a5a] outline-none focus:border-[#5a5a5a]"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      />
      <button
        type="submit"
        className="h-7 w-7 flex items-center justify-center rounded text-[#8a8a8a] hover:text-[#e8e8e8] hover:bg-[#2a2a2a] transition-colors"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      {initialUrl && (
        <>
          <a
            href={initialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 w-7 flex items-center justify-center rounded text-[#8a8a8a] hover:text-blue-400 hover:bg-[#2a2a2a] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={onRemove}
            className="h-7 w-7 flex items-center justify-center rounded text-[#8a8a8a] hover:text-red-400 hover:bg-[#2a2a2a] transition-colors"
          >
            <Unlink className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </form>
  );
}

interface FloatingPos {
  top: number;
  left: number;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something...',
  className,
  editorClassName,
  readOnly = false,
}: RichTextEditorProps) {
  const [floatingPos, setFloatingPos] = useState<FloatingPos | null>(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Link.configure({
        openOnClick: readOnly,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'text-blue-400 underline underline-offset-2 cursor-pointer',
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          'outline-none min-h-[200px] text-sm leading-relaxed text-[#e8e8e8]',
          editorClassName,
        ),
      },
    },
    editable: !readOnly,
    content: plainTextToHtml(value),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      if (readOnly) return;
      const { from, to } = editor.state.selection;
      if (from === to) {
        setFloatingPos(null);
        setShowLinkForm(false);
        return;
      }
      updateFloatingPosition();
    },
  });

  const updateFloatingPosition = useCallback(() => {
    if (!containerRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setFloatingPos({
      top: rect.bottom - containerRect.top + 6,
      left: rect.left - containerRect.left,
    });
  }, []);

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const incomingHtml = plainTextToHtml(value);
    if (currentHtml !== incomingHtml && incomingHtml !== currentHtml) {
      editor.commands.setContent(incomingHtml);
    }
  }, [value, editor]);

  const handleSetLink = useCallback(
    (url: string) => {
      if (!editor) return;
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      setShowLinkForm(false);
      setFloatingPos(null);
    },
    [editor],
  );

  const handleRemoveLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setShowLinkForm(false);
    setFloatingPos(null);
  }, [editor]);

  const handleCloseFloating = useCallback(() => {
    setShowLinkForm(false);
    setFloatingPos(null);
    editor?.chain().focus().run();
  }, [editor]);

  if (!editor) return null;

  const currentHref = editor.getAttributes('link').href || '';
  const isLinkActive = editor.isActive('link');
  const { from, to } = editor.state.selection;
  const hasSelection = from !== to;
  const showFloating = !readOnly && floatingPos && (hasSelection || showLinkForm);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {showFloating && (
        <div
          className="absolute z-50 rounded-lg border border-[#3a3a3a] bg-[#111111] shadow-xl"
          style={{ top: floatingPos.top, left: floatingPos.left }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {showLinkForm || isLinkActive ? (
            <LinkEditForm
              initialUrl={currentHref}
              onSave={handleSetLink}
              onRemove={handleRemoveLink}
              onClose={handleCloseFloating}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowLinkForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#8a8a8a] hover:text-[#e8e8e8] transition-colors"
            >
              <LinkIcon className="w-3 h-3" />
              Add link
            </button>
          )}
        </div>
      )}

      <EditorContent
        editor={editor}
        className={cn(
          '[&_.tiptap]:outline-none',
          '[&_.tiptap_p]:my-0',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:text-[#4a4a4a]',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:float-left',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:h-0',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none',
        )}
      />
    </div>
  );
}
