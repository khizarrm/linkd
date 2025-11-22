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
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [showFields, setShowFields] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: ''
  });

  const standardVariables = [
    { label: 'First Name', value: '{firstName}' },
    { label: 'Last Name', value: '{lastName}' },
    { label: 'Full Name', value: '{fullName}' },
    { label: 'Role', value: '{role}' },
    { label: 'Company', value: '{company}' },
    { label: 'Email', value: '{email}' },
  ];

  const aiInstructions = [
    { label: 'Say something nice about company', value: '{say one nice thing about company}' },
    { label: 'AI Instructions', value: '{instructions for ai here}' },
  ];

  const insertField = (field: string, target: 'subject' | 'body') => {
    const textarea = document.getElementById(target === 'body' ? 'body' : 'subject') as HTMLTextAreaElement | HTMLInputElement;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = formData[target];
    const newText = text.substring(0, start) + field + text.substring(end);
    
    setFormData(prev => ({ ...prev, [target]: newText }));
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + field.length, start + field.length);
    }, 0);
  };

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
      <DialogContent className="sm:max-w-[500px] p-0 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#2a2a2a] flex-shrink-0">
          <DialogHeader className="p-0">
            <DialogTitle>{initialData ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              {initialData ? 'Make changes to your email template.' : 'Add a new email template to your collection.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
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
          {/* Available Fields Section */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFields(!showFields)}
              className="w-full flex items-center justify-between p-3 hover:bg-[#252525] transition-colors"
            >
              <span className="text-sm font-medium text-[#e8e8e8] font-sans font-light tracking-wide">
                Available Fields
              </span>
              {showFields ? (
                <ChevronUp className="w-4 h-4 text-[#6a6a6a]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#6a6a6a]" />
              )}
            </button>
            {showFields && (
              <div className="p-4 space-y-4 border-t border-[#2a2a2a]">
                <div>
                  <h5 className="text-xs font-medium text-[#8a8a8a] mb-2 font-sans font-light tracking-wide">Standard Variables</h5>
                  <div className="flex flex-wrap gap-2">
                    {standardVariables.map((variable) => (
                      <button
                        key={variable.value}
                        type="button"
                        onClick={() => insertField(variable.value, 'body')}
                        className="px-2.5 py-1 text-xs bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-[#e8e8e8] hover:bg-[#252525] hover:border-[#3a3a3a] transition-colors font-sans font-light tracking-wide"
                      >
                        {variable.value}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-[#8a8a8a] mb-2 font-sans font-light tracking-wide">AI Instructions</h5>
                  <div className="flex flex-wrap gap-2">
                    {aiInstructions.map((instruction) => (
                      <button
                        key={instruction.value}
                        type="button"
                        onClick={() => insertField(instruction.value, 'body')}
                        className="px-2.5 py-1 text-xs bg-[#0a0a0a] border border-blue-500/30 rounded-md text-blue-400 hover:bg-[#252525] hover:border-blue-500/50 transition-colors font-sans font-light tracking-wide"
                      >
                        {instruction.value}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#6a6a6a] mt-2 font-sans font-light tracking-wide">
                    AI will generate content for instruction fields when the template is used.
                  </p>
                </div>
              </div>
            )}
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
              className="h-[200px] max-h-[200px] bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-gray-700 resize-none font-sans font-light tracking-wide overflow-y-auto"
              placeholder="Hi {firstName}, {say one nice thing about company}..."
              value={formData.body}
              onChange={e => setFormData(prev => ({ ...prev, body: e.target.value }))}
            />
          </div>

          {/* Footer */}
          <div className="pt-0 flex justify-end gap-3 flex-shrink-0">
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
