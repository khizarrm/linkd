'use client';

import { useState, useEffect, useRef } from 'react';
import { useProtectedApi } from '@/hooks/use-protected-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, X } from 'lucide-react';

interface TemplateEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: {
    id: string;
    name: string;
    subject: string;
    body: string;
  } | null;
}

export function TemplateEditorModal({ open, onOpenChange, onSuccess, initialData }: TemplateEditorModalProps) {
  const protectedApi = useProtectedApi();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: ''
  });
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  const standardVariables = [
    { label: 'First Name', value: '{firstName}' },
    { label: 'Last Name', value: '{lastName}' },
    { label: 'Full Name', value: '{fullName}' },
    { label: 'Role', value: '{role}' },
    { label: 'Company', value: '{company}' },
    { label: 'Email', value: '{email}' },
  ];

  const aiInstructions = [
    { label: 'Say something nice', value: '{say one nice thing about company}' },
    { label: 'AI Instructions', value: '{instructions for ai here}' },
  ];

  useEffect(() => {
    if (open && initialData) {
      setFormData({
        name: initialData.name,
        subject: initialData.subject,
        body: initialData.body
      });
    } else if (open && !initialData) {
      setFormData({ name: '', subject: '', body: '' });
    }
  }, [open, initialData]);

  const insertVariable = (value: string, target: 'subject' | 'body') => {
    if (target === 'body' && bodyRef.current) {
      const textarea = bodyRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.body;
      const newText = text.substring(0, start) + value + text.substring(end);

      setFormData(prev => ({ ...prev, body: newText }));

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + value.length, start + value.length);
      }, 0);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (initialData) {
        await protectedApi.updateTemplate(initialData.id, formData);
      } else {
        await protectedApi.createTemplate(formData);
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 bg-[#0a0a0a] border-[#2a2a2a] text-[#e8e8e8]">
        <DialogHeader className="p-6 pb-4 border-b border-[#2a2a2a]">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium tracking-tight">
              {initialData ? 'Edit Template' : 'New Template'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-[#8a8a8a] text-sm mt-1">
            Create reusable email templates with variables.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-medium text-[#8a8a8a] uppercase tracking-wider">
                Template Name
              </Label>
              <Input
                id="name"
                required
                placeholder="e.g. Initial Outreach"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-[#151515] border-[#2a2a2a] text-[#e8e8e8] focus:border-[#4a4a4a] focus:ring-0 h-10"
              />
            </div>

              <div className="border border-[#2a2a2a] rounded-lg bg-[#151515] overflow-hidden">
                <Input
                  ref={subjectRef}
                  id="subject"
                  required
                  placeholder="Subject line..."
                  value={formData.subject}
                  onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="border-0 bg-transparent text-[#e8e8e8] focus-visible:ring-0 px-4 py-3 h-auto font-medium placeholder:text-[#4a4a4a]"
                />
                <Separator className="bg-[#2a2a2a]" />
                <Textarea
                  ref={bodyRef}
                  id="body"
                  required
                  placeholder="Write your email body here..."
                  value={formData.body}
                  onChange={e => setFormData(prev => ({ ...prev, body: e.target.value }))}
                  className="min-h-[300px] border-0 bg-transparent text-[#e8e8e8] focus-visible:ring-0 resize-none px-4 py-3 font-medium placeholder:text-[#4a4a4a] leading-relaxed"
                />
              </div>
            </div>

          <DialogFooter className="p-6 pt-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-[#8a8a8a] hover:text-[#e8e8e8] hover:bg-[#1a1a1a]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#e8e8e8] text-black hover:bg-white"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
