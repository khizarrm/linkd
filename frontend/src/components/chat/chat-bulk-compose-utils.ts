import type { EmailData } from "./email-compose-card";

export interface Template {
  id: string;
  name: string;
  isDefault?: number;
}

export interface FooterData {
  text?: string;
  links: Array<{ label: string; url: string }>;
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
  footer: FooterData | null;
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

export function parseFooter(raw: string | null | undefined): FooterData | null {
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
      footer: null,
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
    footer: parseFooter(prefilled.footer),
    attachments: parseTemplateAttachments(prefilled.attachments),
    status: "ready",
  };
}
