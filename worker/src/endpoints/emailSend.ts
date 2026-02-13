import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { schema } from "../db";
import { users } from "../db/auth.schema";
import { verifyClerkToken } from "../lib/clerk-auth";

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

function buildRawEmail(to: string, subject: string, body: string): string {
  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    "",
    body,
  ];
  return lines.join("\r\n");
}

function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

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
    const { to, subject, body } = data.body;

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
      const rawEmail = buildRawEmail(to, subject, body);
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
