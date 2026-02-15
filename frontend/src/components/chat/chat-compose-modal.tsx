"use client";

import { useState, useEffect } from "react";
import { Send, Check, Mail, Loader2, ChevronDown, Sparkles } from "lucide-react";
import { useProtectedApi } from "@/hooks/use-protected-api";
import { useTemplates } from "@/hooks/use-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EmailData } from "./email-compose-card";

interface Template {
  id: string;
  name: string;
}

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
  const { templates, isLoading: isLoadingTemplates } = useTemplates() as { templates: Template[]; isLoading: boolean; isError: Error | null; mutateTemplates: () => void; };
  const [isSending, setIsSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [isCheckingGmail, setIsCheckingGmail] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");
  const [isProcessingTemplate, setIsProcessingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  useEffect(() => {
    if (open) {
      setIsCheckingGmail(true);
      protectedApi
        .getGmailStatus()
        .then((data) => setGmailConnected(data.connected))
        .catch(() => setGmailConnected(false))
        .finally(() => setIsCheckingGmail(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) {
      setEmailSubject("");
      setEmailBody("");
      setSendSuccess(false);
      setSendError(null);
      setGmailConnected(null);
      setSelectedTemplateId("none");
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

    if (templateId === "none") {
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
            To: {emailData.name} &lt;{emailData.email}&gt;
          </p>
        </DialogHeader>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          {isCheckingGmail ? (
            <div className="flex items-center justify-center py-12 text-[#8a8a8a]">
              <Loader2 className="w-6 h-6 animate-spin mr-3" />
              Checking Gmail connection...
            </div>
          ) : gmailConnected === false ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-medium text-[#e8e8e8]">
                  Connect Gmail
                </h4>
                <p className="text-sm text-[#8a8a8a] max-w-sm mx-auto">
                  Connect your Gmail account to send emails. Your emails will be
                  sent from your own address.
                </p>
              </div>
              <Button
                onClick={handleConnectGmail}
                className="bg-[#e8e8e8] text-black hover:bg-white"
              >
                <Mail className="w-4 h-4 mr-2" />
                Connect Gmail
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isProcessingTemplate || isLoadingTemplates}
                      className="h-9 px-3 bg-transparent border-[#2a2a2a] hover:bg-[#1a1a1a] hover:border-[#3a3a3a] text-[#8a8a8a] hover:text-[#e8e8e8] font-normal justify-between min-w-[180px]"
                    >
                      <span className="flex items-center gap-2">
                        {isProcessingTemplate ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {selectedTemplateId === "none"
                          ? "Template"
                          : selectedTemplate?.name || "Template"}
                      </span>
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#151515] border-[#2a2a2a] min-w-[180px]">
                    <DropdownMenuItem
                      onClick={() => handleTemplateChange("none")}
                      className="text-[#e8e8e8] focus:bg-[#252525] focus:text-[#e8e8e8] cursor-pointer"
                    >
                      No template
                    </DropdownMenuItem>
                    {templates.map((template: Template) => (
                      <DropdownMenuItem
                        key={template.id}
                        onClick={() => handleTemplateChange(template.id)}
                        className="text-[#e8e8e8] focus:bg-[#252525] focus:text-[#e8e8e8] cursor-pointer"
                      >
                        {template.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {templateError && (
                  <p className="text-xs text-red-400">{templateError}</p>
                )}
              </div>

              <div className="border border-[#2a2a2a] rounded-lg bg-[#151515] overflow-hidden">
                <Input
                  placeholder="Subject..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="border-0 bg-transparent text-[#e8e8e8] focus-visible:ring-0 px-4 py-3 h-auto placeholder:text-[#4a4a4a]"
                />
                <Separator className="bg-[#2a2a2a]" />
                <Textarea
                  placeholder="Write your message..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="min-h-[350px] border-0 bg-transparent text-sm text-[#e8e8e8] focus-visible:ring-0 resize-none p-4 placeholder:text-[#4a4a4a]"
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

        {gmailConnected && (
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
              disabled={
                isSending || !emailSubject || !emailBody || isProcessingTemplate
              }
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
