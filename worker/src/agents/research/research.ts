import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
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
  }
) {
  const tools = createTools(env);

  const result = streamText({
    model: anthropic("claude-sonnet-4"),
    system: researchAgentPrompt,
    prompt: query,
    tools: {
      company_lookup: tools.companyLookupTool,
      linkedin_xray_search: tools.linkedinXrayTool,
      web_search: tools.searchWebTool,
      find_and_verify_email: tools.emailFinderTool,
    },
  });

  return result;
}
