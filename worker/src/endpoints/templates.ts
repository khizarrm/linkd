import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";
import { eq, desc, and } from "drizzle-orm";
import { templates } from "../db/templates.schema";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

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
                  createdAt: z.string(),
                  updatedAt: z.string(),
                })
              ),
            }),
          },
        },
      },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const db = drizzle(env.DB, { schema });
    const userTemplates = await db.query.templates.findMany({
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
                createdAt: z.string(),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(c: any) {
    const { name, subject, body } = await this.getValidatedData<typeof this.schema>().then(d => d.body);
    const db = drizzle(c.env.DB, { schema });
    
    const newTemplate = {
      id: crypto.randomUUID(),
      clerkUserId: "anonymous",
      name,
      subject,
      body,
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
                createdAt: z.string(),
                updatedAt: z.string(),
              }),
            }),
          },
        },
      },
      "404": { description: "Template not found" },
    },
  };

  async handle(c: any) {
    const { id } = await this.getValidatedData<typeof this.schema>().then(d => d.params);
    const { name, subject, body } = await this.getValidatedData<typeof this.schema>().then(d => d.body);
    const db = drizzle(c.env.DB, { schema });
    
    const result = await db.update(templates)
      .set({ 
        name, 
        subject, 
        body, 
        updatedAt: new Date() 
      })
      .where(eq(templates.id, id))
      .returning();

    if (!result.length) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

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
      "404": {
        description: "Template not found",
      },
    },
  };

  async handle(c: any) {
    const { id } = await this.getValidatedData<typeof this.schema>().then(d => d.params);
    const db = drizzle(c.env.DB, { schema });
    
    const result = await db.delete(templates).where(
      eq(templates.id, id)
    ).returning();

    if (!result.length) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

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
            }),
          },
        },
      },
      "404": { description: "Template not found" },
    },
  };

  async handle(c: any) {
    const { templateId, person, company } = await this.getValidatedData<typeof this.schema>().then(d => d.body);
    const db = drizzle(c.env.DB, { schema });

    // Fetch template
    const template = await db.query.templates.findFirst({
      where: eq(templates.id, templateId),
    });

    if (!template) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

    // Extract standard variables
    const nameParts = person.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const fullName = person.name;
    const role = person.role || '';
    const email = person.email || '';

    // Replace standard variables in subject and body
    let processedSubject = template.subject
      .replace(/{firstName}/g, firstName)
      .replace(/{lastName}/g, lastName)
      .replace(/{fullName}/g, fullName)
      .replace(/{role}/g, role)
      .replace(/{company}/g, company)
      .replace(/{email}/g, email);

    let processedBody = template.body
      .replace(/{firstName}/g, firstName)
      .replace(/{lastName}/g, lastName)
      .replace(/{fullName}/g, fullName)
      .replace(/{role}/g, role)
      .replace(/{company}/g, company)
      .replace(/{email}/g, email);

    // Check if there are any AI instruction fields (any {...} that doesn't match standard variables)
    const aiInstructionPattern = /\{([^}]+)\}/g;
    const hasAiInstructions = aiInstructionPattern.test(processedBody) || aiInstructionPattern.test(processedSubject);

    if (hasAiInstructions) {
      // Use AI to process remaining instruction fields
      // @ts-expect-error - openai function accepts apiKey option
      const model = openai("gpt-4o-2024-11-20", {
        apiKey: c.env.OPENAI_API_KEY,
      });

      const prompt = `You are a strict email template filler.

Context:
- Person: ${fullName}
- Company: ${company}
${email ? `- Email: ${email}` : ''}

Template Subject: ${processedSubject}
Template Body: ${processedBody}

Rules:
1. ONLY replace content inside curly braces {}. LEAVE ALL OTHER TEXT EXACTLY AS IS.
2. Keep generated content very brief (under 15 words).
3. Tone: Casual and professional.

Return format (JSON only):
{
  "subject": "final subject string",
  "body": "final body string"
}`;

      try {
        const result = await generateText({
          model,
          prompt,
        });

        let cleanText = result.text.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanText = jsonMatch[0];
        }

        const aiResult = JSON.parse(cleanText);
        processedSubject = aiResult.subject || processedSubject;
        processedBody = aiResult.body || processedBody;
      } catch (error) {
        console.error("Error processing template with AI:", error);
        // Fall back to partially processed template
      }
    }

    return {
      success: true,
      subject: processedSubject,
      body: processedBody,
    };
  }
}
