'use client';

import { useState, useEffect } from 'react';
import { protectedApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from 'lucide-react';

interface TemplateDialogProps {
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

export function TemplateDialog({ open, onOpenChange, onSuccess, initialData }: TemplateDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: ''
  });

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
      <DialogContent className="sm:max-w-[500px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#2a2a2a]">
          <DialogHeader className="p-0">
            <DialogTitle>{initialData ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              {initialData ? 'Make changes to your email template.' : 'Add a new email template to your collection.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Tips Alert */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#e8e8e8] mb-1">Pro Tips</h4>
            <ul className="text-sm text-[#8a8a8a] list-disc pl-4 space-y-0.5">
              <li>Keep your message brief and concise.</li>
              <li>Include important contact info in the footer.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-400 font-sans font-light tracking-wide">Template Name</Label>
            <Input
              id="name"
              required
              placeholder="e.g., Initial Outreach"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-gray-700 font-sans font-light tracking-wide"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium text-gray-400 font-sans font-light tracking-wide">Subject Line</Label>
            <Input
              id="subject"
              required
              placeholder="Subject..."
              value={formData.subject}
              onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-gray-700 font-sans font-light tracking-wide"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body" className="text-sm font-medium text-gray-400 font-sans font-light tracking-wide">Email Body</Label>
            <Textarea
              id="body"
              required
              className="min-h-[200px] bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-gray-700 resize-none font-sans font-light tracking-wide"
              placeholder="Hi {firstName}..."
              value={formData.body}
              onChange={e => setFormData(prev => ({ ...prev, body: e.target.value }))}
            />
          </div>

          {/* Footer */}
          <div className="pt-0 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-white hover:bg-[#2a2a2a] font-sans font-light tracking-wide"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px] font-sans font-light tracking-wide"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
