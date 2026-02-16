'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Check, Mail, Loader2, Paperclip, X } from 'lucide-react';
import { useProtectedApi } from '@/hooks/use-protected-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Employee {
  id: number;
  employeeName: string;
  employeeTitle: string | null;
  email: string | null;
  companyId: number;
}

interface AttachmentFile {
  filename: string;
  mimeType: string;
  data: string;
  size: number;
}

interface EmployeeComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  companyName: string;
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
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function EmployeeComposeModal({ open, onOpenChange, employee, companyName }: EmployeeComposeModalProps) {
  const protectedApi = useProtectedApi();
  const [isSending, setIsSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setEmailSubject('');
      setEmailBody('');
      setAttachments([]);
      setSendSuccess(false);
      setSendError(null);
    }
  }, [open]);

  const hasEmail = employee.email && employee.email.trim() !== '';
  const targetEmail = employee.email || null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setSendError(`File "${file.name}" exceeds 10MB limit`);
        continue;
      }
      const data = await fileToBase64(file);
      setAttachments((prev) => [
        ...prev,
        { filename: file.name, mimeType: file.type || "application/octet-stream", data, size: file.size },
      ]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendEmail = async () => {
    if (!targetEmail) return;

    setIsSending(true);
    setSendError(null);

    try {
      await protectedApi.sendEmail({
        to: targetEmail,
        subject: emailSubject,
        body: emailBody,
        attachments: attachments.length > 0
          ? attachments.map(({ filename, mimeType, data }) => ({ filename, mimeType, data }))
          : undefined,
      });
      setSendSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      setSendError((error as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 bg-[#0a0a0a] border-[#2a2a2a] text-[#e8e8e8]">
        <DialogHeader className="p-6 pb-4 border-b border-[#2a2a2a]">
          <DialogTitle className="text-lg font-medium tracking-tight">
            Compose
          </DialogTitle>
          <p className="text-sm text-[#8a8a8a] mt-1">
            To: {employee.employeeName} {targetEmail && <>&lt;{targetEmail}&gt;</>}
          </p>
        </DialogHeader>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          {!hasEmail ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-medium text-[#e8e8e8]">
                  No Email Available
                </h4>
                <p className="text-sm text-[#8a8a8a] max-w-sm mx-auto">
                  We don&apos;t have an email address for this employee. Please try a different contact method.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="border border-[#2a2a2a] rounded-lg bg-[#151515] overflow-hidden">
                <Input
                  placeholder="Subject..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  disabled={!hasEmail}
                  className="border-0 bg-transparent text-[#e8e8e8] focus-visible:ring-0 px-4 py-3 h-auto font-medium placeholder:text-[#4a4a4a] disabled:opacity-50"
                />
                <Separator className="bg-[#2a2a2a]" />
                <Textarea
                  placeholder="Write your message..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  disabled={!hasEmail}
                  className="min-h-[250px] border-0 bg-transparent text-sm text-[#e8e8e8] focus-visible:ring-0 resize-none p-4 placeholder:text-[#4a4a4a] leading-relaxed disabled:opacity-50"
                />
              </div>

              {/* Attachments */}
              <div className="flex items-center gap-2 flex-wrap">
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
                  className="h-8 px-2.5 text-xs text-[#6a6a6a] hover:text-[#e8e8e8] hover:bg-[#1a1a1a]"
                >
                  <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                  Attach
                </Button>

                {attachments.map((att, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 bg-[#151515] border border-[#2a2a2a] rounded-md px-2.5 py-1 text-xs text-[#c0c0c0]"
                  >
                    <Paperclip className="w-3 h-3 text-[#6a6a6a]" />
                    <span className="truncate max-w-[140px]">{att.filename}</span>
                    <span className="text-[#6a6a6a]">({formatFileSize(att.size)})</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="ml-0.5 text-[#6a6a6a] hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {sendError && (
                <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg">
                  {sendError}
                </p>
              )}
            </>
          )}
        </div>

        {hasEmail && (
          <div className="p-6 pt-0 flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-[#8a8a8a] hover:text-[#e8e8e8] hover:bg-[#1a1a1a]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSending || !emailSubject || !emailBody || !hasEmail}
              className="bg-[#e8e8e8] text-black hover:bg-white min-w-[100px]"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
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
        )}
      </DialogContent>
    </Dialog>
  );
}
