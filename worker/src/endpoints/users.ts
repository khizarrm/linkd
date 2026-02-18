import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { schema } from "../db";
import { users } from "../db/auth.schema";
import { verifyClerkToken } from "../lib/clerk-auth";

function parseOutreachIntents(raw: string | null | undefined): string[] {
  if (!raw || raw === "null") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeOutreachIntents(intents: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const intent of intents) {
    const trimmed = intent.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized.slice(0, 20);
}

function toTimestampMs(value: Date | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.getTime();
  return value;
}

function parseInfo(raw: string | null | undefined): {
  profileBlurb?: string;
  additionalUrls?: Array<{ label: string; url: string }>;
  onboardingStep?: number;
} {
  if (!raw || raw === "null") return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as {
      profileBlurb?: string;
      additionalUrls?: Array<{ label: string; url: string }>;
      onboardingStep?: number;
    };
  } catch {
    return {};
  }
}

function normalizeOnboardingStep(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > 3) return null;
  return value;
}

async function hasUsersColumn(env: { DB: D1Database }, columnName: string): Promise<boolean> {
  try {
    const result = await env.DB.prepare("PRAGMA table_info(users)").all<{
      name?: string;
    }>();
    const rows = Array.isArray(result.results) ? result.results : [];
    return rows.some((row) => row?.name === columnName);
  } catch {
    return false;
  }
}

function deriveOnboardingStep(params: {
  storedStep: number | null | undefined;
  onboardingCompletedAt: Date | number | null | undefined;
  outreachIntents: string[];
  profileBlurb: string | null | undefined;
  linkedinUrl: string | null | undefined;
  websiteUrl: string | null | undefined;
  additionalUrls: Array<{ label: string; url: string }>;
}): number {
  if (params.onboardingCompletedAt) return 3;

  const storedStep = params.storedStep ?? null;
  if (storedStep !== null && storedStep >= 1 && storedStep <= 3) {
    return storedStep;
  }

  if (params.outreachIntents.length === 0) {
    return 1;
  }

  const hasProfileData =
    !!params.profileBlurb?.trim() ||
    !!params.linkedinUrl?.trim() ||
    !!params.websiteUrl?.trim() ||
    params.additionalUrls.length > 0;

  return hasProfileData ? 3 : 2;
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isValidHttpUrl(trimmed)) return null;
  return trimmed;
}

function normalizeLabeledUrls(
  values: Array<{ label: string; url: string }>,
): Array<{ label: string; url: string }> {
  const seen = new Set<string>();
  const out: Array<{ label: string; url: string }> = [];
  for (const value of values) {
    const label = value.label?.trim();
    const normalizedUrl = normalizeUrl(value.url);
    if (!label || !normalizedUrl) continue;
    const key = `${label.toLowerCase()}|${normalizedUrl.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, url: normalizedUrl });
  }
  return out.slice(0, 20);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function coerceAdditionalUrls(
  value: unknown,
): Array<{ label: string; url: string }> {
  if (!Array.isArray(value)) return [];

  const entries: Array<{ label: string; url: string }> = [];
  for (const item of value) {
    if (typeof item === "string") {
      if (isValidHttpUrl(item)) {
        entries.push({ label: "Link", url: item });
      }
      continue;
    }

    if (!item || typeof item !== "object") continue;
    const maybeLabel = (item as { label?: unknown }).label;
    const maybeUrl = (item as { url?: unknown }).url;
    if (typeof maybeLabel !== "string" || typeof maybeUrl !== "string") {
      continue;
    }
    if (!isValidHttpUrl(maybeUrl)) continue;
    entries.push({ label: maybeLabel, url: maybeUrl });
  }

  return normalizeLabeledUrls(entries);
}

const UserMeSchema = z.object({
  clerkUserId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  outreachIntents: z.array(z.string()),
  profileBlurb: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  additionalUrls: z.array(z.object({ label: z.string(), url: z.string() })),
  onboardingStep: z.number().int().min(1).max(3),
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

    const outreachIntents = parseOutreachIntents(user.outreachIntents);
    const info = parseInfo(user.info);
    const additionalUrls = coerceAdditionalUrls(info.additionalUrls);

    return {
      success: true,
      user: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        outreachIntents,
        profileBlurb: info.profileBlurb ?? null,
        linkedinUrl: user.linkedinUrl ?? null,
        websiteUrl: user.websiteUrl ?? null,
        additionalUrls,
        onboardingStep: deriveOnboardingStep({
          storedStep: normalizeOnboardingStep(user.onboardingStep) ?? normalizeOnboardingStep(info.onboardingStep),
          onboardingCompletedAt: user.onboardingCompletedAt,
          outreachIntents,
          profileBlurb: info.profileBlurb ?? null,
          linkedinUrl: user.linkedinUrl ?? null,
          websiteUrl: user.websiteUrl ?? null,
          additionalUrls,
        }),
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
              outreachIntents: z.array(z.string()).optional(),
              profileBlurb: z.string().nullable().optional(),
              linkedinUrl: z.string().nullable().optional(),
              websiteUrl: z.string().nullable().optional(),
              additionalUrls: z
                .array(z.object({ label: z.string(), url: z.string() }))
                .optional(),
              onboardingStep: z.number().int().min(1).max(3).optional(),
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

    const supportsOnboardingStepColumn = await hasUsersColumn(env, "onboarding_step");
    const updateData: {
      outreachIntents?: string;
      info?: string;
      linkedinUrl?: string | null;
      websiteUrl?: string | null;
      onboardingStep?: number;
      onboardingCompletedAt?: Date | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (body.outreachIntents !== undefined) {
      const normalized = normalizeOutreachIntents(body.outreachIntents);
      updateData.outreachIntents = JSON.stringify(normalized);
    }

    if (body.onboardingStep !== undefined) {
      if (supportsOnboardingStepColumn) {
        updateData.onboardingStep = body.onboardingStep;
      }
    }

    if (body.onboardingCompleted !== undefined) {
      updateData.onboardingCompletedAt = body.onboardingCompleted
        ? new Date()
        : null;
      if (body.onboardingCompleted && supportsOnboardingStepColumn) {
        updateData.onboardingStep = 3;
      } else if (body.onboardingStep === undefined && supportsOnboardingStepColumn) {
        updateData.onboardingStep = 1;
      }
    }

    const existingInfo = parseInfo(existingUser.info);
    const nextInfo = {
      ...existingInfo,
      ...(body.profileBlurb !== undefined
        ? { profileBlurb: body.profileBlurb?.trim() || "" }
        : {}),
      ...(body.additionalUrls !== undefined
        ? {
            additionalUrls: normalizeLabeledUrls(
              body.additionalUrls.map((entry) => ({
                label: entry.label || "",
                url: entry.url || "",
              })),
            ),
          }
        : {}),
      ...(!supportsOnboardingStepColumn && body.onboardingStep !== undefined
        ? { onboardingStep: body.onboardingStep }
        : {}),
      ...(!supportsOnboardingStepColumn && body.onboardingCompleted === true
        ? { onboardingStep: 3 }
        : {}),
      ...(!supportsOnboardingStepColumn &&
      body.onboardingCompleted === false &&
      body.onboardingStep === undefined
        ? { onboardingStep: 1 }
        : {}),
    };

    if (body.linkedinUrl !== undefined) {
      const normalized = normalizeUrl(body.linkedinUrl);
      if (body.linkedinUrl && !normalized) {
        return Response.json(
          { error: "LinkedIn URL must be a valid URL with http:// or https://" },
          { status: 400 },
        );
      }
      updateData.linkedinUrl = normalized;
    }
    if (body.websiteUrl !== undefined) {
      const normalized = normalizeUrl(body.websiteUrl);
      if (body.websiteUrl && !normalized) {
        return Response.json(
          { error: "Website URL must be a valid URL with http:// or https://" },
          { status: 400 },
        );
      }
      updateData.websiteUrl = normalized;
    }
    if (
      body.profileBlurb !== undefined ||
      body.additionalUrls !== undefined ||
      (!supportsOnboardingStepColumn &&
        (body.onboardingStep !== undefined ||
          body.onboardingCompleted !== undefined))
    ) {
      if (body.additionalUrls !== undefined) {
        for (const entry of body.additionalUrls) {
          if (!entry.label || !entry.label.trim()) {
            return Response.json(
              { error: "Additional URL label is required" },
              { status: 400 },
            );
          }
          if (!entry.url || !isValidHttpUrl(entry.url.trim())) {
            return Response.json(
              { error: "Additional URL must be a valid URL with http:// or https://" },
              { status: 400 },
            );
          }
        }
      }
      updateData.info = JSON.stringify(nextInfo);
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

    const outreachIntents = parseOutreachIntents(user.outreachIntents);
    const info = parseInfo(user.info);
    const additionalUrls = coerceAdditionalUrls(info.additionalUrls);

    return {
      success: true,
      user: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        outreachIntents,
        profileBlurb: info.profileBlurb ?? null,
        linkedinUrl: user.linkedinUrl ?? null,
        websiteUrl: user.websiteUrl ?? null,
        additionalUrls,
        onboardingStep: deriveOnboardingStep({
          storedStep: normalizeOnboardingStep(user.onboardingStep) ?? normalizeOnboardingStep(info.onboardingStep),
          onboardingCompletedAt: user.onboardingCompletedAt,
          outreachIntents,
          profileBlurb: info.profileBlurb ?? null,
          linkedinUrl: user.linkedinUrl ?? null,
          websiteUrl: user.websiteUrl ?? null,
          additionalUrls,
        }),
        onboardingCompleted: !!user.onboardingCompletedAt,
        onboardingCompletedAt: toTimestampMs(user.onboardingCompletedAt),
      },
    };
  }
}
