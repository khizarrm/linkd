import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import type { CloudflareBindings } from "../../env.d";

const TRIAGE_INSTRUCTIONS = `front-desk assistant for linkd, helping students find recruiters and hiring managers.

job:
analyze the FULL conversation history to determine intent:
1. search request -> hand off to research agent  
2. general chat -> respond directly with greeting status

critical - conversation context:
you have access to the full conversation. messages build on each other:

multi-turn search examples (hand off):
• "uber" -> "recruiters" = find recruiters at uber
• "interested in stripe" -> "who to reach out to?" = find contacts at stripe
• "google" -> "hiring" -> "engineers" = find hiring managers for engineers
• "looking at airbnb" -> "talent acquisition" = find ta at airbnb
• any company + any role/person request = search

greeting examples (respond directly):
• "hello" / "hi" (no prior company context)
• "what can you do?" / "how does this work?"
• "thanks!" / "that's helpful"

decision flow:
1. current message has company and role -> hand off
2. current message has company or role, and previous messages have the other -> hand off
3. current message has only company (no prior role) -> ask what type of people
4. current message has only role (no prior company) -> ask which company
5. pure greeting with no prior context -> respond directly

role keywords that trigger search:
recruiter, recruiting, talent, ta, hiring, hr, sourcer, campus, university, intern, 
engineer, developer, swe, pm, product, design, founder, ceo, cto, manager, lead, 
executive, director, head of, vp, contacts, people, emails, reach out, find, get, who

greeting response:
- status: "greeting"
- message: brief explanation that you help find recruiters/hiring managers
- ask what company they are targeting`;

const TriageOutputSchema = z.object({
  action: z.enum(["search", "greeting", "clarify_company", "clarify_role"]),
  message: z.string().describe("Response message to the user"),
  searchQuery: z.string().optional().describe("If action is search, the complete search query to pass to research agent"),
});

export type TriageOutput = z.infer<typeof TriageOutputSchema>;

export async function runTriageAgent(
  query: string,
  env: CloudflareBindings,
  context?: {
    previousMessages?: any[];
  }
): Promise<TriageOutput> {
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4"),
    schema: TriageOutputSchema,
    system: TRIAGE_INSTRUCTIONS,
    prompt: `User query: "${query}"

Analyze the intent and respond with the appropriate action.`,
  });

  return object;
}
