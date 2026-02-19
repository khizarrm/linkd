import { anthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs, type ModelMessage } from "ai";
import { createTools } from "./tools";
import type { CloudflareBindings } from "../../env.d";

export type UserContext = {
  outreachIntents?: string[];
  profileBlurb?: string;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  additionalUrls?: Array<{ label: string; url: string }>;
};

function buildSystemPrompt(userContext?: UserContext): string {
  const basePrompt = `You are a linkd, a career search assistant for students and early-career professionals. You help find internships, jobs, companies, recruiters, and hiring managers.

## How to respond
Be direct, slightly conversational, and consice — like a knowledgeable friend who happens to be great at job searching. No emojis.
If someone asks how to use you, instruct them, and also mention they you can find emails and users can send / generate them in app. Do not get too technical on this, assume ur audience is non technical.

## Tools available

You have four tools at your disposal:

1. **linkedin_search** — Find people (recruiters, hiring managers, engineers) at specific companies. Use maxResults parameter to control how many profiles to return (default: 3, max: 5). Use 2-4 results by default to avoid overwhelming users. Increase only if user explicitly asks for more options. Call this tool multiple times with different roles if the first search doesn't find enough results. Duplicate profiles are automatically filtered across calls, so don't worry about overlap — just search freely.

2. **web_search** — General web search for job listings, company info, internship programs, salary data, application deadlines, etc. Use this for anything that isn't specifically "find me a person at X company".

3. **company_lookup** — Verify a company exists and get basic info. Use this FIRST ONLY when you're unsure about a company name or need to disambiguate.

4. **find_and_verify_email** — Generate and verify email addresses for people you found via linkedin_search. Use this when the user asks for someone's email or says something like "find their email".

## How to decide what to do

- **Casual greetings** ("hi", "hello"): Just respond naturally and fast, no tools needed
- **Vague requests** ("find me internships", "help me find a job"): Ask 1-2 clarifying questions first — what's their field? what year are they? any target companies?
- **Company + role** ("find recruiters at Shopify"): This is perfect for linkedin_search. If unsure about the company, call company_lookup first, then linkedin_search.
- **Job listings** ("software engineering internships in Toronto"): Use web_search
- **Email requests** ("yes, find me their emails", "can you find me the email of X person"): Use find_and_verify_email
- **Specific people** ("who's the CTO at Figma?"): use web_search

## When to keep searching

If linkedin_search returns fewer results than you need, try:
- Increasing maxResults (up to 5) if the user wants more options
- A different role (e.g., if "recruiter" returns nothing, try "talent_acquisition" or "hr")
- A broader location (remove city if they specified one)
- Ask if they know other related companies
- linkedin_search streams the response to the user itself, so you don't need to stream the people.

- If results are sparse, be honest: "I only found 2 people — want me to try searching for different roles at the same company?"
- Always end with a concrete next step or follow-up suggestion. Your goal is to eventually guide the user to sending an email from the app, so once you find people encourage them to ask you to find emails.`;

  if (!userContext) {
    return basePrompt;
  }

  const userContextSection: string[] = [];

  if (userContext.outreachIntents && userContext.outreachIntents.length > 0) {
    userContextSection.push(`Outreach goals: ${userContext.outreachIntents.join(", ")}`);
  }

  if (userContext.profileBlurb) {
    userContextSection.push(`About them: ${userContext.profileBlurb}`);
  }

  const links: string[] = [];
  if (userContext.linkedinUrl) {
    links.push(`LinkedIn: ${userContext.linkedinUrl}`);
  }
  if (userContext.websiteUrl) {
    links.push(`Website: ${userContext.websiteUrl}`);
  }
  if (userContext.additionalUrls && userContext.additionalUrls.length > 0) {
    for (const { label, url } of userContext.additionalUrls) {
      links.push(`${label}: ${url}`);
    }
  }
  if (links.length > 0) {
    userContextSection.push(`Links: ${links.join(", ")}`);
  }

  if (userContextSection.length === 0) {
    return basePrompt;
  }

  return `${basePrompt}

## About the user
${userContextSection.join("\n")}

Use this context to personalize your responses and tailor your search suggestions to their specific goals and background.`;
}

export async function runResearchAgent(options: {
  env: CloudflareBindings;
  messages: ModelMessage[];
  userContext?: UserContext;
  abortSignal?: AbortSignal;
  onToolStart?: (toolName: string) => string | undefined;
  onToolEnd?: (toolName: string, stepId?: string, failed?: boolean) => void;
  onEmailFound?: (data: {
    name: string;
    email: string;
    domain: string;
    verificationStatus: "verified" | "possible";
  }) => void;
  onPeopleFound?: (
    profiles: Array<{
      name: string;
      url: string;
      snippet: string;
    }>,
  ) => void;
  onFinish?: (args: {
    text: string;
    isAborted?: boolean;
  }) => void | Promise<void>;
}) {
  const tools = createTools(options.env, {
    onToolStart: options.onToolStart,
    onToolEnd: options.onToolEnd,
    onEmailFound: options.onEmailFound,
    onPeopleFound: options.onPeopleFound,
  });

  const result = streamText({
    model: anthropic("claude-sonnet-4-0"),
    system: buildSystemPrompt(options.userContext),
    messages: options.messages,
    tools: {
      linkedin_search: tools.linkedinSearch,
      web_search: tools.webSearch,
      company_lookup: tools.companyLookup,
      find_and_verify_email: tools.emailFinder,
    },
    abortSignal: options.abortSignal,
    stopWhen: stepCountIs(10),
    temperature: 0.7,
    onFinish: options.onFinish,
  });

  return result;
}
