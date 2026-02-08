import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { runTriageAgent } from "./triage";
import { runResearchAgent, PeopleFinderOutput } from "./research";
import type { CloudflareBindings } from "../../env.d";

const TOOL_LABELS: Record<string, string> = {
  linkedin_xray_search: "Generating search query",
  web_search: "Searching LinkedIn",
  find_and_verify_email: "Finding & verifying email",
};

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
          stepCounter++;
          send({
            type: "step",
            id: `step_${stepCounter}`,
            label: "Analyzing request",
            status: "running",
          });

          console.log(`[endpoint] Running triage agent...`);
          const triageResult = await runTriageAgent(query, env);
          
          send({
            type: "step",
            id: `step_${stepCounter}`,
            label: "Analyzing request",
            status: "done",
          });
          console.log(`[endpoint] Triage result: action=${triageResult.action}`);

          // Handle non-search actions (greeting, clarification)
          if (triageResult.action !== "search") {
            console.log(`[endpoint] Responding with ${triageResult.action}`);
            
            stepCounter++;
            send({
              type: "step",
              id: `step_${stepCounter}`,
              label: triageResult.action === "greeting" ? "Greeting" : "Asking for clarification",
              status: "done",
            });

            // Return greeting/clarification as output
            const output = {
              status: triageResult.action === "greeting" ? "greeting" : "clarification_needed",
              message: triageResult.message,
              people: [],
            };

            send({ type: "output", data: output });
            send({ done: true, conversationId: sessionId, chatId });
            controller.close();
            return;
          }

          // Step 2: Run research agent for search queries
          console.log(`[endpoint] Handing off to research agent...`);
          stepCounter++;
          send({
            type: "step",
            id: `step_${stepCounter}`,
            label: "Starting research",
            status: "done",
          });

          const researchStream = await runResearchAgent(
            triageResult.searchQuery || query,
            env,
            { conversationId: sessionId }
          );

          // Stream research results
          for await (const part of researchStream.fullStream) {
            if (part.type === "tool-call") {
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

          // Get final result
          const finalResponse = await researchStream.response;
          console.log(`[endpoint] Final response received`);

          // Parse the final output
          let finalOutput: any;
          try {
            // Try to parse as JSON if it's a tool result
            const lastMessage = finalResponse.messages[finalResponse.messages.length - 1];
            const contentStr = typeof lastMessage?.content === 'string' 
              ? lastMessage.content 
              : JSON.stringify(lastMessage?.content);
            finalOutput = JSON.parse(contentStr || '{}');
          } catch {
            // Fallback to text content
            const lastMessage = finalResponse.messages[finalResponse.messages.length - 1];
            const contentStr = typeof lastMessage?.content === 'string' 
              ? lastMessage.content 
              : JSON.stringify(lastMessage?.content);
            finalOutput = {
              status: "people_found",
              message: contentStr || "Research completed",
              people: [],
            };
          }

          send({ type: "output", data: finalOutput });
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
