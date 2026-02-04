import { tool } from "@openai/agents";
import { z } from "zod";
import { QueryGeneratorOutput } from "./types";
import type { CloudflareBindings } from "../../env.d";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { users } from "../../db/auth.schema";
import { schema } from "../../db";

export function createTools(env: CloudflareBindings, clerkUserId: string) {
  const queryGeneratorTool = tool({
    name: "generate_search_queries",
    description: "Generate optimized search queries to find people",
    parameters: z.object({
      request: z
        .string()
        .describe(
          "Full description of what kind of people to find, including company, role, location, and user info",
        ),
    }),
    strict: true,
    execute: async ({ request }) => {
      console.log("running with: ", request);
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
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
        },
      );

      const completion = (await response.json()) as {
        choices: [{ message: { content: string } }];
      };
      const result = JSON.parse(completion.choices[0].message.content || "{}");
      console.log("output: ", result);
      return QueryGeneratorOutput.parse(result);
    },
  });

  const getUserInfo = tool({
    name: "get_user_info",
    description:
      "Get information about the user preferences. includes location, role, and interests.",
    parameters: z.object({}),
    execute: async () => {
      const db = drizzle(env.DB, { schema });
      const user = await db.query.users.findFirst({
        where: eq(users.clerkUserId, clerkUserId),
      });

      if (!user || !user.info) {
        return "No user info available. The user has not filled in their profile yet, please ask them to do so to continue.";
      }

      return `**User Profile**\n\n${user.info}`;
    },
  });

  async function verifyEmail(email: string): Promise<string> {
    const apiKey = "e8f1d1eee4e444e996351966d451dfd6";
    if (!apiKey) {
      throw new Error("ZEROBOUNCE_API_KEY not set");
    }

    const url = `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}`;

    const response = await fetch(url);
    console.log("response is: ", response);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ZeroBounce API error (${response.status}): ${text}`);
    }

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
      domain: z
        .string()
        .describe(
          "Company domain (e.g., 'stripe.com'). Be careful with these, they can be locaion based too if the company is large (eg. ca.ibm.com).",
        ),
      knownPattern: z
        .string()
        .describe(
          "Known email from company to infer pattern (e.g., 'john.doe@company.com'). Pass empty string if unknown.",
        ),
    }),
    strict: true,
    execute: async ({ name, company, domain, knownPattern }) => {
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
        `${last}@${cleanDomain}`,
        `${first}${last}@${cleanDomain}`,
        `${first}_${last}@${cleanDomain}`,
        `${firstInitial}${last}@${cleanDomain}`,
        `${first}@${cleanDomain}`,
      );

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
