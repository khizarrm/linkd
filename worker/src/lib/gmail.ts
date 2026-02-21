import { z } from "zod";

export interface AttachmentData {
  filename: string;
  mimeType: string;
  data: string;
}

export const attachmentSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  data: z.string(),
});

export class GmailAuthError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "GmailAuthError";
    this.code = code;
  }
}

export function isInvalidGrantError(error: unknown): boolean {
  return error instanceof GmailAuthError && error.code === "invalid_grant";
}

export async function getAccessToken(
  refreshToken: string,
  env: { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string },
): Promise<string> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to refresh access token:", error);

    let parsedCode: string | undefined;
    try {
      const parsed = JSON.parse(error) as { error?: unknown };
      if (typeof parsed.error === "string") {
        parsedCode = parsed.error;
      }
    } catch {
      parsedCode = undefined;
    }

    throw new GmailAuthError("Failed to authenticate with Google", parsedCode);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "a",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "span",
  "div",
  "ul",
  "ol",
  "li",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  span: new Set(["style"]),
  div: new Set(["style"]),
};

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/<(\/?)([\w-]+)([^>]*)>/g, (_match, slash, tag, attrs) => {
      const lowerTag = String(tag).toLowerCase();
      if (!ALLOWED_TAGS.has(lowerTag)) return "";
      if (slash) return `</${lowerTag}>`;
      const allowedAttrs = ALLOWED_ATTRS[lowerTag];
      if (!allowedAttrs) return `<${lowerTag}>`;
      const cleaned = String(attrs).replace(
        /([\w-]+)\s*=\s*"([^"]*)"/g,
        (_m: string, name: string, val: string) =>
          allowedAttrs.has(name.toLowerCase()) ? ` ${name.toLowerCase()}="${val}"` : "",
      );
      return `<${lowerTag}${cleaned}>`;
    });
}

function isHtmlBody(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

function bodyToHtml(text: string): string {
  if (isHtmlBody(text)) return sanitizeHtml(text);
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function inlineEmailStyles(html: string): string {
  return html
    .replace(/<p><\/p>/g, '<p style="margin:0;padding:0;"><br></p>')
    .replace(/<p>/g, '<p style="margin:0;padding:0;">');
}

function buildHtmlBody(body: string): string {
  const bodyHtml = inlineEmailStyles(bodyToHtml(body));

  return [
    '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>',
    '<body style="margin:0;padding:0;">',
    `<div style="font-family:sans-serif;font-size:14px;line-height:1.5;color:#222222;">${bodyHtml}</div>`,
    "</body></html>",
  ].join("");
}

export function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buildRawEmail(
  to: string,
  subject: string,
  body: string,
  attachments?: AttachmentData[],
): string {
  const htmlContent = buildHtmlBody(body);
  const hasAttachments = attachments && attachments.length > 0;

  if (!hasAttachments) {
    return [
      `To: ${to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      "",
      htmlContent,
    ].join("\r\n");
  }

  const boundary = `boundary_${crypto.randomUUID().replace(/-/g, "")}`;
  const parts: string[] = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    htmlContent,
  ];

  for (const attachment of attachments) {
    parts.push(
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      attachment.data,
    );
  }

  parts.push(`--${boundary}--`);
  return parts.join("\r\n");
}

export function normalizeAttachmentData(input: unknown): AttachmentData[] | undefined {
  if (!Array.isArray(input)) return undefined;

  const attachments = input
    .filter(
      (attachment) =>
        attachment &&
        typeof attachment === "object" &&
        typeof (attachment as { filename?: unknown }).filename === "string" &&
        typeof (attachment as { mimeType?: unknown }).mimeType === "string" &&
        typeof (attachment as { data?: unknown }).data === "string",
    )
    .map((attachment) => ({
      filename: String((attachment as { filename: string }).filename),
      mimeType: String((attachment as { mimeType: string }).mimeType),
      data: String((attachment as { data: string }).data),
    }));

  return attachments.length > 0 ? attachments : undefined;
}
