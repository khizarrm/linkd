import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { classifyIntent, type TriageResult } from "./triage-classifier";
import { runResearchAgent } from "./research";
import type { CloudflareBindings } from "../../env.d";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { schema } from "../../db";
import { messages } from "../../db/messages.schema";

const TOOL_LABELS: Record<string, string> = {
  linkedin_xray_search: "Generating search query",
  web_search: "Searching LinkedIn",
  find_and_verify_email: "Finding & verifying email",
};

async function loadChatHistory(chatId: string, env: CloudflareBindings): Promise<any[]> {
  const dbClient = drizzle(env.DB, { schema });
  const chatMessages = await dbClient.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: [messages.createdAt],
  });
  return chatMessages.map((msg) => ({
    role: msg.role || "user",
    content: msg.content || "",
  }));
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
              query: z
                .string()
                .min(1)
                .describe("The user's query about finding people at a company"),
              conversationId: z
                .string()
                .optional()
                .describe("Optional conversation ID for session continuity"),
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
    const { query, conversationId, chatId } = body;

    console.log(`[endpoint] Incoming request: query="${query}" conversationId="${conversationId}" chatId="${chatId}"`);

    const sessionId = conversationId || crypto.randomUUID();

    let previousMessages: any[] = [];
    if (chatId) {
      previousMessages = await loadChatHistory(chatId, env);
      console.log(`[endpoint] Loaded ${previousMessages.length} previous messages from chatId="${chatId}"`);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        };

        let stepCounter = 0;

        try {
          console.log(`[endpoint] Classifying intent...`);
          const triageResult: TriageResult = await classifyIntent(query, previousMessages);
          console.log(`[endpoint] Triage result: intent=${triageResult.intent}, company=${triageResult.company}, role=${triageResult.role}`);

          if (triageResult.intent !== "search") {
            console.log(`[endpoint] Responding with ${triageResult.intent}`);

            const greetingMessage =
              triageResult.intent === "greeting"
                ? "Hello! I help you find recruiters and hiring managers at companies. Which company are you targeting?"
                : triageResult.intent === "clarify_company"
                  ? "Which company would you like to find people at?"
                  : "What type of people are you looking for? (e.g., recruiters, hiring managers, engineers)";

            send({ type: "output", data: { message: greetingMessage } });
            send({ done: true, conversationId: sessionId, chatId });
            controller.close();
            return;
          }

          const searchQuery = triageResult.company && triageResult.role
            ? `${triageResult.company} ${triageResult.role}`
            : query;

          const researchStream = await runResearchAgent(
            searchQuery,
            env,
            { conversationId: sessionId, previousMessages }
          );

          for await (const part of researchStream.fullStream) {
            if (part.type !== "text-delta" && part.type !== "tool-call" && part.type !== "tool-result") {
              console.log(`[endpoint] Stream part:`, part.type, part);
            }

            if (part.type === "text-delta") {
              const textDelta = (part as unknown as { text: string }).text || "";
              if (textDelta && textDelta.trim()) {
                console.log(`[endpoint] Text delta:`, textDelta.substring(0, 100));
                send({
                  type: "text-delta",
                  delta: textDelta,
                });
              }
            } else if (part.type === "tool-call") {
              const toolName = part.toolName;
              const label = TOOL_LABELS[toolName] || toolName.replace(/_/g, " ");
              console.log(`[endpoint] 🔧 Tool called: ${toolName} → "${label}"`);
              stepCounter++;
              send({
                type: "step",
                id: `step_${stepCounter}`,
                label,
                status: "running",
              });
            } else if (part.type === "tool-result") {
              const toolName = part.toolName;
              const label = TOOL_LABELS[toolName] || toolName.replace(/_/g, " ");
              console.log(`[endpoint] ✅ Tool completed: ${toolName} → "${label}"`);
              send({
                type: "step",
                id: `step_${stepCounter}`,
                label,
                status: "done",
              });
            }
          }

          await researchStream.response;
          console.log(`[endpoint] Final response received`);

          console.log(`[endpoint] Done. Session ID: ${sessionId}`);
          send({ done: true, conversationId: sessionId, chatId });
          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.error(`[endpoint] ❌ Error:`, errorMessage);
          send({ error: errorMessage, conversationId: sessionId, chatId });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Accel-Buffering": "no",
        "Transfer-Encoding": "chunked",
        Connection: "keep-alive",
        "X-Conversation-Id": conversationId || sessionId,
      },
    });
  }
}
