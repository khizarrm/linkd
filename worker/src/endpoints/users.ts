import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { schema } from "../db";
import { users } from "../db/auth.schema";
import { verifyClerkToken } from "../lib/clerk-auth";

function toTimestampMs(value: Date | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.getTime();
  return value;
}

function parseInfo(raw: string | null | undefined): {
  profileBlurb?: string;
} {
  if (!raw || raw === "null") return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as { profileBlurb?: string };
  } catch {
    return {};
  }
}

function resolveOnboardingContext(user: {
  onboardingContext: string | null;
  info: string | null;
}): string | null {
  const fromColumn = user.onboardingContext?.trim();
  if (fromColumn) return fromColumn;

  // Backward-compatible fallback for users created before onboarding_context existed.
  const fromInfo = parseInfo(user.info).profileBlurb?.trim();
  if (fromInfo) return fromInfo;

  return null;
}

const UserMeSchema = z.object({
  clerkUserId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  onboardingContext: z.string().nullable(),
  onboardingCompleted: z.boolean(),
  onboardingCompletedAt: z.number().nullable(),
});

export class ProtectedUserMeRoute extends OpenAPIRoute {
  schema = {
    tags: ["Users"],
    summary: "Get current user profile",
    responses: {
      "200": {
        description: "Current user profile",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              user: UserMeSchema,
            }),
          },
        },
      },
      "401": { description: "Unauthorized" },
      "404": { description: "User not found" },
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
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return {
      success: true,
      user: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        onboardingContext: resolveOnboardingContext(user),
        onboardingCompleted: !!user.onboardingCompletedAt,
        onboardingCompletedAt: toTimestampMs(user.onboardingCompletedAt),
      },
    };
  }
}

export class ProtectedUserUpdateMeRoute extends OpenAPIRoute {
  schema = {
    tags: ["Users"],
    summary: "Update current user profile",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              onboardingContext: z.string().nullable().optional(),
              onboardingCompleted: z.boolean().optional(),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Updated profile",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              user: UserMeSchema,
            }),
          },
        },
      },
      "400": { description: "Invalid request" },
      "401": { description: "Unauthorized" },
      "404": { description: "User not found" },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
    if (!authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await this.getValidatedData<typeof this.schema>().then(
      (data) => data.body,
    );
    if (!body) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const db = drizzle(env.DB, { schema });
    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, authResult.clerkUserId),
    });

    if (!existingUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: {
      onboardingContext?: string | null;
      onboardingCompletedAt?: Date | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (body.onboardingContext !== undefined) {
      const normalized = body.onboardingContext?.trim() || null;
      updateData.onboardingContext = normalized;
    }

    if (body.onboardingCompleted !== undefined) {
      updateData.onboardingCompletedAt = body.onboardingCompleted ? new Date() : null;
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.clerkUserId, authResult.clerkUserId));

    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, authResult.clerkUserId),
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return {
      success: true,
      user: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        onboardingContext: resolveOnboardingContext(user),
        onboardingCompleted: !!user.onboardingCompletedAt,
        onboardingCompletedAt: toTimestampMs(user.onboardingCompletedAt),
      },
    };
  }
}
