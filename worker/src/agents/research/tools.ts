import { tool } from "@openai/agents";
import { z } from "zod";
import { QueryGeneratorOutput } from "./types";
import type { CloudflareBindings } from "../../env.d";

export function createTools(env: CloudflareBindings) {
  const queryGeneratorTool = tool({
    name: "generate_search_queries",
    description:
      "Generate optimized search queries to find people. Call this FIRST before using web_search.",
    parameters: z.object({
      request: z
        .string()
        .describe(
          "Full description of what kind of people to find, including company, role, location, and any other context",
        ),
    }),
    execute: async ({ request }) => {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `Generate 6-10 search queries to find people based on the request.

Rules:
- Use searches from a maximum of 2 years ago. Fastest way to do it is to add a date, eg: [your query] after:2024-01-20
- Use site:linkedin.com for LinkedIn-specific searches
- Use quotes for exact phrases
- Use Boolean operators (AND, OR)
- Include title synonyms (SWE, Developer, Engineer, etc.)
- Include "worked at" / "experience at" patterns
- For specific person searches, generate 1-5 targeted queries

Return JSON: { "queries": ["query1", ...], "reasoning": "brief explanation" }`,
            },
            {
              role: "user",
              content: request,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      const completion = await response.json();
      const result = JSON.parse(completion.choices[0].message.content || "{}");
      return QueryGeneratorOutput.parse(result);
    },
  });

  const getUserInfo = tool({
    name: "get_user_info",
    description:
      "Get information about the current user. Use this when you need to personalize responses or understand user context.",
    parameters: z.object({}),
    execute: async () => {
      return `**User Profile**

| Field | Value |
|-------|-------|
| Name | Khizar Malik |
| Standing | 4th Year |
| Program | Computer Science |
| University | Carleton University |
| Location | Ottawa |
| Interests | Web development, Agentic AI (open to other areas) |`;
    },
  });

  async function verifyEmail(email: string): Promise<string> {
    const apiKey = env.ZEROBOUNCE_API_KEY;
    if (!apiKey) {
      throw new Error("ZEROBOUNCE_API_KEY not set");
    }

    const url = `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}`;

    const response = await fetch(url);
    const data = (await response.json()) as { status: string };

    return data.status;
  }

  const emailFinderTool = tool({
    name: "find_and_verify_email",
    description:
      "Generate and verify email patterns for a person at a company. Tests up to 3 patterns using ZeroBounce API.",
    parameters: z.object({
      name: z.string().describe("Person's full name"),
      company: z.string().describe("Company name"),
      domain: z.string().describe("Company domain (e.g., 'stripe.com')"),
      knownPattern: z
        .string()
        .describe(
          "Known email from company to infer pattern (e.g., 'john.doe@company.com'). Pass empty string if unknown.",
        ),
    }),
    execute: async ({ name, domain, knownPattern }) => {
      const cleanDomain = domain.replace(/^www\./, "").toLowerCase();

      const parts = name.trim().split(/\s+/);
      const first = parts[0]?.toLowerCase() || "";
      const last = parts[parts.length - 1]?.toLowerCase() || "";
      const firstInitial = first[0] || "";

      let patterns: string[] = [];

      if (knownPattern && knownPattern.trim() !== "") {
        const knownLocal = knownPattern.split("@")[0];
        const knownDomain = knownPattern.split("@")[1] || cleanDomain;
        patterns.push(`${knownLocal}@${knownDomain}`);
      }

      patterns.push(
        `${first}.${last}@${cleanDomain}`,
        `${first}${last}@${cleanDomain}`,
        `${first}_${last}@${cleanDomain}`,
        `${firstInitial}${last}@${cleanDomain}`,
        `${first}@${cleanDomain}`,
      );

      patterns = patterns.slice(0, 3);

      for (const email of patterns) {
        try {
          const status = await verifyEmail(email);
          console.log("status: ", status, email);
          if (status === "valid" || status === "catch-all") {
            return { email, pattern: email.split("@")[0], verified: true };
          }
        } catch (error) {
          console.error(`Failed to verify ${email}:`, error);
        }
      }

      return { email: null, pattern: null, verified: false };
    },
  });

  return {
    queryGeneratorTool,
    getUserInfo,
    emailFinderTool,
  };
}
