import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { Agent, webSearchTool, OpenAIConversationsSession, run } from "@openai/agents";
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
              conversationId: z
                .string()
                .optional()
                .describe("Optional conversation ID for session continuity (stored on OpenAI servers)"),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Streaming response from the agent with conversationId header",
        headers: {
          "X-Conversation-Id": {
            schema: z.string(),
            description: "Conversation ID for session continuity",
          },
        },
        content: {
          "text/event-stream": {
            schema: z.object({
              chunk: z.string().optional().describe("Text chunk from the agent"),
              done: z.boolean().optional().describe("Indicates stream completion"),
              conversationId: z.string().optional().describe("Conversation ID for session continuity"),
              error: z.string().optional().describe("Error message if something went wrong"),
            }),
          },
        },
      },
    },
  };

  async handle(c: any) {
    const env: CloudflareBindings = c.env;
    const reqData = await this.getValidatedData<typeof this.schema>();
    const { query, conversationId } = reqData.body;

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

    function isValidConversationId(id: string | undefined): boolean {
      if (!id) return false;
      return /^[a-zA-Z0-9_-]+$/.test(id);
    }

    const session = new OpenAIConversationsSession({
      conversationId: isValidConversationId(conversationId) ? conversationId : undefined,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await run(triageAgent, query, {
            session,
            stream: true,
          });

          const textStream = (result as any).toTextStream();

          for await (const chunk of textStream) {
            const sseData = `data: ${JSON.stringify({ chunk })}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: session.conversationId })}\n\n`)
          );
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errorMessage, conversationId: session.conversationId })}\n\n`
            )
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
        "X-Conversation-Id": session.conversationId,
      },
    });
  }
}
