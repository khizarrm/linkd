import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const IntentSchema = z.object({
  intent: z
    .enum(["search", "email_finder", "greeting", "clarify_company", "clarify_role"])
    .describe(
      "The intent of the user's request",
    ),
  reasoning: z.string().describe(
    "Why you chose this intent based on the conversation context",
  ),
  company: z.string().nullable().describe(
    "Company name mentioned in the request",
  ),
  role: z.string().nullable().describe(
    "Role or job title mentioned (e.g., recruiter, hiring manager, engineer)",
  ),
  personName: z.string().nullable().describe(
    "Specific person's name mentioned (for email finding)",
  ),
});

export type TriageResult = z.infer<typeof IntentSchema>;

const TRIAGE_SYSTEM = `You are a triage assistant that categorizes user requests to find recruiters, hiring managers, and email addresses.

ANALYZE THE FULL CONVERSATION HISTORY to determine intent.

INTENT CLASSIFICATION:

**email_finder** - Hand off to email finder agent when ALL conditions are met:
- User mentions a SPECIFIC person's name (first + last name)
- User mentions a company or domain
- User is asking for that person's email address

Examples that trigger "email_finder":
- "find john.smith@stripe.com" = find email for John Smith at Stripe
- "what's sarah johnson's email at uber?" = find email for Sarah Johnson
- "get me the email for michael chen at google" = find Michael Chen's email
- "email for jane doe at meta" = find Jane Doe's email

**search** - Hand off to research agent when BOTH conditions are met:
- User has mentioned a company (current message OR in conversation history)
- User has mentioned a role/person type they're looking for
- NOT asking for a specific named person's email

Examples that trigger "search":
- "uber" (previous: "recruiters") = find recruiters at Uber
- "interested in stripe" (current: "who to reach out to?") = find contacts at Stripe
- "google looking for engineers" = find engineering hiring managers at Google
- "airbnb talent acquisition" = find TA team at Airbnb

**greeting** - Respond directly when no prior context exists:
- "hello", "hi", "hey"
- "what can you do?", "how does this work?"
- "thanks!", "that's helpful"

**clarify_company** - Ask which company when:
- User mentioned a role but no company in current or previous messages
- Example: "looking for recruiters" (no company mentioned)

**clarify_role** - Ask what type of people when:
- User mentioned a company but no role/person type
- Example: "Uber" (no context about who to contact)

ROLE KEYWORDS (to identify user IS searching for a role):
recruiter, recruiting, talent, ta, hiring, hr, sourcer, campus, university,
intern, engineer, developer, swe, pm, product, design, founder, ceo,
cto, manager, lead, executive, director, head of, vp, contacts, people,
emails, reach out to, find, get, who

EMAIL_FINDER KEYWORDS (to identify user wants a specific person's email):
email for [name], [name]'s email, find email for [name], get [name]'s email,
[name] at [company] email, contact [name]

DECISION FLOW:
1. Current message has specific person name AND (company OR email domain) AND email intent → email_finder
2. Current message has company AND role (but NOT specific person email request) → search
3. Current message has company OR role, and previous messages have the other → search
4. Current message has only company (no prior role, no person name) → clarify_role
5. Current message has only role (no prior company, no person name) → clarify_company
6. Pure greeting with no context → greeting`;

export async function classifyIntent(
  query: string,
  previousMessages: Array<{ role: string; content: string }> = [],
): Promise<TriageResult> {
  const messages: any[] = [];

  if (previousMessages.length > 0) {
    for (const msg of previousMessages) {
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

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: IntentSchema,
    system: TRIAGE_SYSTEM,
    messages,
  });

  return object;
}