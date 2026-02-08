import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { runEmailFinderAgent } from "./agent";
import type { CloudflareBindings } from "../../env.d";

const TOOL_LABELS: Record<string, string> = {
  pattern_email_finder: "Trying email patterns",
  research_email_finder: "Researching web",
};

export class EmailFinderAgentRoute extends OpenAPIRoute {
  schema = {
    tags: ["Agents"],
    summary: "Email Finder Agent",
    description: "Finds emails for a specific person using pattern matching and web research. Limited to 3 research attempts.",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              name: z.string().min(1).describe("Person's full name"),
              company: z.string().min(1).describe("Company name"),
              domain: z.string().min(1).describe("Company domain (e.g., 'stripe.com')"),
              role: z.string().optional().describe("Person's job title (optional)"),
              conversationId: z.string().optional().describe("Optional conversation ID for tracking"),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Streaming response from the email finder agent",
        content: {
          "text/event-stream": {
            schema: z.object({
              type: z.string(),
              delta: z.string().optional(),
              step: z.object({
                id: z.string(),
                label: z.string(),
                status: z.enum(["running", "done"]),
              }).optional(),
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
    const { name, company, domain, role, conversationId } = body;

    console.log(`[email-finder endpoint] Request: name="${name}" company="${company}" domain="${domain}"`);

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
          const agentStream = await runEmailFinderAgent(
            { name, company, domain, role },
            env,
            { conversationId: sessionId }
          );

          for await (const part of agentStream.fullStream) {
            if (part.type === "text-delta") {
              const textDelta = (part as unknown as { text: string }).text || "";
              if (textDelta && textDelta.trim()) {
                console.log(`[email-finder endpoint] Text:`, textDelta.substring(0, 100));
                send({
                  type: "text-delta",
                  delta: textDelta,
                });
              }
            } else if (part.type === "tool-call") {
              const toolName = part.toolName;
              const label = TOOL_LABELS[toolName] || toolName.replace(/_/g, " ");
              console.log(`[email-finder endpoint] Tool called: ${toolName}`);
              stepCounter++;
              send({
                type: "step",
                step: {
                  id: `step_${stepCounter}`,
                  label,
                  status: "running",
                },
              });
            } else if (part.type === "tool-result") {
              const toolName = part.toolName;
              const label = TOOL_LABELS[toolName] || toolName.replace(/_/g, " ");
              console.log(`[email-finder endpoint] Tool completed: ${toolName}`);
              send({
                type: "step",
                step: {
                  id: `step_${stepCounter}`,
                  label,
                  status: "done",
                },
              });
            }
          }

          await agentStream.response;
          console.log(`[email-finder endpoint] Done. Session: ${sessionId}`);

          send({ done: true, conversationId: sessionId });
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`[email-finder endpoint] Error:`, errorMessage);
          send({ error: errorMessage, conversationId: sessionId });
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
        "X-Conversation-Id": sessionId,
      },
    });
  }
}
