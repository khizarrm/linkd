import { Agent } from "agents";
import { openai } from "@ai-sdk/openai";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { getAgentByName } from "agents";
import { searchWeb } from "../lib/tools";
import { extractDomain, normalizeUrl } from "../lib/utils";
import type { CloudflareBindings } from "../env.d";

class Orchestrator extends Agent<CloudflareBindings> {
  async onStart() {
    console.log('Orchestrator agent started');
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

    const model = openai("gpt-4o-2024-11-20");

    // Tools for calling other agents
    const callPeopleFinder = tool({
      description: "Find high-ranking people (executives, founders, C-suite) at a specific company. Returns company name, website, and 3 people with their names and roles. You can provide additional context like known website or notes to help with the search.",
      inputSchema: z.object({
        company: z.string().describe("Company name (required)"),
        website: z.string().optional().describe("Known company website URL (optional, helps improve search accuracy)"),
        notes: z.string().optional().describe("Additional context or notes about the company or search requirements (optional, e.g., 'focus on founders', 'tech company', 'looking for CTO')"),
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
          const result = await resp.json();
          console.log("PeopleFinder result:", result);
          return result;
        } catch (error) {
          console.error("Error calling PeopleFinder:", error);
          return { 
            company: company,
            website: website || "",
            people: [], 
            error: error instanceof Error ? error.message : String(error) 
          };
        }
      }
    });

    const callEmailFinder = tool({
      description: "Find email addresses for a specific person at a company. Returns verified emails.",
      inputSchema: z.object({
        firstName: z.string().describe("Person's first name"),
        lastName: z.string().describe("Person's last name"),
        company: z.string().describe("Company name"),
        domain: z.string().describe("Company domain (e.g., datacurve.com)"),
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
          const result = await resp.json();
          console.log("EmailFinder result:", result);
          return result;
        } catch (error) {
          console.error("Error calling EmailFinder:", error);
          return { 
            emails: [], 
            error: error instanceof Error ? error.message : String(error) 
          };
        }
      }
    });

    const tools = { callPeopleFinder, callEmailFinder, searchWeb };

    const result = await generateText({
      model,
      tools,
      prompt: `You are an orchestrator that finds emails for people at companies.

Available tools:
1. **callPeopleFinder** - Find executives/leaders at a specific company (returns company name, website, and 3 people with name and role). You can optionally provide:
   - website: If the company website is known from the query or previous searches, pass it to improve accuracy
   - notes: Additional context about the company if the name isnt enough
2. **callEmailFinder** - Find email addresses for a specific person (needs firstName, lastName, company, domain)
3. **searchWeb** - Run web searches (only use this when a specific person is already provided, to confirm company websites/domains and validate that the person truly works there)

Decision flow:
1. Always extract the company name from the query.
2. Extract any known website URL from the query if mentioned (e.g., "datacurve.com" or "https://datacurve.com").
3. Extract any role-specific requirements or notes from the query (e.g., "founders", "CTO", "executives").
4. Check if the user already named at least one specific person.
   - If a person is provided (e.g., "serena ge from datacurve"), **do not** call callPeopleFinder. Instead, use the available info plus searchWeb (this is the only time you may call searchWeb) to gather any missing details (website/domain, role confirmation) and then call callEmailFinder directly.
   - If no person is provided (e.g., "find founder emails at datacurve"), call callPeopleFinder with:
     - company: the company name
     - website: if known from the query
     - notes: if there are specific role requirements (e.g., "focus on founders and C-suite executives")
5. For every person you need emails for:
   - Split their name into firstName and lastName.
   - Use any known website/domain (from the query or PeopleFinder) to derive the domain (e.g., "https://datacurve.com" -> "datacurve.com").
   - If no website is available and a specific person was provided, first run searchWeb (only once per person if needed) to confirm the domain. If searchWeb cannot find it, infer the domain from the company name (e.g., "datacurve" -> "datacurve.com") and note when it is inferred. If no person was provided, do not call searchWeb—fall back to inference only after PeopleFinder fails to supply a website.
   - Call callEmailFinder with firstName, lastName, company, domain to verify emails.
6. Return ONLY valid JSON with this structure (IMPORTANT: preserve the website field from callPeopleFinder if available):
{
  "company": "Company Name",
  "website": "https://company.com",
  "people": [
    {
      "name": "Full Name",
      "role": "Job Title",
      "emails": ["email1@domain.com", "email2@domain.com"]
    }
  ]
}

If the user asks for specific roles (e.g., "founder", "CEO"), only include people matching those roles.

CRITICAL RULES:
- Return ONLY the JSON object, no markdown code blocks, no explanations
- If callPeopleFinder returns no people, return {"company": "...", "people": []}
- **ONLY include people who have at least one verified email** - do NOT include people with empty emails arrays
- If callEmailFinder returns no emails for a person, exclude them from the response entirely
- Always return valid JSON that can be parsed

User query: ${query}`,
      toolChoice: "auto",
      stopWhen: stepCountIs(15)
    });

    let finalResult;
    try {
      let cleanText = result.text.trim();
      
      // Remove markdown code blocks if present
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Extract JSON object
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      }

      console.log("Cleaned text for parsing:", cleanText);
      finalResult = JSON.parse(cleanText);
      
      // Filter out people without verified emails
      if (finalResult.people && Array.isArray(finalResult.people)) {
        finalResult.people = finalResult.people.filter((person: any) => {
          return person.emails && Array.isArray(person.emails) && person.emails.length > 0;
        });
      }
      
      // If no people with emails found, return simple response
      if (!finalResult.people || !Array.isArray(finalResult.people) || finalResult.people.length === 0) {
        return new Response(
          JSON.stringify({
            message: "no emails found",
            state: this.state,
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      console.error("Raw text response:", result.text);
      finalResult = {
        company: "Unknown",
        people: [],
        error: "Failed to parse response",
        rawText: result.text,
        parseError: e instanceof Error ? e.message : String(e)
      };
    }

    // Add favicon to response
    let favicon = null;
    const website = finalResult.website || "";

    if (website) {
      const domain = extractDomain(website);
      if (domain) {
        favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      }
    }

    return new Response(
      JSON.stringify({
        ...finalResult,
        favicon,
        state: this.state,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  async checkPeopleInDB(companyName: string) {
    try {
      const results = await this.env.DB.prepare(`
        SELECT DISTINCT company_name, website, employee_name, employee_title 
        FROM companies 
        WHERE LOWER(company_name) = LOWER(?)
      `).bind(companyName).all<{
        company_name: string;
        website: string | null;
        employee_name: string;
        employee_title: string;
      }>();
      
      if (!results.results || results.results.length === 0) {
        return null;
      }
      
      // Format to match PeopleFinder response
      return {
        company: results.results[0].company_name,
        website: normalizeUrl(results.results[0].website) || "",
        people: results.results.map(row => ({
          name: row.employee_name,
          role: row.employee_title || ""
        }))
      };
    } catch (error) {
      console.error("Error checking people in DB:", error);
      return null;
    }
  }

  async checkEmailsInDB(employeeName: string, companyName: string) {
    try {
      const result = await this.env.DB.prepare(`
        SELECT email, employee_title, company_name, website 
        FROM companies 
        WHERE LOWER(employee_name) = LOWER(?) AND LOWER(company_name) = LOWER(?)
        LIMIT 1
      `).bind(employeeName, companyName).first<{
        email: string;
        employee_title: string;
        company_name: string;
        website: string | null;
      }>();
      
      if (!result) {
        return null;
      }
      
      // Parse email JSON array
      let emails: string[] = [];
      try {
        emails = JSON.parse(result.email);
        if (!Array.isArray(emails)) {
          emails = [result.email];
        }
      } catch {
        emails = [result.email];
      }
      
      // Format to match EmailFinder response
      return {
        emails,
        company_name: result.company_name,
        website: normalizeUrl(result.website) || "",
        employee_name: employeeName,
        employee_title: result.employee_title || "",
        verification_summary: `${emails.length} out of ${emails.length} emails verified`
      };
    } catch (error) {
      console.error("Error checking emails in DB:", error);
      return null;
    }
  }
}

export default Orchestrator;
