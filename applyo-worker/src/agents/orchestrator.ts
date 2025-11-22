import { Agent } from "agents";
import { openai } from "@ai-sdk/openai";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { getAgentByName } from "agents";
import { searchWeb, vectorizeSearch } from "../lib/tools"; 
import { extractDomain } from "../lib/utils";
import type { CloudflareBindings } from "../env.d";

class Orchestrator extends Agent<CloudflareBindings> {
  async onStart() {
    console.log('orchestrator agent started');
  }

  async onRequest(_request: Request): Promise<Response> {
    const body = await _request.json() as { query?: string };
    const query = body.query || "";

    if (!query) {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { 
          status: 400,
          headers: { "content-type": "application/json" }
        }
      );
    }

    const model = openai("gpt-4o-2024-11-20");

    const callPeopleFinder = tool({
      description: "find high-ranking people (executives, founders, c-suite) at a specific company via external search.",
      inputSchema: z.object({
        company: z.string().describe("company name (required)"),
        website: z.string().optional().describe("known company website url"),
        notes: z.string().optional().describe("context e.g. 'looking for cto'"),
      }),
      execute: async ({ company, website, notes }) => {
        try {
          const agent = await getAgentByName(this.env.PeopleFinder, "main");
          const requestBody: { company: string; website?: string; notes?: string } = { company };
          if (website) requestBody.website = website;
          if (notes) requestBody.notes = notes;
          
          const resp = await agent.fetch(
            new Request("http://internal", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            })
          );
          return await resp.json();
        } catch (error) {
          console.error("error calling PeopleFinder:", error);
          return { company, website: website || "", people: [], error: String(error) };
        }
      }
    });

    const callEmailFinder = tool({
      description: "find verified email addresses for a specific person at a company.",
      inputSchema: z.object({
        firstName: z.string(),
        lastName: z.string(),
        company: z.string(),
        domain: z.string(),
      }),
      execute: async ({ firstName, lastName, company, domain }) => {
        try {
          const agent = await getAgentByName(this.env.EmailFinder, "main");
          const resp = await agent.fetch(
            new Request("http://internal", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ firstName, lastName, company, domain }),
            })
          );
          return await resp.json();
        } catch (error) {
          console.error("error calling EmailFinder:", error);
          return { emails: [], error: String(error) };
        }
      }
    });

    const tools = { 
      callPeopleFinder, 
      callEmailFinder, 
      searchWeb, 
      vectorizeSearch 
    };

    const result = await generateText({
      model,
      tools,
      prompt: `You are an orchestrator that finds emails for people at companies.

Available tools:
1. **vectorizeSearch** - Semantic search of our INTERNAL database. Returns companies and employees.
2. **callPeopleFinder** - External search for executives/leaders.
3. **callEmailFinder** - External search for emails.
4. **searchWeb** - General web search (only for verification).

Decision flow:
1. **CRITICAL FIRST STEP**: Call **vectorizeSearch** with the user's query.
   - Check if the results contain the specific company and people requested.
   - If you find relevant people with emails in the vector results (looks like high confidence/score > 0.8), **STOP**. Do not call external tools. Format the JSON using the vector data and return immediately.
   
2. **IF Internal DB fails (no results or low relevance)**:
   - Extract company name and requirements from query.
   - Call **callPeopleFinder** to get names.
   - Derive domain (using **searchWeb** only if strictly necessary to confirm domain).
   - Call **callEmailFinder** for each person.

3. Return ONLY valid JSON with this structure:
{
  "company": "Company Name",
  "website": "https://company.com",
  "people": [
    {
      "name": "Full Name",
      "role": "Job Title",
      "emails": ["email1@domain.com"]
    }
  ]
}

Rules:
- If vector search gives you the data, USE IT. It is faster and cheaper.
- Only include people with at least one verified email.
- Return raw JSON only.

User query: ${query}`,
      toolChoice: "auto",
      stopWhen: stepCountIs(15)
    });

    let finalResult;
    try {
      let cleanText = result.text.trim();
      if (cleanText.startsWith('```json')) cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      else if (cleanText.startsWith('```')) cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');

      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanText = jsonMatch[0];

      finalResult = JSON.parse(cleanText);
      
      if (finalResult.people && Array.isArray(finalResult.people)) {
        finalResult.people = finalResult.people.filter((person: any) => 
          person.emails && Array.isArray(person.emails) && person.emails.length > 0
        );
      }
      
      if (!finalResult.people?.length) {
        return new Response(JSON.stringify({ message: "no emails found", state: this.state }), {
            headers: { "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: "parsing error" }), { status: 500 });
    }

    // favicon logic
    let favicon = null;
    if (finalResult.website) {
      const domain = extractDomain(finalResult.website);
      if (domain) favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }

    return new Response(
      JSON.stringify({ ...finalResult, favicon, state: this.state }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}

export default Orchestrator;