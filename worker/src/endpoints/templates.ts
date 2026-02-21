import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";
import { eq, desc, and } from "drizzle-orm";
import { templates } from "../db/templates.schema";
import { users } from "../db/auth.schema";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { verifyClerkToken } from "../lib/clerk-auth";
import { ensureUserRecord } from "../lib/user-provision";


type OnboardingTemplateInput = {
  outreachIntents: string[];
  profileBlurb: string;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  additionalUrls: Array<{ label: string; url: string }>;
  userName?: string | null;
};

type TemplateDraft = {
  name: string;
  subject: string;
  body: string;
  attachments: string | null;
};

function sanitizeOnboardingTemplateInput(
  input: OnboardingTemplateInput,
): OnboardingTemplateInput {
  const outreachIntents = Array.from(
    new Set(
      input.outreachIntents
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => value.toLowerCase()),
    ),
  ).slice(0, 20);

  const additionalUrls = input.additionalUrls
    .map((entry) => ({
      label: (entry.label || "").trim(),
      url: (entry.url || "").trim(),
    }))
    .filter((entry) => entry.label && entry.url)
    .slice(0, 20);

  return {
    outreachIntents,
    profileBlurb: (input.profileBlurb || "").trim(),
    linkedinUrl: input.linkedinUrl?.trim() || null,
    websiteUrl: input.websiteUrl?.trim() || null,
    additionalUrls,
    userName: input.userName?.trim() || null,
  };
}

function fallbackOnboardingTemplateDraft(
  input: OnboardingTemplateInput,
): TemplateDraft {
  const firstIntent = input.outreachIntents[0] || "outreach";
  const intentLabel = firstIntent
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const introSource =
    input.profileBlurb ||
    "I’m reaching out because I think there could be a strong fit.";

  return {
    name: `${intentLabel} Intro Template`,
    subject: `Interest in ${firstIntent} at Netflix`,
    body: `<p>Hi,</p><p>${introSource}</p><p>I’m reaching out to express interest in opportunities at Netflix and to introduce how I can contribute.</p><p>If helpful, I’d be glad to share more context on my experience.</p>`,
    attachments: null,
  };
}

function parseTemplateDraftFromModelText(rawText: string): Partial<TemplateDraft> {
  let cleanText = rawText.trim();
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanText = jsonMatch[0];
  }

  const parsed = JSON.parse(cleanText);
  if (!parsed || typeof parsed !== "object") return {};
  return parsed as Partial<TemplateDraft>;
}

function sanitizeOnboardingBody(
  rawBody: string,
  input: OnboardingTemplateInput,
): string {
  let body = rawBody;

  // Remove hyperlink tags and keep visible text only.
  body = body.replace(/<a\s+[^>]*>([\s\S]*?)<\/a>/gi, "$1");

  // Remove explicit user URLs from body.
  const urlsToStrip = [
    ...(input.linkedinUrl ? [input.linkedinUrl] : []),
    ...(input.websiteUrl ? [input.websiteUrl] : []),
    ...input.additionalUrls.map((entry) => entry.url),
  ];

  for (const url of urlsToStrip) {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    body = body.replace(new RegExp(escaped, "gi"), "");
  }

  // Strip remaining raw http(s) URLs.
  body = body.replace(/\bhttps?:\/\/[^\s<)"]+/gi, "");

  // Drop paragraphs that are just link-profile callouts.
  body = body.replace(
    /<p>\s*[^<]*(linkedin|portfolio)[^<]*<\/p>/gi,
    "",
  );

  return body.replace(/\s{2,}/g, " ").trim();
}

async function generateOnboardingTemplateDraft(
  input: OnboardingTemplateInput,
): Promise<TemplateDraft> {
  const normalized = sanitizeOnboardingTemplateInput(input);
  const fallback = fallbackOnboardingTemplateDraft(normalized);
  const model = anthropic("claude-sonnet-4-20250514");

  const prompt = `You write concise cold outreach email templates.

Generate ONE reusable template using this user context:
- Outreach intents: ${normalized.outreachIntents.join(", ") || "not provided"}
- Profile blurb: ${normalized.profileBlurb || "not provided"}
- LinkedIn: ${normalized.linkedinUrl || "not provided"}
- Website: ${normalized.websiteUrl || "not provided"}
- Additional URLs: ${
    normalized.additionalUrls.length > 0
      ? normalized.additionalUrls
          .map((entry) => `${entry.label}: ${entry.url}`)
          .join(", ")
      : "not provided"
  }

Requirements:
1) Body must be HTML with <p> tags.
2) Do NOT use placeholders like {{name}} or {{company}}.
3) Keep tone direct, not salesy.
4) Treat Netflix as the demo target company for this draft.
5) Do NOT include LinkedIn, portfolio, website links, or any URLs in the body.
6) Return valid JSON only with keys: name, subject, body.

JSON format:
{
  "name": "template name",
  "subject": "subject line",
  "body": "<p>...</p>"
}`;

  try {
    const result = await generateText({ model, prompt });
    const parsed = parseTemplateDraftFromModelText(result.text);
    const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
    const subject =
      typeof parsed.subject === "string" ? parsed.subject.trim() : "";
    const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
    if (!name || !subject || !body) {
      return fallback;
    }

    const sanitizedBody = sanitizeOnboardingBody(body, normalized);
    if (!sanitizedBody) {
      return fallback;
    }

    return {
      name,
      subject,
      body: sanitizedBody,
      attachments: null,
    };
  } catch (error) {
    console.error("Error generating onboarding template draft:", error);
    return fallback;
  }
}


export class ProtectedTemplatesListRoute extends OpenAPIRoute {
  schema = {
    tags: ["API"],
    summary: "List Templates",
    responses: {
      "200": {
        description: "Templates retrieved",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              templates: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  subject: z.string(),
                  body: z.string(),
                  attachments: z.string().nullable(),
                  createdAt: z.string(),
                  updatedAt: z.string(),
                  isDefault: z.number(),
                }),
              ),
            }),
          },
        },
      },
      "401": {
        description: "Unauthorized",
      },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
    if (!authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clerkUserId } = authResult;
    const db = drizzle(env.DB, { schema });
    await ensureUserRecord(db, authResult);
    let userTemplates = await db.query.templates.findMany({
      where: eq(templates.clerkUserId, clerkUserId),
      orderBy: [desc(templates.createdAt)],
    });

    return {
      success: true,
      templates: userTemplates.map((t) => ({
        ...t,
        createdAt: new Date(t.createdAt).toISOString(),
        updatedAt: new Date(t.updatedAt).toISOString(),
        isDefault: t.isDefault ?? 0,
      })),
    };
  }
}

export class ProtectedTemplatesCreateRoute extends OpenAPIRoute {
  schema = {
    tags: ["API"],
    summary: "Create Template",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              name: z.string(),
              subject: z.string(),
              body: z.string(),
              attachments: z.string().nullable().optional(),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Template created",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              template: z.object({
                id: z.string(),
                name: z.string(),
                subject: z.string(),
                body: z.string(),
                attachments: z.string().nullable(),
                createdAt: z.string(),
              }),
            }),
          },
        },
      },
      "401": {
        description: "Unauthorized",
      },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
    if (!authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clerkUserId } = authResult;
    const { name, subject, body, attachments } = await this.getValidatedData<
      typeof this.schema
    >().then((d) => d.body);
    const db = drizzle(env.DB, { schema });
    await ensureUserRecord(db, authResult);

    const newTemplate = {
      id: crypto.randomUUID(),
      clerkUserId,
      name,
      subject,
      body,
      attachments: attachments ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(templates).values(newTemplate);

    return {
      success: true,
      template: {
        ...newTemplate,
        createdAt: newTemplate.createdAt.toISOString(),
      },
    };
  }
}

export class ProtectedTemplateGenerateFromOnboardingRoute extends OpenAPIRoute {
  schema = {
    tags: ["API"],
    summary: "Generate template draft from onboarding profile",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              outreachIntents: z.array(z.string()).default([]),
              profileBlurb: z.string().nullable().optional(),
              linkedinUrl: z.string().nullable().optional(),
              websiteUrl: z.string().nullable().optional(),
              additionalUrls: z
                .array(z.object({ label: z.string(), url: z.string() }))
                .default([]),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Template draft generated",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              templateDraft: z.object({
                name: z.string(),
                subject: z.string(),
                body: z.string(),
                attachments: z.string().nullable(),
              }),
            }),
          },
        },
      },
      "400": { description: "Invalid request body" },
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

    const body = await this.getValidatedData<typeof this.schema>().then(
      (d) => d.body,
    );
    if (!body) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const db = drizzle(env.DB, { schema });
    await ensureUserRecord(db, authResult);
    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, authResult.clerkUserId),
      columns: {
        name: true,
      },
    });

    const templateDraft = await generateOnboardingTemplateDraft({
      outreachIntents: body.outreachIntents || [],
      profileBlurb: body.profileBlurb || "",
      linkedinUrl: body.linkedinUrl ?? null,
      websiteUrl: body.websiteUrl ?? null,
      additionalUrls: (body.additionalUrls || []).map((entry) => ({
        label: entry.label || "",
        url: entry.url || "",
      })),
      userName: user?.name ?? null,
    });

    return {
      success: true,
      templateDraft,
    };
  }
}

export class ProtectedTemplatesUpdateRoute extends OpenAPIRoute {
  schema = {
    tags: ["API"],
    summary: "Update Template",
    request: {
      params: z.object({
        id: z.string().describe("Template ID"),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              name: z.string().optional(),
              subject: z.string().optional(),
              body: z.string().optional(),
              attachments: z.string().nullable().optional(),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Template updated",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              template: z.object({
                id: z.string(),
                name: z.string(),
                subject: z.string(),
                body: z.string(),
                attachments: z.string().nullable(),
                createdAt: z.string(),
                updatedAt: z.string(),
              }),
            }),
          },
        },
      },
      "401": {
        description: "Unauthorized",
      },
      "403": {
        description: "Forbidden",
      },
      "404": { description: "Template not found" },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    // Verify Clerk token
    const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
    if (!authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clerkUserId } = authResult;
    const { id } = await this.getValidatedData<typeof this.schema>().then(
      (d) => d.params,
    );
    const { name, subject, body, attachments } = await this.getValidatedData<
      typeof this.schema
    >().then((d) => d.body);
    const db = drizzle(env.DB, { schema });

    const existingTemplate = await db.query.templates.findFirst({
      where: eq(templates.id, id),
    });

    if (!existingTemplate) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

    if (existingTemplate.clerkUserId !== clerkUserId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await db
      .update(templates)
      .set({
        name,
        subject,
        body,
        attachments,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, id))
      .returning();

    const updated = result[0];
    return {
      success: true,
      template: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  }
}

export class ProtectedTemplatesDeleteRoute extends OpenAPIRoute {
  schema = {
    tags: ["API"],
    summary: "Delete Template",
    request: {
      params: z.object({
        id: z.string().describe("Template ID"),
      }),
    },
    responses: {
      "200": {
        description: "Template deleted",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
      },
      "401": {
        description: "Unauthorized",
      },
      "403": {
        description: "Forbidden",
      },
      "404": {
        description: "Template not found",
      },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    // Verify Clerk token
    const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
    if (!authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clerkUserId } = authResult;
    const { id } = await this.getValidatedData<typeof this.schema>().then(
      (d) => d.params,
    );
    const db = drizzle(env.DB, { schema });

    // Verify template ownership
    const existingTemplate = await db.query.templates.findFirst({
      where: eq(templates.id, id),
    });

    if (!existingTemplate) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

    if (existingTemplate.clerkUserId !== clerkUserId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await db
      .delete(templates)
      .where(eq(templates.id, id))
      .returning();

    return { success: true };
  }
}

export class ProtectedTemplatesSetDefaultRoute extends OpenAPIRoute {
  schema = {
    tags: ["API"],
    summary: "Set Default Template",
    request: {
      params: z.object({
        id: z.string().describe("Template ID"),
      }),
    },
    responses: {
      "200": {
        description: "Default template set",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Template not found" },
    },
  };

  async handle(c: any) {
    const request = c.req.raw;

    const authResult = await verifyClerkToken(request, c.env.CLERK_SECRET_KEY);
    if (!authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clerkUserId } = authResult;
    const { id } = await this.getValidatedData<typeof this.schema>().then(
      (d) => d.params,
    );
    const db = drizzle(c.env.DB, { schema });

    const existingTemplate = await db.query.templates.findFirst({
      where: eq(templates.id, id),
    });

    if (!existingTemplate) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

    if (existingTemplate.clerkUserId !== clerkUserId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Unset all defaults for this user, then toggle the chosen one
    await db
      .update(templates)
      .set({ isDefault: 0 })
      .where(eq(templates.clerkUserId, clerkUserId));

    const newValue = existingTemplate.isDefault === 1 ? 0 : 1;
    await db
      .update(templates)
      .set({ isDefault: newValue })
      .where(eq(templates.id, id));

    return { success: true };
  }
}

function extractLinks(html: string): Array<{ href: string; text: string }> {
  const links: Array<{ href: string; text: string }> = [];
  const regex = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    links.push({ href: match[1], text: match[2].replace(/<[^>]*>/g, "").trim() });
  }
  return links;
}

function relinkBody(originalBody: string, aiBody: string): string {
  const originalLinks = extractLinks(originalBody);
  if (originalLinks.length === 0) return aiBody;

  let result = aiBody;
  for (const link of originalLinks) {
    if (result.includes(link.href)) continue;
    const plainText = link.text;
    if (plainText && result.includes(plainText) && !result.includes(`>${plainText}</a>`)) {
      result = result.replace(
        plainText,
        `<a href="${link.href}">${plainText}</a>`,
      );
    }
  }
  return result;
}

export async function processTemplateForPerson(
  env: { ANTHROPIC_API_KEY?: string },
  data: {
    template: {
      subject: string;
      body: string;
      attachments?: string | null;
    };
    person: {
      name: string;
      role?: string;
      email?: string;
    };
    company: string;
  },
): Promise<{
  subject: string;
  body: string;
  attachments: string | null;
}> {
  const model = anthropic("claude-sonnet-4-20250514");

  const prompt = `You are an expert email writer.

Context:
- Person Name: ${data.person.name}
${data.person.role ? `- Role: ${data.person.role}` : ""}
${data.person.email ? `- Email: ${data.person.email}` : ""}
- Company: ${data.company}

Original Template Subject: ${data.template.subject}
Original Template Body: ${data.template.body}

Your task:
Rewrite this email to be personalized for this person at ${data.company}, while keeping the same general structure and intent. Make it sound natural and tailored to them specifically.

IMPORTANT: The body may contain HTML with hyperlinks (<a> tags). You MUST preserve all hyperlinks exactly as they appear — keep the <a href="..."> tags, their href URLs, and wrapping structure intact. Only rewrite the surrounding text, not the link markup. If a linked word needs to change for grammar, keep the <a> tag and update only the text inside it.

Return format (JSON only):
{
  "subject": "rewritten subject",
  "body": "rewritten body (with HTML hyperlinks preserved)"
}`;

  try {
    const result = await generateText({
      model,
      prompt,
    });

    let cleanText = result.text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    }

    const aiResult = JSON.parse(cleanText);
    const relinkedBody = relinkBody(data.template.body, aiResult.body);

    return {
      subject: aiResult.subject,
      body: relinkedBody,
      attachments: data.template.attachments ?? null,
    };
  } catch (error) {
    console.error("Error processing template with AI:", error);

    return {
      subject: data.template.subject,
      body: data.template.body,
      attachments: data.template.attachments ?? null,
    };
  }
}

export class ProtectedTemplateProcessRoute extends OpenAPIRoute {
  schema = {
    tags: ["API"],
    summary: "Process Template with AI",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              templateId: z.string().describe("Template ID"),
              person: z.object({
                name: z.string(),
                role: z.string().optional(),
                email: z.string().optional(),
              }),
              company: z.string(),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Template processed",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              subject: z.string(),
              body: z.string(),
              attachments: z.string().nullable(),
            }),
          },
        },
      },
      "401": {
        description: "Unauthorized",
      },
      "403": {
        description: "Forbidden",
      },
      "404": { description: "Template not found" },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    // Verify Clerk token
    const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
    if (!authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clerkUserId } = authResult;
    const body = await this.getValidatedData<typeof this.schema>().then((d) => d.body);
    if (!body) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { templateId, person, company } = body;
    const personPayload = {
      name: person?.name,
      role: person?.role,
      email: person?.email,
    };
    if (!personPayload.name) {
      return Response.json({ error: "Person name is required" }, { status: 400 });
    }
    const db = drizzle(env.DB, { schema });

    // Fetch template
    const template = await db.query.templates.findFirst({
      where: eq(templates.id, templateId),
    });

    if (!template) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

    // Verify template ownership
    if (template.clerkUserId !== clerkUserId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const processed = await processTemplateForPerson(c.env, {
      template: {
        subject: template.subject,
        body: template.body,
        attachments: template.attachments ?? null,
      },
      person: personPayload as { name: string; role?: string; email?: string },
      company,
    });

    return {
      success: true,
      ...processed,
    };
  }
}
