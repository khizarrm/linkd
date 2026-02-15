"use client";

import { useState, useEffect } from "react";
import { X, Send, Check, Mail, Loader2, ChevronDown } from "lucide-react";
import { useProtectedApi } from "@/hooks/use-protected-api";
import { useTemplates } from "@/hooks/use-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { EmailData } from "./email-compose-card";

interface ChatComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailData: EmailData;
}

export function ChatComposeModal({
  open,
  onOpenChange,
  emailData,
}: ChatComposeModalProps) {
  const protectedApi = useProtectedApi();
  const { templates, isLoading: isLoadingTemplates } = useTemplates();
  const [isSending, setIsSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [isCheckingGmail, setIsCheckingGmail] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isProcessingTemplate, setIsProcessingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setIsCheckingGmail(true);
      protectedApi.getGmailStatus()
        .then((data) => setGmailConnected(data.connected))
        .catch(() => setGmailConnected(false))
        .finally(() => setIsCheckingGmail(false));
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setEmailSubject("");
      setEmailBody("");
      setSendSuccess(false);
      setSendError(null);
      setGmailConnected(null);
      setSelectedTemplateId("");
      setTemplateError(null);
      setIsProcessingTemplate(false);
    }
  }, [open]);

  const handleConnectGmail = async () => {
    try {
      const { url } = await protectedApi.getGoogleAuthUrl();
      window.location.href = url;
    } catch (error) {
      setSendError("Failed to start Gmail connection");
    }
  };

  const handleTemplateChange = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    setTemplateError(null);

    if (!templateId) {
      return;
    }

    setIsProcessingTemplate(true);
    try {
      const result = await protectedApi.processTemplate({
        templateId,
        person: {
          name: emailData.name,
          email: emailData.email,
        },
        company: emailData.domain || "",
      });
      setEmailSubject(result.subject);
      setEmailBody(result.body);
    } catch (error) {
      setTemplateError("Failed to process template");
      console.error(error);
    } finally {
      setIsProcessingTemplate(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    setSendError(null);

    try {
      await protectedApi.sendEmail({
        to: emailData.email,
        subject: emailSubject,
        body: emailBody,
      });
      setSendSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSendSuccess(false);
        setEmailSubject("");
        setEmailBody("");
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
              To: {emailData.name} &lt;{emailData.email}&gt;
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
          {isCheckingGmail ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mr-3" />
              Checking Gmail connection...
            </div>
          ) : gmailConnected === false ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-medium text-white">Connect Gmail</h4>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">
                  To send emails, you need to connect your Gmail account. Your emails will be sent from your own address.
                </p>
              </div>
              <Button
                onClick={handleConnectGmail}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Mail className="w-4 h-4 mr-2" />
                Connect Gmail
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 font-sans font-light tracking-wide">
                  Template
                </label>
                <div className="relative">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    disabled={isProcessingTemplate || isLoadingTemplates}
                    className="w-full h-9 rounded-md border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-white font-sans font-light tracking-wide appearance-none pr-8"
                  >
                    <option value="">No template</option>
                    {templates.map((template: any) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isProcessingTemplate ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
                {templateError && (
                  <p className="text-xs text-red-400 font-sans font-light tracking-wide">
                    {templateError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 font-sans font-light tracking-wide">
                  Subject
                </label>
                <Input
                  placeholder="Enter subject..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-[#3a3a3a] focus:ring-0 font-sans font-light tracking-wide"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 font-sans font-light tracking-wide">
                  Message
                </label>
                <Textarea
                  placeholder="Write your message..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="min-h-[200px] bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-[#3a3a3a] focus:ring-0 resize-none font-sans font-light tracking-wide"
                />
              </div>
            </>
          )}

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
          {gmailConnected && (
            <Button
              onClick={handleSendEmail}
              disabled={isSending || !emailSubject || !emailBody}
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
          )}
        </div>
      </div>
    </div>
  );
}
