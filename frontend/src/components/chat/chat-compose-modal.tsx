"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
  Check,
  Mail,
  Loader2,
  ChevronDown,
  Sparkles,
  Paperclip,
  X,
} from "lucide-react";
import { useProtectedApi } from "@/hooks/use-protected-api";
import { useTemplates } from "@/hooks/use-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
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
import { posthog } from "@/../instrumentation-client";

interface Template {
  id: string;
  name: string;
  isDefault?: number;
}

interface FooterData {
  text?: string;
  links: Array<{ label: string; url: string }>;
}

interface AttachmentFile {
  filename: string;
  mimeType: string;
  data: string;
  size: number;
}

function parseFooter(raw: string | null | undefined): FooterData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      text: parsed.text,
      links: Array.isArray(parsed.links) ? parsed.links : [],
    };
  } catch {
    return null;
  }
}

function parseTemplateAttachments(raw: string | null | undefined): AttachmentFile[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

interface ChatComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailData: EmailData;
  chatId: string | null;
}

export function ChatComposeModal({
  open,
  onOpenChange,
  emailData,
  chatId,
}: ChatComposeModalProps) {
  const protectedApi = useProtectedApi();
  const { templates, isLoading: isLoadingTemplates } = useTemplates() as {
    templates: Template[];
    isLoading: boolean;
    isError: Error | null;
    mutateTemplates: () => void;
  };
  const [isSending, setIsSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailFooter, setEmailFooter] = useState<FooterData | null>(null);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [isCheckingGmail, setIsCheckingGmail] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");
  const [isProcessingTemplate, setIsProcessingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setEmailFooter(null);
      setAttachments([]);
      setSendSuccess(false);
      setSendError(null);
      setGmailConnected(null);
      setSelectedTemplateId("none");
      setTemplateError(null);
      setIsProcessingTemplate(false);
    }
  }, [open]);

  // Auto-select the default template when the modal opens and templates are loaded
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (!open) {
      hasAutoSelected.current = false;
      return;
    }
    if (hasAutoSelected.current || isLoadingTemplates || templates.length === 0) return;
    const defaultTemplate = templates.find((t) => t.isDefault === 1);
    if (defaultTemplate) {
      hasAutoSelected.current = true;
      handleTemplateChange(defaultTemplate.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isLoadingTemplates, templates]);

  const handleConnectGmail = async () => {
    try {
      const { url } = await protectedApi.getGoogleAuthUrl();
      window.location.href = url;
    } catch {
      setSendError("Failed to start Gmail connection");
    }
  };

  const handleTemplateChange = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    setTemplateError(null);

    if (templateId === "none") {
      setEmailFooter(null);
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
      setEmailFooter(parseFooter(result.footer));
      setAttachments(parseTemplateAttachments(result.attachments));
    } catch (error) {
      setTemplateError("Failed to process template");
      console.error(error);
    } finally {
      setIsProcessingTemplate(false);
    }
  };

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
    setIsSending(true);
    setSendError(null);

    posthog.capture("email_send_clicked", {
      source: "research_agent",
      chat_id: chatId,
      email_id: emailData.id,
      generated_email: emailData.email,
      person_name: emailData.name,
      recipient_domain: emailData.domain,
      verification_status: emailData.verificationStatus,
      has_attachments: attachments.length > 0,
    });

    try {
      await protectedApi.sendEmail({
        to: emailData.email,
        subject: emailSubject,
        body: emailBody,
        footer: emailFooter,
        attachments: attachments.length > 0
          ? attachments.map(({ filename, mimeType, data }) => ({ filename, mimeType, data }))
          : undefined,
      });

      posthog.capture("email_send_succeeded", {
        source: "research_agent",
        chat_id: chatId,
        email_id: emailData.id,
        generated_email: emailData.email,
        person_name: emailData.name,
        recipient_domain: emailData.domain,
        verification_status: emailData.verificationStatus,
        has_attachments: attachments.length > 0,
      });

      setSendSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      const errorMessage = (error as Error).message;
      posthog.capture("email_send_failed", {
        source: "research_agent",
        chat_id: chatId,
        email_id: emailData.id,
        generated_email: emailData.email,
        person_name: emailData.name,
        recipient_domain: emailData.domain,
        verification_status: emailData.verificationStatus,
        has_attachments: attachments.length > 0,
        error_message: errorMessage,
      });
      setSendError(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 gap-0 bg-[#0a0a0a] border-[#2a2a2a] text-[#e8e8e8]">
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

              {/* Unified email card: subject + body + footer */}
              <div className="border border-[#2a2a2a] rounded-lg bg-[#151515] overflow-hidden">
                <Input
                  placeholder="Subject..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="border-0 bg-transparent text-[#e8e8e8] focus-visible:ring-0 px-4 py-3 h-auto placeholder:text-[#4a4a4a]"
                />
                <Separator className="bg-[#2a2a2a]" />
                <div className="p-4">
                  <RichTextEditor
                    value={emailBody}
                    onChange={setEmailBody}
                    placeholder="Write your message..."
                    editorClassName="min-h-[220px]"
                  />
                </div>

                {/* Footer preview — read-only, rendered inline */}
                {emailFooter && (emailFooter.text || emailFooter.links.length > 0) && (
                  <>
                    <div className="px-4 pb-3 space-y-1">
                      {emailFooter.text && (
                        <p className="text-sm text-[#8a8a8a]">{emailFooter.text}</p>
                      )}
                      {emailFooter.links.length > 0 && (
                        <div className="flex flex-wrap items-center gap-y-1">
                          {emailFooter.links.map((link, i) => (
                            <span key={i} className="flex items-center">
                              {i > 0 && <span className="mx-2 text-[#4a4a4a]">|</span>}
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2"
                              >
                                {link.label}
                              </a>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
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
