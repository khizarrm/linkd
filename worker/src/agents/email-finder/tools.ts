import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";
import type { CloudflareBindings } from "../../env.d";

async function verifyEmail(email: string): Promise<string> {
  const apiKey = "e8f1d1eee4e444e996351966d451dfd6";
  if (!apiKey) {
    throw new Error("ZEROBOUNCE_API_KEY not set");
  }

  const url = `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}`;

  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ZeroBounce API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { status: string };
  return data.status;
}

export function createEmailFinderTools(env: CloudflareBindings) {
  const patternEmailFinder = tool({
    description: "Generate and verify email patterns for a person at a company. Fast first attempt.",
    inputSchema: z.object({
      name: z.string().describe("Person's full name"),
      domain: z.string().describe("Company domain (e.g., 'stripe.com')"),
    }),
    execute: async ({ name, domain }) => {
      console.log(`[patternEmailFinder] Trying patterns for ${name} @ ${domain}`);
      
      const cleanDomain = domain.replace(/^www\./, "").toLowerCase();
      const parts = name.trim().split(/\s+/);
      const first = parts[0]?.toLowerCase() || "";
      const last = parts[parts.length - 1]?.toLowerCase() || "";
      const firstInitial = first[0] || "";

      const patterns = [
        `${first}.${last}@${cleanDomain}`,
        `${last}@${cleanDomain}`,
        `${first}${last}@${cleanDomain}`,
        `${first}_${last}@${cleanDomain}`,
        `${firstInitial}${last}@${cleanDomain}`,
        `${first}@${cleanDomain}`,
        `${first}-${last}@${cleanDomain}`,
      ];

      console.log(`[patternEmailFinder] Testing ${patterns.length} patterns`);

      for (const email of patterns) {
        try {
          const status = await verifyEmail(email);
          console.log(`[patternEmailFinder] ${email} → ${status}`);
          
          if (status === "valid") {
            return { 
              success: true, 
              email, 
              pattern: email.split("@")[0], 
              verificationStatus: "verified",
              method: "pattern"
            };
          } else if (status === "catch-all" || status === "catch_all" || status === "acceptable") {
            return { 
              success: true, 
              email, 
              pattern: email.split("@")[0], 
              verificationStatus: "possible",
              method: "pattern"
            };
          }
        } catch (error) {
          console.error(`[patternEmailFinder] Failed to verify ${email}:`, error);
        }
      }

      console.log(`[patternEmailFinder] No valid email found via patterns`);
      return { 
        success: false, 
        email: null, 
        pattern: null, 
        verificationStatus: null,
        method: "pattern"
      };
    },
  });

  const researchEmailFinder = tool({
    description: `Research emails via web search. Use ONLY when pattern finder fails. MAX 3 research attempts allowed per request.`,
    inputSchema: z.object({
      name: z.string().describe("Person's full name"),
      company: z.string().describe("Company name"),
      domain: z.string().describe("Company domain"),
      attemptNumber: z.number().describe("Current research attempt (1-3)"),
      previousQueries: z.array(z.string()).describe("Previous search queries used"),
    }),
    execute: async ({ name, company, domain, attemptNumber, previousQueries }) => {
      console.log(`[researchEmailFinder] Attempt ${attemptNumber}/3 for ${name} @ ${company}`);
      
      if (attemptNumber > 3) {
        return { 
          success: false, 
          email: null, 
          reason: "Max research attempts (3) reached",
          method: "research"
        };
      }

      const tvly = tavily({ apiKey: env.TAVILY_API_KEY });
      const cleanDomain = domain.replace(/^www\./, "").toLowerCase();
      
      const queries: string[] = [];
      
      if (attemptNumber === 1) {
        queries.push(
          `"${name}" "${company}" email contact`,
          `"${name}" "${cleanDomain}" email`,
          `"${name}" "${company}" contact info`
        );
      } else if (attemptNumber === 2) {
        queries.push(
          `"${name}" "${company}" @${cleanDomain}`,
          `site:${cleanDomain} "${name}"`,
          `"${name}" "${company}" linkedin email`
        );
      } else {
        queries.push(
          `"${name}" "${company}" OR "${cleanDomain}" email OR contact`,
          `"${name}" founder OR executive "${company}"`
        );
      }

      const newQueries = queries.filter(q => !previousQueries.includes(q));
      
      if (newQueries.length === 0) {
        return {
          success: false,
          email: null,
          reason: `No new queries for attempt ${attemptNumber}`,
          method: "research"
        };
      }

      console.log(`[researchEmailFinder] Queries: ${newQueries.join(" | ")}`);

      for (const query of newQueries) {
        try {
          const response = await tvly.search(query, {
            searchDepth: "advanced",
            maxResults: 5,
            includeRawContent: true,
          });

          console.log(`[researchEmailFinder] Query "${query}" returned ${response.results.length} results`);

          const emailRegex = new RegExp(`\\b[\\w.-]+@${cleanDomain.replace(/\./g, "\\.")}\\b`, "gi");
          const nameParts = name.toLowerCase().split(/\s+/);
          const firstName = nameParts[0];
          const lastName = nameParts[nameParts.length - 1];

          for (const result of response.results) {
            const content = result.rawContent || result.content || "";
            const matches = content.match(emailRegex);

            if (matches) {
              const candidateEmails = matches.filter(email => {
                const local = email.split("@")[0].toLowerCase();
                return local.includes(firstName) || 
                       local.includes(lastName) ||
                       local.includes(firstName[0] + lastName);
              });

              for (const email of candidateEmails) {
                try {
                  const status = await verifyEmail(email);
                  console.log(`[researchEmailFinder] Found email ${email} → ${status}`);
                  
                  if (status === "valid" || status === "catch-all" || status === "acceptable") {
                    return {
                      success: true,
                      email,
                      verificationStatus: status === "valid" ? "verified" : "possible",
                      source: result.url,
                      method: "research",
                      query
                    };
                  }
                } catch (e) {
                  console.error(`[researchEmailFinder] Failed to verify ${email}:`, e);
                }
              }
            }
          }
        } catch (error) {
          console.error(`[researchEmailFinder] Search failed for "${query}":`, error);
        }
      }

      return {
        success: false,
        email: null,
        reason: `No email found in research attempt ${attemptNumber}`,
        method: "research",
        queriesUsed: newQueries
      };
    },
  });

  return {
    patternEmailFinder,
    researchEmailFinder,
  };
}
