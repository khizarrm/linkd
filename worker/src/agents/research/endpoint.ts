import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { runResearchAgent } from "./research";
import type { CloudflareBindings } from "../../env.d";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { schema } from "../../db";
import { messages } from "../../db/messages.schema";
import { chats } from "../../db/chats.schema";
import { verifyClerkToken } from "../../lib/clerk-auth";
import {
  convertToModelMessages,
  consumeStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
  MissingToolResultsError,
  type ModelMessage,
  type UIMessage,
} from "ai";

const TOOL_LABELS: Record<string, string> = {
  linkedin_search: "Searching LinkedIn",
  web_search: "Searching web",
  company_lookup: "Looking up company",
  find_and_verify_email: "Finding & verifying email",
};

async function loadChatHistory(chatId: string, env: CloudflareBindings): Promise<ModelMessage[]> {
  const dbClient = drizzle(env.DB, { schema });
  const chatMessages = await dbClient.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: [messages.createdAt],
  });

  const uiMessages: UIMessage[] = chatMessages.map((msg) => {
    let parts: any[] = [];
    if (msg.parts && msg.parts !== "null") {
      try {
        parts = JSON.parse(msg.parts);
      } catch {
        parts = [];
      }
    }

    if (parts.length === 0) {
      parts = [{ type: "text", text: msg.content || "" }];
    }

    return {
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts,
    } as UIMessage;
  });

  return convertToModelMessages(uiMessages);
}

function extractMessageText(message?: UIMessage): string {
  if (!message) return "";
  if (Array.isArray(message.parts)) {
    const textParts = message.parts.filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" &&
        "text" in part &&
        typeof (part as { text?: string }).text === "string",
    );
    return textParts.map((part) => part.text).join("");
  }
  return typeof (message as { content?: string }).content === "string"
    ? (message as { content?: string }).content || ""
    : "";
}

export class ResearchAgentRoute extends OpenAPIRoute {
  schema = {
    tags: ["Agents"],
    summary: "Research Agent with Claude",
    description:
      "A research assistant that helps find professionals and leads using Claude with streaming support.",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              messages: z
                .array(z.any())
                .optional()
                .describe("Chat messages in AI SDK UI format"),
              query: z
                .string()
                .min(1)
                .optional()
                .describe("Fallback user query when messages not provided"),
              chatId: z
                .string()
                .optional()
                .describe("Optional chat ID for database persistence"),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Streaming response from the agent",
        content: {
          "text/event-stream": {
            schema: z.object({
              chunk: z.string().optional(),
              done: z.boolean().optional(),
              conversationId: z.string().optional(),
              error: z.string().optional(),
            }),
          },
        },
      },
    },
  };

  async handle(c: any) {
    const env: CloudflareBindings = c.env;
    const reqData = await this.getValidatedData<typeof this.schema>();
    const body = reqData.body!;
    const { messages: uiMessages, query, chatId } = body;
    const request = c.req.raw;

    console.log(
      `[endpoint] Incoming request: chatId="${chatId}" hasMessages=${Array.isArray(uiMessages)}`,
    );

    const authResult = chatId
      ? await verifyClerkToken(request, env.CLERK_SECRET_KEY)
      : null;
    if (chatId && !authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let coreMessages: ModelMessage[] = [];
    let userMessageText = "";
    if (Array.isArray(uiMessages) && uiMessages.length > 0) {
      const lastUserMessage = [...uiMessages].reverse().find((message) => message.role === "user");
      userMessageText = extractMessageText(lastUserMessage as UIMessage);
      coreMessages = await convertToModelMessages(uiMessages as UIMessage[]);
    } else if (query) {
      if (chatId) {
        const previousMessages = await loadChatHistory(chatId, env);
        coreMessages = [...previousMessages, { role: "user", content: query }];
      } else {
        coreMessages = [{ role: "user", content: query }];
      }
      userMessageText = query;
    } else {
      return Response.json({ error: "Messages or query required" }, { status: 400 });
    }

    let userMessageId: string | null = null;
    if (chatId && authResult && userMessageText) {
      const db = drizzle(env.DB, { schema });
      const chat = await db.query.chats.findFirst({
        where: eq(chats.id, chatId),
      });

      if (chat && chat.clerkUserId === authResult.clerkUserId) {
        const now = new Date().toISOString();
        userMessageId = crypto.randomUUID();
        await db.insert(messages).values({
          id: userMessageId,
          chatId,
          role: "user",
          content: userMessageText,
          createdAt: now,
        });

        await db
          .update(chats)
          .set({ updatedAt: now })
          .where(eq(chats.id, chatId));
      }
    }

    let stepCounter = 0;
    let emailCounter = 0;
    let personCounter = 0;
    const seenProfileUrls = new Set<string>();
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const onToolStart = (toolName: string) => {
          const label = TOOL_LABELS[toolName] || toolName.replace(/_/g, " ");
          const stepId = `step_${++stepCounter}`;
          console.log(`[endpoint] Tool called: ${toolName} → "${label}"`);
          writer.write({
            type: "data-step",
            id: stepId,
            data: { id: stepId, label, status: "running" },
          });
          return stepId;
        };
        const onToolEnd = (toolName: string, stepId?: string, failed?: boolean) => {
          const label = TOOL_LABELS[toolName] || toolName.replace(/_/g, " ");
          if (!stepId) return;
          const status = failed ? "failed" : "done";
          console.log(`[endpoint] Tool completed: ${toolName} → "${label}" (${status})`);
          writer.write({
            type: "data-step",
            id: stepId,
            data: { id: stepId, label, status },
          });
        };
        const onEmailFound = (data: {
          name: string;
          email: string;
          domain: string;
          verificationStatus: "verified" | "possible";
        }) => {
          const emailId = `email_${++emailCounter}`;
          console.log(`[endpoint] Email found: ${data.email} (${data.verificationStatus})`);
          writer.write({
            type: "data-email",
            id: emailId,
            data: {
              id: emailId,
              name: data.name,
              email: data.email,
              domain: data.domain,
              verificationStatus: data.verificationStatus,
            },
          });
        };

        const onPeopleFound = (profiles: Array<{
          name: string;
          url: string;
          snippet: string;
        }>) => {
          const newProfiles = profiles.filter((p) => !seenProfileUrls.has(p.url));
          console.log(`[endpoint] People found: ${profiles.length} total, ${newProfiles.length} new`);
          for (const profile of newProfiles) {
            seenProfileUrls.add(profile.url);
            const personId = `person_${++personCounter}`;
            writer.write({
              type: "data-person",
              id: personId,
              data: {
                id: personId,
                name: profile.name,
                linkedinUrl: profile.url,
                snippet: profile.snippet,
              },
            });
          }
        };

        console.log(`[endpoint] Starting research agent`);
        const researchStream = await runResearchAgent({
          env,
          messages: coreMessages,
          abortSignal: request.signal,
          onToolStart,
          onToolEnd,
          onEmailFound,
          onPeopleFound,
        });

        researchStream.consumeStream();
        writer.merge(researchStream.toUIMessageStream());
      },
      onFinish: async ({ responseMessage, isAborted }) => {
        if (!chatId || !authResult || isAborted) return;
        if (!responseMessage || responseMessage.role !== "assistant") return;

        const db = drizzle(env.DB, { schema });
        const chat = await db.query.chats.findFirst({
          where: eq(chats.id, chatId),
        });

        if (!chat || chat.clerkUserId !== authResult.clerkUserId) {
          return;
        }

        const now = new Date().toISOString();
        const textContent = responseMessage.parts
          .filter((part) => part.type === "text")
          .map((part) => (part as { text: string }).text)
          .join("");

        const partsToStore = responseMessage.parts && responseMessage.parts.length > 0
          ? JSON.stringify(responseMessage.parts)
          : null;

        await db.insert(messages).values({
          id: responseMessage.id,
          chatId,
          role: responseMessage.role,
          content: textContent,
          parts: partsToStore,
          createdAt: now,
        });

        await db
          .update(chats)
          .set({ updatedAt: now })
          .where(eq(chats.id, chatId));
      },
    });

    return createUIMessageStreamResponse({
      stream,
      consumeSseStream: consumeStream,
    });
  }
}
