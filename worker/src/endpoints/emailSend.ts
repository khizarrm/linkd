import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { schema } from "../db";
import { users } from "../db/auth.schema";
import { verifyClerkToken } from "../lib/clerk-auth";

interface FooterData {
  text?: string;
  links: Array<{ label: string; url: string }>;
}

interface AttachmentData {
  filename: string;
  mimeType: string;
  data: string;
}

async function getAccessToken(
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
    throw new Error("Failed to authenticate with Google");
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

const ALLOWED_TAGS = new Set(["p", "br", "a", "strong", "em", "b", "i", "u", "span", "div", "ul", "ol", "li"]);
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
    .replace(/<(\/?)([\w-]+)([^>]*)>/g, (match, slash, tag, attrs) => {
      const lowerTag = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(lowerTag)) return "";
      if (slash) return `</${lowerTag}>`;
      const allowedAttrs = ALLOWED_ATTRS[lowerTag];
      if (!allowedAttrs) return `<${lowerTag}>`;
      const cleaned = (attrs as string).replace(
        /([\w-]+)\s*=\s*"([^"]*)"/g,
        (_: string, name: string, val: string) =>
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

function renderFooterHtml(footer: FooterData): string {
  const parts: string[] = [];

  if (footer.text) {
    parts.push(`<span style="color:#888888;">${escapeHtml(footer.text)}</span>`);
  }

  if (footer.links.length > 0) {
    const linkHtml = footer.links
      .map(
        (link) =>
          `<a href="${escapeHtml(link.url)}" style="color:#1a73e8;">${escapeHtml(link.label)}</a>`,
      )
      .join(" | ");
    parts.push(`<span style="color:#888888;">${linkHtml}</span>`);
  }

  if (parts.length === 0) return "";

  return `<div style="margin-top:16px;color:#888888;">${parts.join("<br>")}</div>`;
}

function inlineEmailStyles(html: string): string {
  return html
    .replace(/<p><\/p>/g, '<p style="margin:0;padding:0;"><br></p>')
    .replace(/<p>/g, '<p style="margin:0;padding:0;">');
}

function buildHtmlBody(body: string, footer?: FooterData | null): string {
  const bodyHtml = inlineEmailStyles(bodyToHtml(body));
  const footerHtml = footer ? renderFooterHtml(footer) : "";

  return [
    '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>',
    '<body style="margin:0;padding:0;">',
    `<div style="font-family:sans-serif;font-size:14px;line-height:1.5;color:#222222;">${bodyHtml}</div>`,
    footerHtml,
    "</body></html>",
  ].join("");
}

function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRawEmail(
  to: string,
  subject: string,
  body: string,
  footer?: FooterData | null,
  attachments?: AttachmentData[],
): string {
  const htmlContent = buildHtmlBody(body, footer);
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

const footerSchema = z.object({
  text: z.string().optional(),
  links: z.array(
    z.object({
      label: z.string(),
      url: z.string(),
    }),
  ),
});

const attachmentSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  data: z.string(),
});

export class ProtectedEmailSendRoute extends OpenAPIRoute {
  schema = {
    tags: ["API"],
    summary: "Send Email",
    description: "Send an email via Gmail API using OAuth2 credentials.",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              to: z.string().email().describe("Recipient email address"),
              subject: z.string().min(1).describe("Email subject"),
              body: z.string().min(1).describe("Email body content"),
              footer: footerSchema.nullable().optional(),
              attachments: z.array(attachmentSchema).optional(),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Email sent successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
              messageId: z.string().optional(),
            }),
          },
        },
      },
      "500": {
        description: "Internal Server Error",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
              message: z.string(),
            }),
          },
        },
      },
    },
  };

  async handle(c: any) {
    const data = await this.getValidatedData<typeof this.schema>();
    const env = c.env;
    const request = c.req.raw;
    const { to, subject, body, footer, attachments } = data.body;

    try {
      const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
      if (!authResult) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const db = drizzle(env.DB, { schema });
      const user = await db.query.users.findFirst({
        where: eq(users.clerkUserId, authResult.clerkUserId),
        columns: { googleRefreshToken: true },
      });

      if (!user?.googleRefreshToken) {
        return Response.json(
          { error: "Gmail not connected", message: "Please connect your Gmail account first" },
          { status: 403 },
        );
      }

      const accessToken = await getAccessToken(user.googleRefreshToken, env);
      const rawEmail = buildRawEmail(to, subject, body, footer, attachments);
      const encodedEmail = base64UrlEncode(rawEmail);

      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encodedEmail }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Gmail API error:", error);
        return Response.json(
          { error: "Failed to send email", message: `Gmail API returned ${response.status}` },
          { status: 500 },
        );
      }

      const result = (await response.json()) as { id: string };

      return Response.json({
        success: true,
        message: "Email sent successfully",
        messageId: result.id,
      });
    } catch (error) {
      console.error("Email send error:", error);
      return Response.json(
        { error: "Internal server error", message: (error as Error).message },
        { status: 500 },
      );
    }
  }
}
