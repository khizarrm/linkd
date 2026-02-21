import type { EmailData } from "./email-compose-card";

export interface Template {
  id: string;
  name: string;
  isDefault?: number;
}

export interface AttachmentFile {
  filename: string;
  mimeType: string;
  data: string;
}

export interface RecipientDraft {
  clientId: string;
  name: string;
  email: string;
  domain: string;
  subject: string;
  body: string;
  attachments: AttachmentFile[];
  status: "ready" | "processing" | "failed";
  error?: string;
}

export interface BulkSendResult {
  clientId: string;
  to: string;
  success: boolean;
  attempts: number;
  messageId?: string;
  error?: string;
}

export function parseTemplateAttachments(raw: string | null | undefined): AttachmentFile[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toRecipientDraft(recipient: EmailData): RecipientDraft {
  const clientId = recipient.uiId ?? recipient.id;
  const prefilled = recipient.processedEmail;
  if (!prefilled) {
    return {
      clientId,
      name: recipient.name,
      email: recipient.email,
      domain: recipient.domain,
      subject: "",
      body: "",
      attachments: [],
      status: "failed",
      error: "No pre-generated draft yet. Choose a template to generate.",
    };
  }

  return {
    clientId,
    name: recipient.name,
    email: recipient.email,
    domain: recipient.domain,
    subject: prefilled.subject,
    body: prefilled.body,
    attachments: parseTemplateAttachments(prefilled.attachments),
    status: "ready",
  };
}
