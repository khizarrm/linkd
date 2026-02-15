'use client';

import { useState, useEffect } from 'react';
import { Send, Check, Mail, Loader2 } from 'lucide-react';
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

interface EmployeeComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  companyName: string;
}

export function EmployeeComposeModal({ open, onOpenChange, employee, companyName }: EmployeeComposeModalProps) {
  const protectedApi = useProtectedApi();
  const [isSending, setIsSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setEmailSubject('');
      setEmailBody('');
      setSendSuccess(false);
      setSendError(null);
    }
  }, [open]);

  const hasEmail = employee.email && employee.email.trim() !== '';
  const targetEmail = employee.email || null;

  const handleSendEmail = async () => {
    if (!targetEmail) return;
    
    setIsSending(true);
    setSendError(null);
    
    try {
      await protectedApi.sendEmail({
        to: targetEmail,
        subject: emailSubject,
        body: emailBody,
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
                  className="min-h-[250px] border-0 bg-transparent text-[#e8e8e8] focus-visible:ring-0 resize-none p-4 placeholder:text-[#4a4a4a] leading-relaxed disabled:opacity-50"
                />
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
