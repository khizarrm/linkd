import { tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

const PersonSchema = z.object({
  name: z.string().describe("Full name of the person"),
  role: z.string().describe("Job title - typically Founder, Co-Founder, or CEO"),
  source: z.string().describe("URL or description of where this info was found"),
});

const PeopleResultSchema = z.object({
  people: z.array(PersonSchema).max(2),
});

export const peopleFinder = tool({
  description: "Finds founders and CEOs for DTC beauty/makeup brands using Instagram metadata, LinkedIn, and beauty industry sources.",

  inputSchema: z.object({
    company: z.string().describe("Brand name"),
    website: z.string().describe("Brand domain without protocol, e.g., 'kosas.com'"),
  }),

  execute: async ({ company, website }, options) => {
    console.log(`[peopleFinder] Starting search for ${company} (${website})`);

    const env = ((options as any)?.env ?? process.env) as any;

    if (!env?.EXA_API_KEY) {
      throw new Error("peopleFinder - EXA_API_KEY is missing");
    }

    if (!env?.OPENAI_API_KEY) {
      throw new Error("peopleFinder - OPENAI_API_KEY is missing");
    }

    const exa = new Exa(env.EXA_API_KEY);
    const domain = website.replace(/^www\./, "");
    const searchesPerformed: string[] = [];
    let combinedContent = "";

    // Helper function to run a search and collect results
    async function runSearch(query: string, mode: "auto" | "neural" = "auto", numResults: number = 5): Promise<string> {
      console.log(`[peopleFinder] Searching: "${query}" (mode: ${mode})`);
      searchesPerformed.push(query);

      try {
        const result = await exa.searchAndContents(query, {
          type: mode,
          useAutoprompt: false,
          numResults,
          text: { maxCharacters: 1500 },
        });

        const content = result.results
          .map((r) => `Source: ${r.title}\nURL: ${r.url}\nContent: ${r.text || ""}`)
          .join("\n\n---\n\n");

        console.log(`[peopleFinder] Got ${result.results.length} results for "${query}"`);
        return content;
      } catch (error) {
        console.error(`[peopleFinder] Search failed for "${query}":`, error);
        return "";
      }
    }

    // Round 1: Instagram metadata searches
    console.log(`[peopleFinder] Round 1: Instagram metadata`);
    const round1Queries = [
      `site:instagram.com "${domain}"`,
      `"${company}" founder instagram`,
      `"${company}" CEO instagram beauty`,
    ];

    for (const query of round1Queries) {
      const content = await runSearch(query, "auto", 3);
      if (content) {
        combinedContent += content + "\n\n";
      }
    }

    // Check if we have enough content after Round 1
    if (combinedContent.length < 200) {
      // Round 2: Beauty industry sources
      console.log(`[peopleFinder] Round 2: Beauty industry sources`);
      const round2Queries = [
        `"${domain}" founder OR "founded by"`,
        `"${company}" founder beauty brand`,
        `site:linkedin.com/in "${company}" founder OR CEO`,
      ];

      for (const query of round2Queries) {
        const content = await runSearch(query, "auto", 5);
        if (content) {
          combinedContent += content + "\n\n";
        }
      }
    }

    // Check if we still need more content
    if (combinedContent.length < 200) {
      // Round 3: Press and news (deeper search)
      console.log(`[peopleFinder] Round 3: Press/news deep search`);
      const round3Queries = [
        `"${company}" beauty brand founder launch`,
        `"${company}" cosmetics CEO interview`,
        `site:glossy.co OR site:beautyindependent.com OR site:wwd.com "${company}"`,
      ];

      for (const query of round3Queries) {
        const content = await runSearch(query, "neural", 5);
        if (content) {
          combinedContent += content + "\n\n";
        }
      }
    }

    console.log(`[peopleFinder] Total content gathered: ${combinedContent.length} chars from ${searchesPerformed.length} searches`);

    // If still no content, return empty
    if (combinedContent.length < 100) {
      console.log(`[peopleFinder] Insufficient content found for ${company}`);
      return {
        people: [],
        searchesPerformed,
      };
    }

    // Extract people using LLM
    try {
      const { object } = await generateObject({
        // @ts-expect-error - openai function accepts apiKey option
        model: openai("gpt-4o-mini", { apiKey: env.OPENAI_API_KEY }),
        schema: PeopleResultSchema,
        prompt: `Extract the founder(s) and/or CEO for ${company} (website: ${domain}).

CRITICAL RULES:
1. This is a beauty/makeup/cosmetics brand - only extract people who founded or run THIS brand
2. Only include Founder, Co-Founder, or CEO roles
3. Do NOT include investors, board members, or celebrities who just endorse the brand
4. If a celebrity founded the brand, include them (e.g., Rihanna for Fenty, Halsey for About-Face)
5. Maximum 2 people (founder + co-founder, or founder + CEO)
6. Include the source URL where you found this information

CONTEXT:
${combinedContent}

Return only people you are confident actually founded or run ${company}.`,
      });

      console.log(`[peopleFinder] Extracted ${object.people.length} people:`, JSON.stringify(object.people, null, 2));

      return {
        people: object.people,
        searchesPerformed,
      };
    } catch (error) {
      console.error(`[peopleFinder] LLM extraction failed:`, error);
      return {
        people: [],
        searchesPerformed,
      };
    }
  },
});
