import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { schema } from "../db";
import { users } from "../db/auth.schema";
import { verifyClerkToken } from "../lib/clerk-auth";
import {
  attachmentSchema,
  base64UrlEncode,
  buildRawEmail,
  footerSchema,
  getAccessToken,
  isInvalidGrantError,
  normalizeAttachmentData,
  normalizeFooterData,
} from "../lib/gmail";

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

const bulkItemSchema = z.object({
  clientId: z.string().min(1),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  footer: footerSchema.nullable().optional(),
  attachments: z.array(attachmentSchema).optional(),
});

type BulkItem = z.infer<typeof bulkItemSchema>;

interface BulkSendResult {
  clientId: string;
  to: string;
  success: boolean;
  attempts: number;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  const base = [300, 900];
  return base[Math.max(0, Math.min(attempt - 1, base.length - 1))];
}

async function sendSingleItem(
  accessToken: string,
  item: BulkItem,
): Promise<BulkSendResult> {
  let attempts = 0;
  let lastStatusCode: number | undefined;
  let lastError = "Failed to send email";

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;
    try {
      const rawEmail = buildRawEmail(
        item.to,
        item.subject,
        item.body,
        normalizeFooterData(item.footer),
        normalizeAttachmentData(item.attachments),
      );
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

      if (response.ok) {
        const payload = (await response.json()) as { id?: string };
        return {
          clientId: item.clientId,
          to: item.to,
          success: true,
          attempts,
          messageId: payload.id,
        };
      }

      lastStatusCode = response.status;
      const errorText = await response.text();
      lastError = `Gmail API returned ${response.status}${errorText ? `: ${errorText}` : ""}`;

      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempts >= MAX_ATTEMPTS) {
        break;
      }
    } catch (error) {
      lastError = (error as Error).message || "Unexpected send failure";
      if (attempts >= MAX_ATTEMPTS) {
        break;
      }
    }

    await delay(backoffMs(attempts));
  }

  return {
    clientId: item.clientId,
    to: item.to,
    success: false,
    attempts,
    statusCode: lastStatusCode,
    error: lastError,
  };
}

async function runWithConcurrency(
  items: BulkItem[],
  accessToken: string,
  concurrency: number,
): Promise<BulkSendResult[]> {
  const results: BulkSendResult[] = new Array(items.length);
  let cursor = 0;

  async function workerLoop(): Promise<void> {
    while (true) {
      const currentIndex = cursor;
      cursor += 1;
      if (currentIndex >= items.length) {
        return;
      }
      results[currentIndex] = await sendSingleItem(accessToken, items[currentIndex]);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => workerLoop()));
  return results;
}

export class ProtectedEmailBulkSendRoute extends OpenAPIRoute {
  schema = {
    tags: ["API"],
    summary: "Send Bulk Emails",
    description: "Send up to 25 emails via Gmail API with per-item status.",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              items: z.array(bulkItemSchema).min(1).max(25),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Bulk send finished",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              summary: z.object({
                total: z.number(),
                sent: z.number(),
                failed: z.number(),
              }),
              results: z.array(
                z.object({
                  clientId: z.string(),
                  to: z.string(),
                  success: z.boolean(),
                  attempts: z.number(),
                  messageId: z.string().optional(),
                  error: z.string().optional(),
                  statusCode: z.number().optional(),
                }),
              ),
            }),
          },
        },
      },
      "400": { description: "Bad request" },
      "401": { description: "Unauthorized" },
      "403": { description: "Gmail not connected" },
      "500": { description: "Internal server error" },
    },
  };

  async handle(c: any) {
    const data = await this.getValidatedData<typeof this.schema>();
    const env = c.env;
    const request = c.req.raw;
    const { items } = data.body;

    try {
      const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
      if (!authResult) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const duplicateRecipient = (() => {
        const seen = new Set<string>();
        for (const item of items) {
          const key = item.to.trim().toLowerCase();
          if (seen.has(key)) {
            return item.to;
          }
          seen.add(key);
        }
        return null;
      })();

      if (duplicateRecipient) {
        return Response.json(
          { error: "Duplicate recipient", message: `Duplicate recipient in batch: ${duplicateRecipient}` },
          { status: 400 },
        );
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

      let accessToken: string;
      try {
        accessToken = await getAccessToken(user.googleRefreshToken, env);
      } catch (error) {
        if (isInvalidGrantError(error)) {
          await db
            .update(users)
            .set({ googleRefreshToken: null })
            .where(eq(users.clerkUserId, authResult.clerkUserId));

          return Response.json(
            {
              error: "Gmail connection expired",
              message: "Your Gmail connection expired. Please reconnect Gmail.",
            },
            { status: 403 },
          );
        }
        throw error;
      }
      const results = await runWithConcurrency(items, accessToken, 2);

      const sent = results.filter((result) => result.success).length;
      const failed = results.length - sent;

      return Response.json({
        success: true,
        summary: {
          total: results.length,
          sent,
          failed,
        },
        results,
      });
    } catch (error) {
      console.error("Bulk email send error:", error);
      return Response.json(
        { error: "Internal server error", message: (error as Error).message },
        { status: 500 },
      );
    }
  }
}
