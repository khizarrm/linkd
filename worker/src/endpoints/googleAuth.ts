import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { schema } from "../db";
import { users } from "../db/auth.schema";
import { verifyClerkToken } from "../lib/clerk-auth";

const SCOPES = "https://www.googleapis.com/auth/gmail.send";

function getRedirectUri(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/api/protected/auth/google/callback`;
}

export class GoogleAuthInitiateRoute extends OpenAPIRoute {
  schema = {
    tags: ["Auth"],
    summary: "Initiate Google OAuth",
    description: "Returns a Google OAuth consent URL for the user to connect their Gmail.",
    responses: {
      "200": {
        description: "OAuth URL generated",
        content: {
          "application/json": {
            schema: z.object({
              url: z.string(),
            }),
          },
        },
      },
      "401": { description: "Unauthorized" },
      "500": { description: "Server error" },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
    if (!authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!env.GOOGLE_CLIENT_ID) {
      return Response.json({ error: "Google OAuth not configured" }, { status: 500 });
    }

    const redirectUri = getRedirectUri(request);
    const state = authResult.clerkUserId;

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return Response.json({
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    });
  }
}

export class GoogleAuthCallbackRoute extends OpenAPIRoute {
  schema = {
    tags: ["Auth"],
    summary: "Google OAuth Callback",
    description: "Handles the OAuth callback, exchanges code for refresh token, stores it.",
    request: {
      query: z.object({
        code: z.string(),
        state: z.string(),
      }),
    },
    responses: {
      "302": { description: "Redirect to frontend" },
      "400": { description: "Bad request" },
      "500": { description: "Server error" },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const clerkUserId = url.searchParams.get("state");

    if (!code || !clerkUserId) {
      return Response.json({ error: "Missing code or state" }, { status: 400 });
    }

    const redirectUri = getRedirectUri(request);

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Google token exchange failed:", error);
      return Response.json({ error: "Failed to exchange code" }, { status: 500 });
    }

    const tokenData = (await tokenResponse.json()) as { refresh_token?: string };

    if (!tokenData.refresh_token) {
      return Response.json({ error: "No refresh token returned" }, { status: 500 });
    }

    const db = drizzle(env.DB, { schema });
    await db
      .update(users)
      .set({ googleRefreshToken: tokenData.refresh_token })
      .where(eq(users.clerkUserId, clerkUserId));

    const frontendOrigin = request.headers.get("Origin")
      || (url.hostname === "localhost" ? "http://localhost:3000" : "https://try-linkd.com");

    return Response.redirect(`${frontendOrigin}/chat?gmail=connected`, 302);
  }
}

export class GoogleAuthStatusRoute extends OpenAPIRoute {
  schema = {
    tags: ["Auth"],
    summary: "Check Gmail connection status",
    responses: {
      "200": {
        description: "Connection status",
        content: {
          "application/json": {
            schema: z.object({
              connected: z.boolean(),
            }),
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
    if (!authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = drizzle(env.DB, { schema });
    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, authResult.clerkUserId),
      columns: { googleRefreshToken: true },
    });

    return Response.json({
      connected: !!user?.googleRefreshToken,
    });
  }
}
