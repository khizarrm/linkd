import { Agent } from "agents";
import { openai } from "@ai-sdk/openai";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { vectorizeSearch } from "../lib/tools";
import type { CloudflareBindings } from "../env.d";

class FinderV2 extends Agent<CloudflareBindings> {
  async onStart() {
    console.log('Researcher agent started');
  }

  async onRequest(_request: Request): Promise<Response> {
    const body = await _request.json() as { query?: string };
    const query = body.query || "";

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // @ts-expect-error - openai function accepts apiKey option
    const model = openai("gpt-4o", {
      apiKey: this.env.OPENAI_API_KEY,
    });

    const vectorizeSearchTool = tool({
      description: vectorizeSearch.description,
      inputSchema: vectorizeSearch.inputSchema,
      execute: async (params) => {
        return await vectorizeSearch.execute(params, { env: this.env } as any);
      }
    });

    const tools = { vectorizeSearch: vectorizeSearchTool };

    const prompt = `You are a smart research assistant that helps users find information about companies and employees. Users call to you with the intent to either find companies that align with their interests,
    or to find emails at specific companies. The goal is for the user to find these emails to reach out to for internship oppurtunities. 
    
    You can speak like a normal person btw, no need to be super formal, just have the imporant info. 

**Phase 1: Analyze & Configure Search**
1. **Determine "type":**
   - "people at X", "emails for X", "employees" → use "type='employees'"
   - "companies like X", "startups in Y", "industry search" → use "type='companies'"
   - Specific company name (e.g., "Anthropic", "Artificial Societies") → use "type='both'" (to get profile + emails)
   - Ambiguous → use "type='both'"

2. **Determine "limit:**"
   - **ALWAYS use "limit: 5" to "10"**, even for single company queries.
   - *Reasoning:* Vector search is fuzzy. The exact match might be result #3. We must fetch a batch to ensure we catch it, then filter later.

**Phase 2: Strict Filtering (Internal Thought Process)**
- **For Specific Entity Queries (e.g., "Artificial Societies"):**
  - Scan the results. Is there an exact or near-exact name match?
  - **IF YES:** Discard all other results. ONLY report on that one company. Do not show "similar" companies unless the user asked for comparisons.
  - **IF NO:** Report that the specific company wasn't found, and offer the similar matches found as alternatives.
- **For Broad Queries (e.g., "AI companies"):**
  - Keep all relevant results.

**Phase 3: Synthesize Response**
- **Company Info:** Name, one-sentence description, location, tech stack.
- **Emails/People:** consistently check "employees" array and list names + emails.
- **Format:** Clean, concise, conversational. No formatting clutter.

User query: ${query}

User query: ${query}`;

    try {
      const result = streamText({
        model,
        tools,
        prompt,
        toolChoice: "auto",
        stopWhen: stepCountIs(10),
      });

      return result.toTextStreamResponse({
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    } catch (error) {
      console.error("Researcher agent error:", error);
      return new Response(
        JSON.stringify({
          query: query,
          summary: "",
          error: "Failed to complete research",
          errorMessage: error instanceof Error ? error.message : String(error),
          state: this.state,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
}

export default FinderV2;

