import { tool } from "@openai/agents";
import { z } from "zod";
import OpenAI from "openai";
import { QueryGeneratorOutput } from "./types";

const openai = new OpenAI();

export const queryGeneratorTool = tool({
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
    const completion = await openai.chat.completions.create({
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
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return QueryGeneratorOutput.parse(result);
  },
});