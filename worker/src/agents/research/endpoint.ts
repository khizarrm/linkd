import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import {
  Agent,
  webSearchTool,
  OpenAIConversationsSession,
  run,
} from "@openai/agents";
import { peopleSearchPrompt } from "./prompts";
import { createTools } from "./tools";
import type { CloudflareBindings } from "../../env.d";
import { PeopleFinderOutput } from "./types";

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
                .describe("Optional conversation ID for session continuity"),
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
    const { query, conversationId } = body;

    const tools = createTools(env);

    const peopleSearchAgent = new Agent({
      name: "people_search",
      instructions: peopleSearchPrompt,
      model: "gpt-5.2",
      tools: [
        tools.queryGeneratorTool,
        tools.emailFinderTool,
        webSearchTool(),
      ],
      outputType: PeopleFinderOutput,
    });

    const session = conversationId
      ? new OpenAIConversationsSession({ conversationId })
      : new OpenAIConversationsSession();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        };

        try {
          const result = await run(peopleSearchAgent, query, {
            session,
            stream: true,
          });

          for await (const event of result) {
            if (event.type === "run_item_stream_event") {
              if (event.name === "tool_called") {
                const toolName = (event.item as any).rawItem?.name ?? "unknown";
                send({ type: "tool_call", toolName, status: "called" });
              } else if (event.name === "tool_output") {
                const toolName = (event.item as any).rawItem?.name ?? "unknown";
                send({ type: "tool_call", toolName, status: "completed" });
              }
            }
          }

          const finalOutput = result.finalOutput;
          send({ type: "output", data: finalOutput });

          const finalSessionId = await session.getSessionId();
          send({ done: true, conversationId: finalSessionId });
          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          const finalSessionId =
            session.sessionId || conversationId || "unknown";
          send({ error: errorMessage, conversationId: finalSessionId });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Conversation-Id": conversationId || session.sessionId || "",
      },
    });
  }
}
