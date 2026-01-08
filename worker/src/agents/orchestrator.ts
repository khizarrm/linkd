import { Agent } from "agents";
import { openai } from "@ai-sdk/openai";
import { generateText, generateObject, tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";
import { extractDomainFromQuery, validateDomain } from "../lib/utils";
import type { CloudflareBindings } from "../env.d";
import { upsertCompany, upsertEmployee } from "../db/companies";
import { emailFinder } from "../tools";

// Schemas
const CompanyMetadataSchema = z.object({
  name: z.string().describe("Company name"),
  description: z.string().nullable().describe("Brief company description"),
  techStack: z.string().nullable().describe("Technologies used"),
  industry: z.string().nullable().describe("Industry/sector"),
  yearFounded: z.number().nullable().describe("Year founded"),
  headquarters: z.string().nullable().describe("HQ location"),
  revenue: z.string().nullable().describe("Revenue if public"),
  funding: z.string().nullable().describe("Funding stage/amount"),
  employeeCountMin: z.number().nullable().describe("Min employee count"),
  employeeCountMax: z.number().nullable().describe("Max employee count"),
});

const PersonSchema = z.object({
  name: z.string().describe("Full name"),
  role: z.string().describe("Job title"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe(
      "How confident we are this person works at this specific company",
    ),
});

const PeopleExtractionSchema = z.object({
  people: z.array(PersonSchema),
  needsMoreSearch: z
    .boolean()
    .describe("True if results seem wrong or insufficient"),
  reasoning: z.string().describe("Why these results are or aren't good"),
});

class Orchestrator extends Agent<CloudflareBindings> {
  private exa!: Exa;

  async onStart() {
    console.log("orchestrator agent started");
  }

  async onRequest(_request: Request): Promise<Response> {
    const body = (await _request.json()) as { query?: string };
    const query = body.query || "";

    if (!query) {
      return this.errorResponse("Query is required", 400);
    }

    const domain = extractDomainFromQuery(query);
    if (!domain) {
      return this.errorResponse("No valid domain found in query", 400);
    }

    const validation = await validateDomain(domain);
    if (!validation.valid) {
      return this.errorResponse(validation.error || "Domain is invalid", 400);
    }

    const cleanDomain = domain.toLowerCase().startsWith("www.")
      ? domain.substring(4)
      : domain;

    this.exa = new Exa(this.env.EXA_API_KEY);

    try {
      // Run the agentic loop
      const result = await this.runAgentLoop(cleanDomain);

      if (!result.people.length) {
        return this.errorResponse("No leadership found for this company", 404);
      }

      // Find emails for validated people
      const emailResult = (await emailFinder.execute(
        {
          people: result.people.map((p) => ({ name: p.name, role: p.role })),
          domain: cleanDomain,
        },
        { env: this.env } as any,
      )) as {
        people: Array<{ name: string; role: string; emails: string[] }>;
      };

      const peopleWithEmails = emailResult.people.filter(
        (p) => p.emails && p.emails.length > 0,
      );

      const finalResult = {
        company: result.metadata.name,
        website: `https://${cleanDomain}`,
        description: result.metadata.description,
        techStack: result.metadata.techStack,
        industry: result.metadata.industry,
        yearFounded: result.metadata.yearFounded,
        headquarters: result.metadata.headquarters,
        revenue: result.metadata.revenue,
        funding: result.metadata.funding,
        employeeCountMin: result.metadata.employeeCountMin,
        employeeCountMax: result.metadata.employeeCountMax,
        people: peopleWithEmails,
        favicon: `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`,
      };

      await this.saveToDatabase(finalResult, cleanDomain);
      return Response.json(finalResult);
    } catch (err) {
      console.error("[Orchestrator] Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return this.errorResponse(`Processing failed: ${errorMessage}`, 500);
    }
  }

  /**
   * The core agentic loop. Model researches, decides strategy, searches, validates.
   */
  private async runAgentLoop(domain: string) {
    // @ts-expect-error - openai function accepts apiKey option
    const model = openai("gpt-4o", { apiKey: this.env.OPENAI_API_KEY });

    // Create search tool for the agent
    const search = tool({
      description:
        "Search the web. Always include the domain in quotes for company-specific searches.",
      inputSchema: z.object({
        query: z.string().describe("Search query"),
        numResults: z.number().optional().default(5),
      }),
      execute: async ({ query, numResults }) => {
        console.log(`[Search] ${query}`);
        try {
          const result = await this.exa.searchAndContents(query, {
            type: "auto",
            useAutoprompt: false,
            numResults: numResults || 5,
            text: { maxCharacters: 1500 },
          });
          return result.results.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.text?.substring(0, 1500) || "",
          }));
        } catch (e) {
          console.error(`[Search] Failed: ${e}`);
          return [];
        }
      },
    });

    // Step 1: Research the company
    console.log(`[Orchestrator] Step 1: Researching company`);
    const researchResult = await generateText({
      model,
      tools: { search },
      // @ts-expect-error - maxToolRoundtrips is valid but not in types
      maxToolRoundtrips: 3,
      system: `You are researching a company to understand what it is and where to find leadership info.
Your goal is to understand:
1. What does this company do?
2. Is it a startup (YC, funded) or established company?
3. What sources would have their leadership info? (LinkedIn, Crunchbase, their website, news articles?)

IMPORTANT: Always search with "${domain}" in quotes to avoid confusion with similarly-named companies.`,
      prompt: `Research the company at ${domain}.

Search for:
1. "${domain}" company - to understand what they do
2. "${domain}" founders OR leadership - to find where leadership info exists

Summarize what you learned and where leadership info might be found.`,
    });

    console.log(
      `[Orchestrator] Research complete: ${researchResult.text.substring(0, 200)}...`,
    );
    console.log(`[Orchestrator] Steps count: ${researchResult.steps.length}`);
    if (researchResult.steps.length > 0) {
      const firstStep = researchResult.steps[0] as any;
      console.log(`[Orchestrator] First step keys:`, Object.keys(firstStep));
      if (firstStep.toolCalls) {
        console.log(
          `[Orchestrator] Tool calls count: ${firstStep.toolCalls.length}`,
        );
        if (firstStep.toolCalls.length > 0) {
          console.log(
            `[Orchestrator] First tool call keys:`,
            Object.keys(firstStep.toolCalls[0]),
          );
        }
      }
      if (firstStep.toolResults) {
        console.log(
          `[Orchestrator] Tool results count: ${firstStep.toolResults.length}`,
        );
        if (firstStep.toolResults.length > 0) {
          console.log(
            `[Orchestrator] First tool result keys:`,
            Object.keys(firstStep.toolResults[0]),
          );
          const firstResult = firstStep.toolResults[0];
          if (firstResult.result) {
            console.log(
              `[Orchestrator] First tool result.result type:`,
              typeof firstResult.result,
            );
            console.log(
              `[Orchestrator] First tool result.result (first 200 chars):`,
              JSON.stringify(firstResult.result).substring(0, 200),
            );
          }
        }
      }
    }

    // Step 2: Extract metadata from research
    // In AI SDK v5, tool results are in toolResults array with 'output' property
    const metadataContext = researchResult.steps
      .flatMap((s: any) => {
        const toolResults = s.toolResults || [];

        // Extract results from toolResults - use 'output' not 'result'
        return toolResults
          .map((tr: any) => {
            const output = tr.output;
            if (Array.isArray(output)) {
              return output;
            }
            if (output && typeof output === "object") {
              return [output];
            }
            return [];
          })
          .flat();
      })
      .filter((r: any) => r && typeof r === "object" && (r.title || r.content))
      .map((r: any) => `${r.title || "No title"}\n${r.content || ""}`)
      .join("\n\n");

    const { object: metadata } = await generateObject({
      // @ts-expect-error - openai function accepts apiKey option
      model: openai("gpt-4o-mini", { apiKey: this.env.OPENAI_API_KEY }),
      schema: CompanyMetadataSchema,
      prompt: `Extract company metadata for ${domain} from this research. Use null for unknown fields.

Context:
${metadataContext || researchResult.text}`,
    });

    console.log(`[Orchestrator] Metadata extracted: ${metadata.name}`);

    // Step 3: Find people with strategic searching
    console.log(`[Orchestrator] Step 2: Finding leadership`);
    const peopleResult = await generateText({
      model,
      tools: { search },
      // @ts-expect-error - maxToolRoundtrips is valid but not in types
      maxToolRoundtrips: 5,
      system: `You are finding the leadership team for ${metadata.name || domain} (website: ${domain}).

CRITICAL RULES:
1. ALWAYS include "${domain}" in quotes in your searches to avoid wrong companies
2. Search LinkedIn, Crunchbase, news articles - not just their website
3. Verify each person actually works at THIS company, not a similarly-named one
4. If initial results look wrong (wrong company), try different search strategies

Good search examples:
- "${domain}" CEO founder
- site:linkedin.com/in "${domain}"
- site:crunchbase.com "${domain}"
- "${metadata.name}" "${domain}" leadership team

Bad searches (will get wrong results):
- ${metadata.name} CEO (too ambiguous if common name)
- site:${domain} team (might not have leadership page)`,
      prompt: `Find the founders and leadership team for ${metadata.name || domain} (${domain}).

Start by searching:
1. "${domain}" founders CEO
2. site:linkedin.com/in "${domain}"
3. site:crunchbase.com/organization "${domain.replace(/\.(com|ai|io|co)$/, "")}"

After each search, evaluate: do these results look like they're about the RIGHT company?
If not, try a different approach.`,
    });

    // Step 4: Extract and validate people
    const peopleContext = peopleResult.steps
      .flatMap((s: any) => {
        const toolResults = s.toolResults || [];

        // Extract results from toolResults - use 'output' not 'result'
        return toolResults
          .map((tr: any) => {
            const output = tr.output;
            if (Array.isArray(output)) {
              return output;
            }
            if (output && typeof output === "object") {
              return [output];
            }
            return [];
          })
          .flat();
      })
      .filter((r: any) => r && typeof r === "object" && (r.title || r.content))
      .map(
        (r: any) =>
          `Source: ${r.title || "No title"}\nURL: ${r.url || "No URL"}\n${r.content || ""}`,
      )
      .join("\n\n---\n\n");

    console.log(
      `[Orchestrator] Extracting people from ${peopleContext.length} chars of context`,
    );

    // Validate we have real context - if not, return empty people array
    if (peopleContext.length < 100) {
      console.log(
        `[Orchestrator] WARNING: Insufficient context (${peopleContext.length} chars), skipping people extraction`,
      );
      return {
        metadata,
        people: [],
      };
    }

    const { object: extraction } = await generateObject({
      model,
      schema: PeopleExtractionSchema,
      prompt: `Extract leadership for ${metadata.name || domain} (website: ${domain}).

CRITICAL: Only include people who DEFINITELY work at ${domain}.
- Check URLs - linkedin.com profiles should mention ${domain}
- Check context - does it clearly say they work at this company?
- If unsure, mark confidence as "low"

Prioritize: CEO/Founders > C-Suite > VPs > Directors
Exclude: Board members, investors, advisors

Context:
${peopleContext}

For each person, assess confidence:
- HIGH: URL contains ${domain} or explicitly states they work there
- MEDIUM: Context suggests they work there but not 100% clear
- LOW: Might be wrong company or outdated`,
    });

    console.log(
      `[Orchestrator] Extracted ${extraction.people.length} people, needsMoreSearch: ${extraction.needsMoreSearch}`,
    );
    console.log(`[Orchestrator] Reasoning: ${extraction.reasoning}`);

    // Validate: If we extracted people but had no real context, they're hallucinations
    if (extraction.people.length > 0 && peopleContext.length < 100) {
      console.log(
        `[Orchestrator] WARNING: People extracted from insufficient context (${peopleContext.length} chars), rejecting as hallucinations`,
      );
      return {
        metadata,
        people: [],
      };
    }

    // Step 5: If needed, do targeted validation searches
    if (
      extraction.needsMoreSearch ||
      extraction.people.every((p) => p.confidence === "low")
    ) {
      console.log(`[Orchestrator] Step 3: Validating with additional searches`);

      const validationResult = await generateText({
        model,
        tools: { search },
        // @ts-expect-error - maxToolRoundtrips is valid but not in types
        maxToolRoundtrips: 3,
        prompt: `The previous search for ${domain} leadership may have wrong results.

Previous findings (possibly wrong):
${extraction.people.map((p) => `- ${p.name}: ${p.role} (confidence: ${p.confidence})`).join("\n")}

Reasoning: ${extraction.reasoning}

Try these targeted searches to find the CORRECT leadership:
1. "${domain}" "founded by" OR "co-founded"
2. "${domain}" announcement funding team
3. site:techcrunch.com OR site:ycombinator.com "${domain}"

Report what you find.`,
      });

      // Re-extract with validation context
      const validationContext = validationResult.steps
        .flatMap((s: any) => {
          const toolResults = s.toolResults || [];

          // Extract results from toolResults - use 'output' not 'result'
          return toolResults
            .map((tr: any) => {
              const output = tr.output;
              if (Array.isArray(output)) {
                return output;
              }
              if (output && typeof output === "object") {
                return [output];
              }
              return [];
            })
            .flat();
        })
        .filter(
          (r: any) => r && typeof r === "object" && (r.title || r.content),
        )
        .map((r: any) => `${r.title || "No title"}\n${r.content || ""}`)
        .join("\n\n");

      if (validationContext.length > 100) {
        const { object: validatedExtraction } = await generateObject({
          model,
          schema: PeopleExtractionSchema,
          prompt: `Re-extract leadership for ${domain} with this additional validation context.

Previous uncertain findings:
${extraction.people.map((p) => `- ${p.name}: ${p.role}`).join("\n")}

New validation context:
${validationContext}

Original context:
${peopleContext}

Only include people you're confident about now.`,
        });

        // Use validated results if better
        if (
          validatedExtraction.people.filter((p) => p.confidence !== "low")
            .length >
          extraction.people.filter((p) => p.confidence !== "low").length
        ) {
          return {
            metadata,
            people: validatedExtraction.people.filter(
              (p) => p.confidence !== "low",
            ),
          };
        }
      }
    }

    // Return high/medium confidence people
    const confidentPeople = extraction.people.filter(
      (p) => p.confidence !== "low",
    );

    // Final validation: Only return people if we had real context to extract from
    const finalPeople =
      confidentPeople.length > 0
        ? confidentPeople
        : extraction.people.slice(0, 3);

    if (finalPeople.length > 0 && peopleContext.length < 100) {
      console.log(
        `[Orchestrator] WARNING: Final validation failed - people extracted from insufficient context (${peopleContext.length} chars), returning empty`,
      );
      return {
        metadata,
        people: [],
      };
    }

    return {
      metadata,
      people: finalPeople,
    };
  }

  private async saveToDatabase(result: any, domain: string) {
    try {
      const companyName = result.company || domain;
      if (companyName && companyName.trim() !== "") {
        await upsertCompany(this.env.DB, companyName, result.website, {
          description: result.description,
          techStack: result.techStack,
          industry: result.industry,
          yearFounded: result.yearFounded,
          headquarters: result.headquarters,
          revenue: result.revenue,
          funding: result.funding,
          employeeCountMin: result.employeeCountMin,
          employeeCountMax: result.employeeCountMax,
        });

        for (const person of result.people) {
          if (person.emails?.length > 0) {
            await upsertEmployee(
              this.env.DB,
              companyName,
              person.name,
              person.role,
              person.emails[0],
            );
          }
        }
      }
    } catch (dbError) {
      console.error("[Orchestrator] DB error:", dbError);
    }
  }

  private errorResponse(message: string, status: number) {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export default Orchestrator;
