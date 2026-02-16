import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";
import { eq, desc, and } from "drizzle-orm";
import { templates } from "../db/templates.schema";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { verifyClerkToken } from "../lib/clerk-auth";

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
                  footer: z.string().nullable(),
                  attachments: z.string().nullable(),
                  createdAt: z.string(),
                  updatedAt: z.string(),
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
    const userTemplates = await db.query.templates.findMany({
      where: eq(templates.clerkUserId, clerkUserId),
      orderBy: [desc(templates.createdAt)],
    });

    return {
      success: true,
      templates: userTemplates.map((t) => ({
        ...t,
        createdAt: new Date(t.createdAt).toISOString(),
        updatedAt: new Date(t.updatedAt).toISOString(),
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
              footer: z.string().nullable().optional(),
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
                footer: z.string().nullable(),
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
    const { name, subject, body, footer, attachments } = await this.getValidatedData<
      typeof this.schema
    >().then((d) => d.body);
    const db = drizzle(env.DB, { schema });

    const newTemplate = {
      id: crypto.randomUUID(),
      clerkUserId,
      name,
      subject,
      body,
      footer: footer ?? null,
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
              footer: z.string().nullable().optional(),
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
                footer: z.string().nullable(),
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
    const { name, subject, body, footer, attachments } = await this.getValidatedData<
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
        footer,
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
              footer: z.string().nullable(),
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
    const { templateId, person, company } = await this.getValidatedData<
      typeof this.schema
    >().then((d) => d.body);
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

    const model = anthropic("claude-sonnet-4-20250514", {
      apiKey: c.env.ANTHROPIC_API_KEY,
    });

    const prompt = `You are an expert email writer.

Context:
- Person Name: ${person.name}
${person.role ? `- Role: ${person.role}` : ""}
${person.email ? `- Email: ${person.email}` : ""}
- Company: ${company}

Original Template Subject: ${template.subject}
Original Template Body: ${template.body}

Your task:
Rewrite this email to be personalized for this person at ${company}, while keeping the same general structure and intent. Make it sound natural and tailored to them specifically.

Return format (JSON only):
{
  "subject": "rewritten subject",
  "body": "rewritten body"
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

      return {
        success: true,
        subject: aiResult.subject,
        body: aiResult.body,
        footer: template.footer ?? null,
        attachments: template.attachments ?? null,
      };
    } catch (error) {
      console.error("Error processing template with AI:", error);

      return {
        success: true,
        subject: template.subject,
        body: template.body,
        footer: template.footer ?? null,
        attachments: template.attachments ?? null,
      };
    }
  }
}
