import { anthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs } from "ai";
import { createEmailFinderTools } from "./tools";
import type { CloudflareBindings } from "../../env.d";

export interface EmailFinderInput {
  name: string;
  company: string;
  domain: string;
  role?: string;
}

export interface EmailFinderResult {
  success: boolean;
  email: string | null;
  verificationStatus: "verified" | "possible" | null;
  method: "pattern" | "research" | null;
  attempts: number;
  reasoning: string;
}

const EMAIL_FINDER_PROMPT = `You are an email finder agent. Your goal is to find a valid email address for a specific person at a company.

WORKFLOW (you MUST follow this exactly):

1. FIRST: Call pattern_email_finder tool
   - This tries common email patterns (first.last@, firstlast@, etc.)
   - If it returns success=true, you are DONE - present the result
   - If it returns success=false, proceed to step 2

2. SECOND: Call research_email_finder tool with attemptNumber=1
   - This searches the web for the person's email
   - Track the queries used (returned in the result)
   - If it returns success=true, you are DONE - present the result
   - If it returns success=false, proceed to step 3

3. THIRD: Call research_email_finder tool with attemptNumber=2
   - Use different search strategies
   - Pass the previous queries so we don't repeat them
   - If it returns success=true, you are DONE - present the result
   - If it returns success=false, proceed to step 4

4. FINAL: Call research_email_finder tool with attemptNumber=3
   - Last attempt with broader search
   - If this fails, report that we could not find the email

CRITICAL RULES:
- MAX 4 tool calls total (1 pattern + 3 research attempts)
- STOP immediately when you find a valid email
- DO NOT make unnecessary tool calls once you have a result
- Present the final result clearly with: email, verification status, and how it was found

If all attempts fail, explain briefly that the email could not be found through pattern matching or web research.`;

export async function runEmailFinderAgent(
  input: EmailFinderInput,
  env: CloudflareBindings,
  options?: {
    conversationId?: string;
  }
) {
  const tools = createEmailFinderTools(env);

  const userMessage = `Find the email for:
Name: ${input.name}
Company: ${input.company}
Domain: ${input.domain}
${input.role ? `Role: ${input.role}` : ""}

Start with pattern matching, then research if needed. Maximum 3 research attempts.`;

  const result = streamText({
    model: anthropic("claude-sonnet-4-0"),
    system: EMAIL_FINDER_PROMPT,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
    tools: {
      pattern_email_finder: tools.patternEmailFinder,
      research_email_finder: tools.researchEmailFinder,
    },
    stopWhen: stepCountIs(5),
    temperature: 0.3,
  });

  return result;
}
