'use client';

import { useState, useEffect, useRef } from 'react';
import { useProtectedApi } from '@/hooks/use-protected-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Plus, Paperclip, X } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

interface TemplateAttachment {
  filename: string;
  mimeType: string;
  data: string;
  size: number;
}

interface TemplateEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: {
    id: string;
    name: string;
    subject: string;
    body: string;
    attachments?: string | null;
  } | null;
}

function parseAttachments(raw: string | null | undefined): TemplateAttachment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeAttachments(attachments: TemplateAttachment[]): string | null {
  if (attachments.length === 0) return null;
  return JSON.stringify(attachments);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function TemplateEditorModal({ open, onOpenChange, onSuccess, initialData }: TemplateEditorModalProps) {
  const protectedApi = useProtectedApi();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', subject: '', body: '' });
  const [attachments, setAttachments] = useState<TemplateAttachment[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && initialData) {
      setIsLoading(false);
      setFormData({
        name: initialData.name,
        subject: initialData.subject,
        body: initialData.body,
      });
      setAttachments(parseAttachments(initialData.attachments));
    } else if (open && !initialData) {
      setIsLoading(false);
      setFormData({ name: '', subject: '', body: '' });
      setAttachments([]);
    }
  }, [open, initialData]);

  const insertVariable = (value: string, target: 'subject' | 'body') => {
    if (target === 'body') {
      const tiptap = editorRef.current?.querySelector('.tiptap') as HTMLElement & { editor?: { commands: { insertContent: (c: string) => void; focus: () => void } } } | null;
      if (tiptap?.editor) {
        tiptap.editor.commands.focus();
        tiptap.editor.commands.insertContent(value);
      }
    } else if (target === 'subject' && subjectRef.current) {
      const input = subjectRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const text = formData.subject;
      const newText = text.substring(0, start) + value + text.substring(end);
      setFormData(prev => ({ ...prev, subject: newText }));
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + value.length, start + value.length);
      }, 0);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        console.error(`File "${file.name}" exceeds 5MB limit for template attachments`);
        continue;
      }
      const data = await fileToBase64(file);
      setAttachments(prev => [
        ...prev,
        { filename: file.name, mimeType: file.type || 'application/octet-stream', data, size: file.size },
      ]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        attachments: serializeAttachments(attachments),
      };
      if (initialData) {
        await protectedApi.updateTemplate(initialData.id, payload);
      } else {
        await protectedApi.createTemplate(payload);
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[960px] h-[80vh] max-h-[720px] p-0 gap-0 bg-[#0a0a0a] border-[#2a2a2a] text-[#e8e8e8] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-5 pr-14 py-3 border-b border-[#2a2a2a] shrink-0">
          <div>
            <DialogTitle className="text-sm font-medium tracking-tight">
              {initialData ? 'Edit Template' : 'New Template'}
            </DialogTitle>
            <p className="text-[11px] text-[#6a6a6a] mt-0.5">Reusable email with variables and attachments</p>
          </div>
          <Input
            id="name"
            required
            placeholder="Template name..."
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="mt-2 h-8 text-xs bg-[#151515] border-[#2a2a2a] text-[#e8e8e8] focus:border-[#4a4a4a] focus:ring-0 placeholder:text-[#4a4a4a]"
          />
        </DialogHeader>

        {/* Two-column content — fills remaining space */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: Email content */}
          <div className="flex-1 min-w-0 flex flex-col border-r border-[#2a2a2a]">
            <div className="border-b border-[#1a1a1a] shrink-0">
              <Input
                ref={subjectRef}
                id="subject"
                required
                placeholder="Subject line..."
                value={formData.subject}
                onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className="border-0 bg-transparent text-[#e8e8e8] focus-visible:ring-0 px-4 py-3 h-auto text-sm font-medium placeholder:text-[#4a4a4a] rounded-none"
              />
            </div>
            <div
              ref={editorRef}
              className="flex-1 overflow-y-auto px-4 py-3"
            >
              <RichTextEditor
                value={formData.body}
                onChange={html => setFormData(prev => ({ ...prev, body: html }))}
                placeholder="Write your email body here..."
              />
            </div>
          </div>

          {/* Right: Attachments */}
          <div className="w-[300px] shrink-0 overflow-y-auto">
            {/* Attachments */}
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-3 h-3 text-[#6a6a6a]" />
                <span className="text-[10px] font-medium text-[#6a6a6a] uppercase tracking-wider">Attachments</span>
              </div>

              <div className="space-y-1">
                {attachments.map((att, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-[#151515] border border-[#2a2a2a] rounded px-2 py-1 text-[10px] text-[#c0c0c0]"
                  >
                    <Paperclip className="w-2.5 h-2.5 text-[#6a6a6a] shrink-0" />
                    <span className="truncate flex-1">{att.filename}</span>
                    <span className="text-[#5a5a5a] shrink-0">{formatFileSize(att.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-[#5a5a5a] hover:text-red-400 transition-colors shrink-0"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-6 w-full text-[10px] text-[#6a6a6a] hover:text-[#e8e8e8] hover:bg-[#1a1a1a] border border-dashed border-[#2a2a2a]"
              >
                <Plus className="w-2.5 h-2.5 mr-1" />
                Add file
              </Button>
            </div>
          </div>
        </div>

        {/* Footer bar — always visible */}
        <div className="px-5 py-3 border-t border-[#2a2a2a] flex justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-3 text-xs text-[#6a6a6a] hover:text-[#e8e8e8] hover:bg-[#1a1a1a]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.name || !formData.subject || !formData.body}
            size="sm"
            className="h-8 px-4 text-xs bg-[#e8e8e8] text-black hover:bg-white"
          >
            {isLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
            {initialData ? 'Save' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
