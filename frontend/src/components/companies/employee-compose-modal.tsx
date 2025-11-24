'use client';

import { useState, useEffect } from 'react';
import { X, Send, Check, FileText, ChevronDown, Loader2 } from 'lucide-react';
import { protectedApi } from '@/lib/api';
import { replaceUrlKeywords } from '@/lib/url-replace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Employee {
  id: number;
  employeeName: string;
  employeeTitle: string | null;
  email: string | null;
  companyId: number;
}

interface EmployeeComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  companyName: string;
}

export function EmployeeComposeModal({ open, onOpenChange, employee, companyName }: EmployeeComposeModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Array<{ id: string; name: string; subject: string; body: string }>>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [processingTemplateId, setProcessingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setIsLoadingTemplates(true);
      protectedApi.listTemplates()
        .then(data => {
          if (data.success && data.templates) {
            setTemplates(data.templates);
          }
        })
        .catch(err => console.error('Failed to load templates:', err))
        .finally(() => setIsLoadingTemplates(false));
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      setEmailSubject('');
      setEmailBody('');
      setSendSuccess(false);
      setSendError(null);
    }
  }, [open]);

  const handleTemplateSelect = async (template: { id: string; subject: string; body: string }) => {
    setProcessingTemplateId(template.id);
    setSendError(null);
    
    try {
      const result = await protectedApi.processTemplate({
        templateId: template.id,
        person: {
          name: employee.employeeName,
          role: employee.employeeTitle || undefined,
          email: employee.email || undefined,
        },
        company: companyName,
      });
      
      setEmailSubject(result.subject);
      setEmailBody(result.body);
    } catch (error) {
      console.error('Failed to process template:', error);
      setSendError((error as Error).message || 'Failed to process template. Please try again.');
      // Fallback to original template if processing fails
      setEmailSubject(template.subject);
      setEmailBody(template.body);
    } finally {
      setProcessingTemplateId(null);
    }
  };

  const hasEmail = employee.email && employee.email.trim() !== '';
  const targetEmail = employee.email || null;

  const handleSendEmail = async () => {
    if (!targetEmail) return;
    
    setIsSending(true);
    setSendError(null);
    
    try {
      // Replace URL keywords with HTML links before sending
      const bodyWithLinks = replaceUrlKeywords(emailBody);
      
      await protectedApi.sendEmail({
        to: targetEmail,
        subject: emailSubject,
        body: bodyWithLinks
      });
      setSendSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSendSuccess(false);
        setEmailSubject('');
        setEmailBody('');
      }, 2000);
    } catch (error) {
      setSendError((error as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      
      <div className="relative w-full max-w-2xl bg-[#151515] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#2a2a2a]">
          <h3 className="text-lg font-medium text-white font-sans font-light tracking-wide">
            Send Email to {employee.employeeName}
          </h3>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 bg-transparent border-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#2a2a2a]">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="text-xs">Templates</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#151515] border-[#2a2a2a] text-white">
                {isLoadingTemplates ? (
                  <div className="flex items-center justify-center p-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="p-2 text-xs text-gray-500 text-center">
                    No templates found
                  </div>
                ) : (
                  templates.map(template => {
                    const isProcessing = processingTemplateId === template.id;
                    return (
                      <DropdownMenuItem 
                        key={template.id} 
                        onClick={() => handleTemplateSelect(template)}
                        disabled={processingTemplateId !== null}
                        className="text-sm hover:bg-[#2a2a2a] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="truncate">Processing...</span>
                          </div>
                        ) : (
                          <span className="truncate">{template.name}</span>
                        )}
                      </DropdownMenuItem>
                    );
                  })
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {!hasEmail && (
            <p className="text-sm text-yellow-400 bg-yellow-400/10 p-3 rounded-lg font-sans font-light tracking-wide">
              No email address available for this employee
            </p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 font-sans font-light tracking-wide">Subject</label>
            <div className="relative">
              <Input
                placeholder="Enter subject..."
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                disabled={processingTemplateId !== null || !hasEmail}
                className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-[#3a3a3a] focus:ring-0 font-sans font-light tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {processingTemplateId !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 font-sans font-light tracking-wide">Message</label>
            <div className="relative">
              <Textarea
                placeholder="Write your message..."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                disabled={processingTemplateId !== null || !hasEmail}
                className="min-h-[150px] bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-[#3a3a3a] focus:ring-0 resize-none font-sans font-light tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {processingTemplateId !== null && (
                <div className="absolute right-3 top-3">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                </div>
              )}
            </div>
          </div>

          {sendError && (
            <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg font-sans font-light tracking-wide">
              {sendError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 pt-0 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-white hover:bg-[#2a2a2a] font-sans font-light tracking-wide"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={isSending || !emailSubject || !emailBody || !hasEmail}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px] font-sans font-light tracking-wide"
          >
            {isSending ? (
              "Sending..."
            ) : sendSuccess ? (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" /> Sent
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" /> Send
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

