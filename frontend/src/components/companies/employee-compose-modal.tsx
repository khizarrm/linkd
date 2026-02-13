'use client';

import { useState, useEffect } from 'react';
import { X, Send, Check } from 'lucide-react';
import { useProtectedApi } from '@/hooks/use-protected-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#2a2a2a]">
          <div className="min-w-0">
            <h3 className="text-lg font-medium text-white font-sans font-light tracking-wide">
              Compose Email
            </h3>
            <p className="text-sm text-gray-400 truncate mt-0.5">
              To: {employee.employeeName} {targetEmail && <>&lt;{targetEmail}&gt;</>}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {!hasEmail && (
            <p className="text-sm text-yellow-400 bg-yellow-400/10 p-3 rounded-lg font-sans font-light tracking-wide">
              No email address available for this employee
            </p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 font-sans font-light tracking-wide">Subject</label>
            <Input
              placeholder="Enter subject..."
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              disabled={!hasEmail}
              className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-[#3a3a3a] focus:ring-0 font-sans font-light tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 font-sans font-light tracking-wide">Message</label>
            <Textarea
              placeholder="Write your message..."
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              disabled={!hasEmail}
              className="min-h-[200px] bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-[#3a3a3a] focus:ring-0 resize-none font-sans font-light tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {sendError && (
            <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg font-sans font-light tracking-wide">
              {sendError}
            </p>
          )}
        </div>

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

