import { anthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs } from "ai";
import { researchAgentPrompt } from "./prompts";
import { PeopleFinderOutput } from "./types";
import { createTools } from "./tools";
import type { CloudflareBindings } from "../../env.d";

export { PeopleFinderOutput };

export async function runResearchAgent(
  query: string,
  env: CloudflareBindings,
  options?: {
    conversationId?: string;
    previousMessages?: any[];
    abortSignal?: AbortSignal;
  }
) {
  const tools = createTools(env);

  const messages: any[] = [];
  if (options?.previousMessages && options.previousMessages.length > 0) {
    for (const msg of options.previousMessages) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }
  messages.push({
    role: "user",
    content: query,
  });

  const result = streamText({
    model: anthropic("claude-sonnet-4-0"),
    system: researchAgentPrompt,
    messages,
    tools: {
      company_lookup: tools.companyLookupTool,
      linkedin_xray_search: tools.linkedinXrayTool,
      web_search: tools.searchWebTool,
      find_and_verify_email: tools.emailFinderTool,
    },
    abortSignal: options?.abortSignal,
    stopWhen: stepCountIs(10),
    temperature: 0.7,
  });

  return result;
}
