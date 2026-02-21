"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Mail, Send, Sparkles } from "lucide-react";
import { useProtectedApi } from "@/hooks/use-protected-api";
import { useTemplates } from "@/hooks/use-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { EmailData } from "./email-compose-card";
import { ChatBulkDraftList } from "./chat-bulk-draft-list";
import { parseTemplateAttachments, toRecipientDraft, type BulkSendResult, type RecipientDraft, type Template } from "./chat-bulk-compose-utils";
import { TemplateEditorModal } from "@/components/templates/template-editor-modal";

interface ChatBulkComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: EmailData[];
  onSendSuccess?: (sentIds: string[]) => void;
}

function needsGmailReconnect(errorMessage: string): boolean {
  const normalized = errorMessage.toLowerCase();
  return (
    normalized.includes("gmail connection expired") ||
    normalized.includes("gmail not connected") ||
    normalized.includes("connect your gmail")
  );
}

export function ChatBulkComposeModal({
  open,
  onOpenChange,
  recipients,
  onSendSuccess,
}: ChatBulkComposeModalProps) {
  const protectedApi = useProtectedApi();
  const { templates, isLoading: isLoadingTemplates } = useTemplates() as {
    templates: Template[];
    isLoading: boolean;
    isError: Error | null;
    mutateTemplates: () => void;
  };

  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [isCheckingGmail, setIsCheckingGmail] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<RecipientDraft[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResults, setSendResults] = useState<BulkSendResult[] | null>(null);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const generationTokenRef = useRef(0);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);

  useEffect(() => {
    if (!open) return;
    setIsCheckingGmail(true);
    protectedApi.getGmailStatus().then((data) => setGmailConnected(data.connected)).catch(() => setGmailConnected(false)).finally(() => setIsCheckingGmail(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) {
      setGmailConnected(null);
      setSelectedTemplateId(null);
      setSelectedDraftId(null);
      setDrafts([]);
      setIsGenerating(false);
      setIsSending(false);
      setSendProgress(0);
      setSendError(null);
      setSendResults(null);
      setShowCreateTemplate(false);
      generationTokenRef.current += 1;
      return;
    }
    setDrafts(recipients.map(toRecipientDraft));
    setSendError(null);
    setSendResults(null);
  }, [open, recipients]);

  useEffect(() => {
    if (!open || isLoadingTemplates || templates.length === 0 || selectedTemplateId) return;
    const defaultTemplate = templates.find((template) => template.isDefault === 1) ?? templates[0];
    setSelectedTemplateId(defaultTemplate.id);
  }, [open, isLoadingTemplates, templates, selectedTemplateId]);

  useEffect(() => {
    if (!open || !selectedTemplateId) return;
    const templateId = selectedTemplateId;
    const currentToken = generationTokenRef.current + 1;
    generationTokenRef.current = currentToken;
    setIsGenerating(true);

    const recipientsForGeneration = recipients.filter((recipient) => {
      const prefilled = recipient.processedEmail;
      return !prefilled || prefilled.templateId !== templateId;
    });

    setDrafts(recipients.map((recipient) => {
      const clientId = recipient.uiId ?? recipient.id;
      const prefilled = recipient.processedEmail;
      if (prefilled && prefilled.templateId === templateId) {
        return {
          clientId,
          name: recipient.name,
          email: recipient.email,
          domain: recipient.domain,
          subject: prefilled.subject,
          body: prefilled.body,
          attachments: parseTemplateAttachments(prefilled.attachments),
          status: "ready" as const,
        };
      }
      return {
        clientId,
        name: recipient.name,
        email: recipient.email,
        domain: recipient.domain,
        subject: "",
        body: "",
        attachments: [],
        status: "processing" as const,
      };
    }));

    const generateDrafts = async () => {
      let cursor = 0;
      const workerCount = Math.min(3, Math.max(1, recipientsForGeneration.length));
      async function worker(): Promise<void> {
        while (cursor < recipientsForGeneration.length) {
          const recipient = recipientsForGeneration[cursor++];
          const clientId = recipient.uiId ?? recipient.id;
          try {
            const result = await protectedApi.processTemplate({ templateId, person: { name: recipient.name, email: recipient.email }, company: recipient.domain || "" });
            if (generationTokenRef.current !== currentToken) return;
            setDrafts((prev) => prev.map((draft) =>
              draft.clientId === clientId
                ? { ...draft, subject: result.subject, body: result.body, attachments: parseTemplateAttachments(result.attachments), status: "ready", error: undefined }
                : draft,
            ));
          } catch {
            if (generationTokenRef.current !== currentToken) return;
            setDrafts((prev) => prev.map((draft) =>
              draft.clientId === clientId
                ? { ...draft, status: "failed", error: "Failed to generate personalized draft" }
                : draft,
            ));
          }
        }
      }
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
      if (generationTokenRef.current === currentToken) setIsGenerating(false);
    };

    void generateDrafts();
  }, [open, selectedTemplateId, recipients]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    setSelectedDraftId((previous) => {
      if (previous && drafts.some((draft) => draft.clientId === previous)) {
        return previous;
      }
      return drafts.find((draft) => draft.status === "ready")?.clientId ?? drafts[0]?.clientId ?? null;
    });
  }, [open, drafts]);

  const readyDrafts = useMemo(() => drafts.filter((draft) => draft.status === "ready"), [drafts]);
  const generationSummary = useMemo(() => {
    const total = drafts.length;
    const completed = drafts.filter((draft) => draft.status !== "processing").length;
    const failed = drafts.filter((draft) => draft.status === "failed").length;
    const ready = drafts.filter((draft) => draft.status === "ready").length;
    return {
      total,
      completed,
      failed,
      ready,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [drafts]);
  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.clientId === selectedDraftId) ?? null,
    [drafts, selectedDraftId],
  );
  const sendSummary = useMemo(() => {
    if (!sendResults) return null;
    const sent = sendResults.filter((result) => result.success).length;
    return { total: sendResults.length, sent, failed: sendResults.length - sent };
  }, [sendResults]);

  useEffect(() => {
    if (!isSending) {
      setSendProgress(0);
      return;
    }
    setSendProgress(8);
    const interval = window.setInterval(() => {
      setSendProgress((prev) => Math.min(94, prev + Math.max(1.5, Math.random() * 5)));
    }, 170);
    return () => window.clearInterval(interval);
  }, [isSending]);

  const handleConnectGmail = async () => {
    try {
      const { url } = await protectedApi.getGoogleAuthUrl();
      window.location.href = url;
    } catch {
      setSendError("Failed to start Gmail connection");
    }
  };

  const handleSendAll = async () => {
    if (readyDrafts.length === 0) return;
    setIsSending(true);
    setSendError(null);
    try {
      const result = await protectedApi.sendBulkEmail({
        items: readyDrafts.map((draft) => ({
          clientId: draft.clientId,
          to: draft.email,
          subject: draft.subject,
          body: draft.body,
          attachments: draft.attachments.map((attachment) => ({ filename: attachment.filename, mimeType: attachment.mimeType, data: attachment.data })),
        })),
      });
      setSendResults(result.results);
      const sentIds = result.results
        .filter((row) => row.success)
        .map((row) => row.clientId);

      if (sentIds.length > 0) {
        onSendSuccess?.(sentIds);
        onOpenChange(false);
        return;
      }

      setSendError("No emails were sent. Please review and retry.");
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (needsGmailReconnect(errorMessage)) {
        setGmailConnected(false);
      }
      setSendError(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubjectChange = (clientId: string, subject: string) => {
    setDrafts((prev) =>
      prev.map((draft) => {
        if (draft.clientId !== clientId || draft.status === "processing") return draft;
        const nextStatus =
          subject.trim() && draft.body.trim() ? "ready" : "failed";
        return {
          ...draft,
          subject,
          status: nextStatus,
          error: nextStatus === "ready" ? undefined : "Subject and body are required",
        };
      }),
    );
  };

  const handleBodyChange = (clientId: string, body: string) => {
    setDrafts((prev) =>
      prev.map((draft) => {
        if (draft.clientId !== clientId || draft.status === "processing") return draft;
        const nextStatus =
          draft.subject.trim() && body.trim() ? "ready" : "failed";
        return {
          ...draft,
          body,
          status: nextStatus,
          error: nextStatus === "ready" ? undefined : "Subject and body are required",
        };
      }),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[980px] max-h-[95vh] p-0 gap-0 bg-[#0a0a0a] border-[#2a2a2a] text-[#e8e8e8]">
        <DialogHeader className="p-6 pb-4 border-b border-[#2a2a2a]"><DialogTitle className="text-lg font-medium tracking-tight">Bulk compose ({recipients.length})</DialogTitle></DialogHeader>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[78vh]">
          {isCheckingGmail ? (
            <div className="flex items-center justify-center py-10 text-[#8a8a8a]"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Checking Gmail connection...</div>
          ) : isLoadingTemplates ? (
            <div className="flex items-center justify-center py-10 text-[#8a8a8a]"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-amber-500" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-medium text-[#e8e8e8]">Create your first template</h4>
                <p className="text-sm text-[#8a8a8a] max-w-sm mx-auto">You need at least one email template to compose emails. Templates let you write reusable emails with personalization.</p>
              </div>
              <Button onClick={() => setShowCreateTemplate(true)} className="bg-[#e8e8e8] text-black hover:bg-white"><Sparkles className="w-4 h-4 mr-2" /> Create Template</Button>
            </div>
          ) : gmailConnected === false ? (
            <div className="text-center py-8 space-y-4">
              <h4 className="text-lg font-medium text-[#e8e8e8]">Connect Gmail</h4>
              <p className="text-sm text-[#8a8a8a] max-w-sm mx-auto">Connect Gmail to send selected emails from your own account.</p>
              <Button onClick={handleConnectGmail} className="bg-[#e8e8e8] text-black hover:bg-white"><Mail className="w-4 h-4 mr-2" /> Connect Gmail</Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isLoadingTemplates || templates.length === 0 || isGenerating || isSending}
                      className="h-9 px-3 bg-transparent border-[#2a2a2a] hover:bg-[#1a1a1a] hover:border-[#3a3a3a] text-[#8a8a8a] hover:text-[#e8e8e8] font-normal justify-between min-w-[220px]"
                    >
                      <span className="flex items-center gap-2">{isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{selectedTemplate?.name || "Select template"}</span>
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#151515] border-[#2a2a2a] min-w-[220px]">
                    {templates.map((template) => (
                      <DropdownMenuItem key={template.id} onClick={() => setSelectedTemplateId(template.id)} className="text-[#e8e8e8] focus:bg-[#252525] focus:text-[#e8e8e8] cursor-pointer">
                        {template.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <p className="text-xs text-[#8a8a8a]">{readyDrafts.length} / {drafts.length} ready</p>
              </div>

              {(isGenerating || isSending) && (
                <div className="rounded-lg border border-[#2a2a2a] bg-[#111111] p-3 space-y-3">
                  {isGenerating && (
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-[#8a8a8a]">
                        <span>Generating drafts...</span>
                        <span>
                          {generationSummary.completed}/{generationSummary.total} ({generationSummary.percent}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#1d1d1d]">
                        <div
                          className="h-1.5 rounded-full bg-blue-500 transition-[width] duration-200"
                          style={{ width: `${generationSummary.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {isSending && (
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-[#8a8a8a]">
                        <span>Sending emails...</span>
                        <span>{Math.round(sendProgress)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#1d1d1d]">
                        <div
                          className="h-1.5 rounded-full bg-emerald-500 transition-[width] duration-150"
                          style={{ width: `${sendProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-[minmax(300px,0.9fr)_minmax(460px,1.5fr)] gap-4 items-start">
                <ChatBulkDraftList
                  drafts={drafts}
                  selectedDraftId={selectedDraftId}
                  onSelectDraft={setSelectedDraftId}
                />

                {selectedDraft ? (
                  <div className="rounded-lg border border-[#2a2a2a] bg-[#121212] p-4 space-y-3 h-full">
                    <p className="text-lg font-medium text-[#f0f0f0]">{selectedDraft.name}</p>
                    <Input
                      value={selectedDraft.subject}
                      onChange={(e) => handleSubjectChange(selectedDraft.clientId, e.target.value)}
                      placeholder="Subject..."
                      disabled={selectedDraft.status === "processing"}
                      className="border-[#2a2a2a] bg-[#101010] text-[#e8e8e8] focus-visible:ring-0"
                    />
                    <div className="max-h-[520px] overflow-y-auto rounded-lg border border-[#2a2a2a] bg-[#151515] p-4">
                      <RichTextEditor
                        value={selectedDraft.body}
                        onChange={(html) => handleBodyChange(selectedDraft.clientId, html)}
                        placeholder=""
                        editorClassName="min-h-[380px]"
                        readOnly={selectedDraft.status === "processing"}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#2a2a2a] bg-[#121212] p-4 text-sm text-[#8a8a8a]">
                    Select a recipient to preview.
                  </div>
                )}
              </div>
              {sendSummary && <div className="rounded-lg border border-[#2a2a2a] bg-[#121212] px-4 py-3 text-sm">Sent {sendSummary.sent} / {sendSummary.total}. Failed: {sendSummary.failed}</div>}
              {sendError && <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg">{sendError}</p>}
            </>
          )}
        </div>

        {gmailConnected && (
          <div className="p-6 pt-0 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[#8a8a8a] hover:text-[#e8e8e8] hover:bg-[#1a1a1a]">Close</Button>
            <Button onClick={handleSendAll} disabled={isGenerating || isSending || readyDrafts.length === 0 || !selectedTemplateId} className="bg-[#e8e8e8] text-black hover:bg-white min-w-[130px]">
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="flex items-center gap-2"><Send className="w-4 h-4" /> Send {readyDrafts.length}</span>}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
