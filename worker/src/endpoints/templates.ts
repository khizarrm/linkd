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

const DEMO_TEMPLATES = [
  {
    name: "Direct Internship Inquiry",
    subject: "Internship Opportunity at Fullscript",
    body: `<p>Hi Sarah,</p>
<p>I came across Fullscript and was really impressed by what your team is building in the health and wellness space. I'm currently a computer science student and I'm looking for an internship where I can contribute meaningfully while learning from experienced engineers.</p>
<p>I have experience with full-stack development, including TypeScript, React, and Node.js, and I've shipped several projects to real users. I'd love the chance to bring that energy to Fullscript's engineering team.</p>
<p>Would you be open to a brief chat about any upcoming internship openings? I'd really appreciate the opportunity.</p>
<p>Thanks for your time,</p>
<p>Alex</p>`,
    footer: null,
  },
  {
    name: "Value-First Outreach",
    subject: "Student Developer — Internship Interest at Fullscript",
    body: `<p>Hi Sarah,</p>
<p>I've been following Fullscript for a while now, and the way you're making integrative health more accessible really resonates with me. I'm reaching out because I think I could be a strong addition to your team as an intern.</p>
<p>Here's a quick snapshot of what I bring:</p>
<ul>
<li>Built and deployed production web apps used by real users</li>
<li>Comfortable working across the stack — frontend, backend, and databases</li>
<li>Fast learner who ships quickly and iterates based on feedback</li>
</ul>
<p>I'm not looking for a passive internship — I want to work on real projects and make an impact. If there's room on your team, I'd love to chat.</p>
<p>Best,</p>
<p>Alex</p>`,
    footer: null,
  },
  {
    name: "Short & Casual",
    subject: "Quick Question — Internships at Fullscript?",
    body: `<p>Hey Sarah,</p>
<p>I'll keep this short — I'm a CS student who loves building things, and Fullscript is at the top of my list for places I'd want to intern. The product is great and the engineering team seems like an awesome group to learn from.</p>
<p>I've been working on full-stack web projects and I'm eager to apply those skills somewhere fast-paced. Would love to hear if your team has any internship openings coming up.</p>
<p>Happy to send over my resume or portfolio if helpful. Thanks!</p>
<p>Alex</p>`,
    footer: null,
  },
];

async function seedDemoTemplates(
  db: ReturnType<typeof drizzle>,
  clerkUserId: string,
) {
  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  const firstName = user?.name?.split(" ")[0] || "Alex";

  const now = new Date();
  const demoRows = DEMO_TEMPLATES.map((t, i) => ({
    id: crypto.randomUUID(),
    clerkUserId,
    name: t.name,
    subject: t.subject,
    body: t.body.replace(/Alex/g, firstName),
    footer: t.footer,
    attachments: null,
    createdAt: new Date(now.getTime() - i * 1000),
    updatedAt: new Date(now.getTime() - i * 1000),
  }));

  await db.insert(templates).values(demoRows);
  return demoRows;
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
    let userTemplates = await db.query.templates.findMany({
      where: eq(templates.clerkUserId, clerkUserId),
      orderBy: [desc(templates.createdAt)],
    });

    if (userTemplates.length === 0) {
      const seeded = await seedDemoTemplates(db, clerkUserId);
      userTemplates = seeded as typeof userTemplates;
    }

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

      const relinkedBody = relinkBody(template.body, aiResult.body);

      return {
        success: true,
        subject: aiResult.subject,
        body: relinkedBody,
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
