import { tool } from "ai";
import { z } from "zod";
import Exa from 'exa-js'
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

const PersonSchema = z.object({
  name: z.string().describe("Full legal name"),
  role: z.string().describe("Exact job title")
});

const PeopleResultSchema = z.object({
  people: z.array(PersonSchema).min(1).max(5)
});

export const peopleFinder = tool({
    description: "Finds key executives (CEO, Founders, VP) for a given company.",
    
    inputSchema: z.object({
      company: z.string().describe("Company name"),
      website: z.string().optional().describe("Company website domain (e.g. stripe.com)"),
    }),
    
    execute: async ({ company, website }, options) => {
      
      console.log("caling ppl finder tool")
      const env = ((options as any)?.env ?? process.env) as any; 
      
      if (!env?.EXA_API_KEY) {
        throw new Error("People finder - EXA_API_KEY is missing");
      }

      console.log("doing company research via exa");
      const exa = new Exa(env.EXA_API_KEY);

      const domain = website?.replace(/^www\./, '') || '';
      const queries = [
        `site:${domain} CEO OR founder OR CTO OR CFO OR COO OR president`,
        `site:${domain} leadership team executives management`,
        `site:${domain} about team`,
        `site:${domain} "leadership" OR "team" OR "executive"`,
      ];
      
      console.log("Queries are ", queries)
  
      const searchResults = await Promise.all(
        queries.map(async (q) => {
          try {
            return await exa.searchAndContents(
              q,
              {
                type: "fast",
                useAutoprompt: false,
                numResults: 5,
                text: { maxCharacters: 2000 }
              }
            );
          } catch (e) {
            console.error(`exa query failed for "${q}":`, e);
            return { results: [] }; 
          }
        })
      );
  
      let combinedContent = searchResults
        .flatMap(r => r.results || [])
        .map(r => `Source: ${r.title}\nURL: ${r.url}\nContent: ${r.text}`)
        .join("\n\n---\n\n");
  
      console.log(`[peopleFinder] Combined content length: ${combinedContent.length} chars`);
      console.log(`[peopleFinder] Content preview: ${combinedContent.substring(0, 500)}...`);
  
      if (!combinedContent || combinedContent.trim().length < 100) {
        console.warn("[peopleFinder] Insufficient content from search, trying fallback");
        try {
          const fallbackResult = await exa.searchAndContents(
            `"${company}" company information leadership`,
            {
              type: "fast",
              useAutoprompt: true,
              numResults: 5,
              text: { maxCharacters: 2000 }
            }
          );
          const fallbackContent = fallbackResult.results
            .map(r => `Source: ${r.title}\nURL: ${r.url}\nContent: ${r.text}`)
            .join("\n\n---\n\n");
          if (fallbackContent && fallbackContent.trim().length >= 100) {
            combinedContent = fallbackContent;
            console.log("[peopleFinder] Using fallback search results");
          }
        } catch (e) {
          console.error("[peopleFinder] Fallback search failed:", e);
        }
      }
  
      if (!combinedContent || combinedContent.trim().length < 100) {
        throw new Error(`No sufficient content found for ${company}. Search queries returned empty or insufficient results.`);
      }
  
      try {
        const { object } = await generateObject({
          // @ts-expect-error - openai function accepts apiKey option, same pattern used in prospector/emailfinder
          model: openai("gpt-4o-mini", { apiKey: env.OPENAI_API_KEY }),
          schema: PeopleResultSchema,
          prompt: `
          Extract current leadership for ${company}${domain ? ` (${domain})` : ''}.
        
          ${domain ? `CRITICAL: Only extract people from ${domain}. Ignore other companies with similar names.` : ''}
        
          Find up to 5 people. Prioritize: CEO/Founders > C-Suite > VPs > Directors.
          Exclude board members and investors.
          Scan the entire text before responding.
        
          CONTEXT:
          ${combinedContent}
        
          OUTPUT (no extra text):
          Name: [Name]
          Title: [Title]
        
          Name: [Name]
          Title: [Title]
        `,
        });
  
        const result = { people: object.people };
        console.log(`[peopleFinder] Successfully extracted ${result.people.length} people:`, JSON.stringify(result, null, 2));
        return result;
      } catch (error) {
        console.error("[peopleFinder] LLM extraction failed:", error);
        // Re-throw instead of returning empty array - let orchestrator handle it
        throw new Error(`Failed to extract people for ${company}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  });

