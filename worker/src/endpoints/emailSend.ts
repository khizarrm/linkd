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
  getAccessToken,
  isInvalidGrantError,
  normalizeAttachmentData,
} from "../lib/gmail";

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
    const { to, subject, body, attachments } = data.body;

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
      const rawEmail = buildRawEmail(
        to,
        subject,
        body,
        normalizeAttachmentData(attachments),
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
