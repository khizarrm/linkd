import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { Agent, webSearchTool, MemorySession, run } from "@openai/agents";
import { triagePrompt, peopleSearchPrompt } from "./prompts";
import { createTools } from "./tools";
import type { CloudflareBindings } from "../../env.d";

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
              stream: z
                .boolean()
                .optional()
                .default(true)
                .describe("Whether to stream the response"),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Streaming or non-streaming response from the agent",
        content: {
          "text/event-stream": {
            schema: z.string(),
          },
          "application/json": {
            schema: z.object({
              response: z.string(),
            }),
          },
        },
      },
    },
  };

  async handle(c: any) {
    const env: CloudflareBindings = c.env;
    const reqData = await this.getValidatedData<typeof this.schema>();
    const { query, stream: shouldStream } = reqData.body;

    const tools = createTools(env);

    const peopleSearchAgent = new Agent({
      name: "people_search",
      instructions: peopleSearchPrompt,
      model: "gpt-5.2",
      tools: [
        tools.queryGeneratorTool,
        tools.getUserInfo,
        tools.emailFinderTool,
        webSearchTool(),
      ],
    });

    const triageAgent = new Agent({
      name: "triage",
      instructions: triagePrompt,
      model: "gpt-4.1",
      handoffs: [peopleSearchAgent],
    });

    const session = new MemorySession();

    if (shouldStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const result = await run(triageAgent, query, {
              session,
              stream: true,
            });

            for await (const event of result) {
              if (event.type === "raw_model_stream_event") {
                const data = event.data as any;
                if (data.type === "output_text_delta" && data.delta) {
                  const sseData = `data: ${JSON.stringify({ type: "text", content: data.delta })}\n\n`;
                  controller.enqueue(encoder.encode(sseData));
                }
              } else if (event.type === "agent_updated_stream_event") {
                const sseData = `data: ${JSON.stringify({
                  type: "agent_update",
                  agent: event.agent.name,
                })}\n\n`;
                controller.enqueue(encoder.encode(sseData));
              } else if (event.type === "run_item_stream_event") {
                const item = event.item as any;
                if (item.type === "tool_call") {
                  const sseData = `data: ${JSON.stringify({
                    type: "tool_call",
                    tool: item.name,
                  })}\n\n`;
                  controller.enqueue(encoder.encode(sseData));
                }
              }
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "error", message: errorMessage })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      const result = await run(triageAgent, query, {
        session,
        stream: false,
      });

      const textOutput = result.toTextStream ? await streamToString(result.toTextStream()) : "";

      return new Response(
        JSON.stringify({
          response: textOutput,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
}

async function streamToString(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += value;
  }
  return result;
}
