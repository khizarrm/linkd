import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import {
  OpenAIConversationsSession,
  run,
} from "@openai/agents";
import { createTriageAgent } from "./triage";
import { createResearchAgent } from "./research";
import type { CloudflareBindings } from "../../env.d";

const TOOL_LABELS: Record<string, string> = {
  linkedin_xray_search: "Generating search query",
  web_search: "Searching LinkedIn",
  find_and_verify_email: "Finding & verifying email",
};

export class ResearchAgentRoute extends OpenAPIRoute {
  schema = {
    tags: ["Agents"],
    summary: "Research Agent with OpenAI Agents SDK",
    description:
      "A research assistant that helps find professionals and leads using the OpenAI Agents SDK with streaming support.",
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
                .describe("Optional OpenAI conversation ID for session continuity"),
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

    // create research agent first (triage will hand off to it)
    const researchAgent = createResearchAgent(env);
    console.log(`[endpoint] Research agent created`);

    // create triage agent with research as handoff target
    // @ts-expect-error - Agent type inference with handoffs is complex but runtime works
    const triageAgent = createTriageAgent(researchAgent);
    console.log(`[endpoint] Triage agent created`);

    const session = conversationId
      ? new OpenAIConversationsSession({ conversationId })
      : new OpenAIConversationsSession();
    console.log(`[endpoint] Session: ${conversationId ? "resuming " + conversationId : "new session"}`);

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
          console.log(`[endpoint] Running triage agent with stream=true...`);
          // run triage agent - it will handoff to research if needed
          const result = await run(triageAgent, query, {
            session,
            stream: true,
          });

          for await (const event of result) {
            if (event.type === "agent_updated_stream_event") {
              const agentName = (event as any).agent?.name ?? "research";
              console.log(`[endpoint] 🔀 Agent updated: ${agentName}`);
              stepCounter++;
              send({
                type: "step",
                id: `step_${stepCounter}`,
                label: agentName === "research" ? "Starting research" : `Switching to ${agentName}`,
                status: "done",
              });
            }

            if (event.type === "run_item_stream_event") {
              const eventName = (event as any).name;

              if (eventName === "tool_called") {
                const toolName = (event.item as any).rawItem?.name ?? "unknown";
                const label = TOOL_LABELS[toolName] || toolName.replace(/_/g, " ");
                console.log(`[endpoint] 🔧 Tool called: ${toolName} → "${label}"`);
                stepCounter++;
                send({
                  type: "step",
                  id: `step_${stepCounter}`,
                  label,
                  status: "running",
                });
              } else if (eventName === "tool_output") {
                const toolName = (event.item as any).rawItem?.name ?? "unknown";
                const label = TOOL_LABELS[toolName] || toolName.replace(/_/g, " ");
                console.log(`[endpoint] ✅ Tool completed: ${toolName} → "${label}"`);
                send({
                  type: "step",
                  id: `step_${stepCounter}`,
                  label,
                  status: "done",
                });
              } else if (eventName === "handoff_occurred") {
                console.log(`[endpoint] 🔀 Handoff to research agent`);
                stepCounter++;
                send({
                  type: "step",
                  id: `step_${stepCounter}`,
                  label: "Handing off to research",
                  status: "done",
                });
              }
            }
          }

          const finalOutput = result.finalOutput;
          console.log(`[endpoint] Final output:`, JSON.stringify(finalOutput, null, 2));
          send({ type: "output", data: finalOutput });

          const finalSessionId = await session.getSessionId();
          console.log(`[endpoint] Done. Session ID: ${finalSessionId}`);
          send({ done: true, conversationId: finalSessionId, chatId });
          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.error(`[endpoint] ❌ Error:`, errorMessage);
          const finalSessionId =
            session.sessionId || conversationId || "unknown";
          send({ error: errorMessage, conversationId: finalSessionId, chatId });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Accel-Buffering": "no",  // disable nginx/cdn buffering
        "Transfer-Encoding": "chunked",
        Connection: "keep-alive",
        "X-Conversation-Id": conversationId || session.sessionId || "",
      },
    });
  }
}
