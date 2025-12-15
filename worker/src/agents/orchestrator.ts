import { Agent } from "agents";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { searchWeb, peopleFinder, emailFinder } from "../tools";
import { extractDomain, validateDomain, extractDomainFromQuery } from "../lib/utils";
import type { CloudflareBindings } from "../env.d";
import { upsertCompany, upsertEmployee } from "../db/companies";

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

class Orchestrator extends Agent<CloudflareBindings> {
  async onStart() {
    console.log("orchestrator agent started");
  }

  async onRequest(_request: Request): Promise<Response> {
    const body = (await _request.json()) as { query?: string };
    const query = body.query || "";

    if (!query) {
      return this.errorResponse("Query is required", 400);
    }

    // 1. Extract and validate domain
    const domain = extractDomainFromQuery(query);
    if (!domain) {
      return this.errorResponse("No valid domain found in query. Please include a website URL or domain name (e.g., 'example.com' or 'https://example.com').", 400);
    }

    console.log(`[Orchestrator] Processing domain: ${domain}`);

    const validation = await validateDomain(domain);
    if (!validation.valid) {
      return this.errorResponse(validation.error || "Domain is invalid", 400);
    }

    try {
      // 2. Get company metadata via search + LLM extraction
      const metadata = await this.getCompanyMetadata(domain);
      console.log(`[Orchestrator] Metadata:`, metadata);

      // 3. Find people (deterministic)
      const peopleResult = (await peopleFinder.execute(
        { company: metadata.name || domain, website: domain },
        { env: this.env } as any
      )) as { people: Array<{ name: string; role: string }> };
      console.log(`[Orchestrator] Found ${peopleResult.people.length} people`);

      if (!peopleResult.people.length) {
        return this.errorResponse("No leadership found for this company. We couldn't find any executives or decision-makers.", 404);
      }

      // 4. Find emails for all people (deterministic)
      const emailResult = (await emailFinder.execute(
        { people: peopleResult.people, domain },
        { env: this.env } as any
      )) as {
        domain: string;
        people: Array<{ name: string; role: string; emails: string[] }>;
        summary: string;
      };
      console.log(`[Orchestrator] Email results: ${emailResult.summary}`);

      // 5. Filter to people with valid emails
      const peopleWithEmails = emailResult.people.filter(
        (p) => p.emails && p.emails.length > 0
      );

      if (!peopleWithEmails.length) {
        return Response.json({
          message: "No verified emails found",
          company: metadata.name,
          website: `https://${domain}`,
          people: peopleResult.people.map(p => ({ name: p.name, role: p.role })),
        });
      }

      // 6. Build final result
      const result = {
        company: metadata.name,
        website: `https://${domain}`,
        description: metadata.description,
        techStack: metadata.techStack,
        industry: metadata.industry,
        yearFounded: metadata.yearFounded,
        headquarters: metadata.headquarters,
        revenue: metadata.revenue,
        funding: metadata.funding,
        employeeCountMin: metadata.employeeCountMin,
        employeeCountMax: metadata.employeeCountMax,
        people: peopleWithEmails,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      };

      await this.saveToDatabase(result, domain);

      return Response.json(result);
    } catch (err) {
      console.error("[Orchestrator] Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return this.errorResponse(`Processing failed: ${errorMessage}`, 500);
    }
  }

  private async getCompanyMetadata(domain: string) {
    // Search for company info
    const searchResult = (await searchWeb.execute(
      { query: `${domain} company revenue funding headquarters employees` },
      { env: this.env } as any
    )) as { results: Array<{ title: string; url: string; content: string }> };

    const context = searchResult.results
      .map((r) => `${r.title}\n${r.content}`)
      .join("\n\n");

    if (!context) {
      return {
        name: domain,
        description: null,
        techStack: null,
        industry: null,
        yearFounded: null,
        headquarters: null,
        revenue: null,
        funding: null,
        employeeCountMin: null,
        employeeCountMax: null,
      };
    }

    // Extract structured metadata via LLM
    const { object } = await generateObject({
      // @ts-expect-error - openai function accepts apiKey option
      model: openai("gpt-4o-mini", { apiKey: this.env.OPENAI_API_KEY }),
      schema: CompanyMetadataSchema,
      prompt: `
        Extract company metadata for ${domain} from this context.
        Only include information explicitly mentioned. Use null for unknown fields.
        
        Context:
        ${context}
      `,
    });

    return object;
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
              person.emails[0]
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