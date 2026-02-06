import { Agent } from "@openai/agents";
import { researchAgentPrompt } from "./prompts";
import { PeopleFinderOutput } from "./types";
import { createTools } from "./tools";
import type { CloudflareBindings } from "../../env.d";

export function createResearchAgent(env: CloudflareBindings) {
  const tools = createTools(env);

  return new Agent({
    name: "research",
    model: "gpt-4.1",
    instructions: researchAgentPrompt,
    tools: [
      tools.linkedinXrayTool,
      tools.searchWebTool,
      tools.emailFinderTool,
    ],
    outputType: PeopleFinderOutput,
  });
}
