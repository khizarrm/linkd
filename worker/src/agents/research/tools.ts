import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";
import type { CloudflareBindings } from "../../env.d";

const RoleType = z.enum([
  "recruiter",
  "talent_acquisition",
  "university_recruiter",
  "hr",
  "hiring_manager",
  "engineering_manager",
  "team_lead",
  "engineer",
  "frontend",
  "backend",
  "fullstack",
  "mobile",
  "devops",
  "ml_ai",
  "data",
  "product",
  "design",
  "ux_research",
  "founder",
  "executive",
  "director",
  "other",
]);

const ROLE_EXPANSIONS: Record<string, string> = {
  recruiter: `(recruiter OR "technical recruiter" OR "senior recruiter" OR "lead recruiter" OR "recruiting" OR sourcer OR "talent sourcer")`,
  talent_acquisition: `("talent acquisition" OR "talent partner" OR "ta manager" OR "ta specialist" OR "people partner" OR "people operations")`,
  university_recruiter: `("university recruiter" OR "campus recruiter" OR "early career" OR "college recruiter" OR "intern recruiter" OR "early talent")`,
  hr: `(hr OR "human resources" OR "hr manager" OR "hr business partner" OR "people team" OR "head of people")`,
  hiring_manager: `("hiring manager" OR "engineering manager" OR "eng manager" OR "team lead" OR "tech lead")`,
  engineering_manager: `("engineering manager" OR "director of engineering" OR "vp engineering" OR "head of engineering")`,
  team_lead: `("team lead" OR "tech lead" OR "staff engineer" OR "principal engineer" OR "lead engineer")`,
  engineer: `(engineer OR developer OR swe OR "software engineer" OR programmer)`,
  frontend: `(frontend OR "front-end" OR "ui engineer" OR react OR vue OR angular)`,
  backend: `(backend OR "back-end" OR "server engineer" OR "api engineer" OR "platform engineer")`,
  fullstack: `("full stack" OR fullstack OR "full-stack" OR "generalist engineer")`,
  mobile: `(mobile OR ios OR android OR "mobile engineer" OR swift OR kotlin OR "react native")`,
  devops: `(devops OR sre OR "site reliability" OR "platform engineer" OR "infrastructure engineer")`,
  ml_ai: `("machine learning" OR ml OR ai OR "data scientist" OR "ml engineer" OR "research scientist")`,
  data: `(data OR "data engineer" OR "data analyst" OR "analytics engineer" OR "business intelligence")`,
  product: `("product manager" OR pm OR "product lead" OR "product director" OR apm OR "group pm")`,
  design: `(designer OR "product designer" OR "ux designer" OR "design lead" OR "head of design")`,
  ux_research: `("ux researcher" OR "user researcher" OR "design researcher" OR "research lead")`,
  founder: `(founder OR "co-founder" OR cofounder OR ceo OR cto OR coo OR chief)`,
  executive: `(executive OR ceo OR cto OR cfo OR coo OR cmo OR cpo OR cro OR "c-suite")`,
  director: `(director OR vp OR "vice president" OR "head of" OR "senior director")`,
};

export function createTools(env: CloudflareBindings) {
  const companyLookupTool = tool({
    description: `FIRST STEP ONLY: Verify company info. After this, you MUST continue to search LinkedIn for people!

This tool:
1. Verifies company exists and gets official domain
2. Returns company name, domain, and basic info
3. Checks for ambiguity (multiple companies with same name)

CRITICAL: After calling this tool, DO NOT stop. Continue to call linkedin_xray_search then web_search to find people.`,
    inputSchema: z.object({
      companyName: z.string().describe("company name as provided by the user"),
      userContext: z.string().nullable().describe("any additional context from user that might help identify the correct company (industry, location, etc.)"),
    }),
    execute: async ({ companyName, userContext }) => {
      console.log(`[companyLookup] Input: companyName="${companyName}" userContext="${userContext}"`);

      const tvly = tavily({ apiKey: env.TAVILY_API_KEY });

      try {
        const searchQuery = `"${companyName}" company official website ${userContext || ""}`.trim();
        console.log(`[companyLookup] Query: "${searchQuery}"`);

        const response = await tvly.search(searchQuery, {
          searchDepth: "basic",
          maxResults: 10,
          includeRawContent: false,
        });

        console.log(`[companyLookup] Tavily returned ${response.results.length} results`);

        const companies: Array<{
          name: string;
          domain: string | null;
          industry: string;
          description: string;
          linkedinCompanyUrl: string | null;
        }> = [];

        const domainRegex = /https?:\/\/(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/i;
        const linkedinCompanyRegex = /https?:\/\/(?:www\.)?linkedin\.com\/company\/[^\/]+/i;

        for (const result of response.results) {
          const domainMatch = result.content.match(domainRegex);
          const linkedinMatch = result.content.match(linkedinCompanyRegex);
          const domain = domainMatch ? domainMatch[1] : null;

          companies.push({
            name: companyName,
            domain,
            industry: "Unknown",
            description: result.content.substring(0, 200),
            linkedinCompanyUrl: linkedinMatch ? linkedinMatch[0] : null,
          });
        }

        const uniqueDomains = new Set(companies.filter(c => c.domain).map(c => c.domain));
        const isAmbiguous = uniqueDomains.size > 1;

        let bestMatch = companies[0];
        if (isAmbiguous) {
          bestMatch = companies.find(c =>
            c.linkedinCompanyUrl ||
            (c.domain && c.domain.includes(companyName.toLowerCase().replace(/\s+/g, "")))
          ) || companies[0];
        }

        console.log(`[companyLookup] Found ${companies.length} result(s), ambiguous=${isAmbiguous}, bestMatch domain=${bestMatch.domain}, name=${bestMatch.name}`);

        return {
          query: searchQuery,
          isAmbiguous,
          companies,
          recommendedCompany: bestMatch,
          requiresClarification: isAmbiguous,
        };
      } catch (error) {
        console.error("[companyLookup] ❌ Company lookup failed:", error);
        return {
          query: companyName,
          isAmbiguous: false,
          companies: [],
          recommendedCompany: null,
          requiresClarification: false,
          error: String(error),
        };
      }
    },
  });

  const linkedinXrayTool = tool({
    description: `Generate LinkedIn search query. After this, you MUST call web_search to actually get results!

Generates a LinkedIn x-ray boolean search query string for finding people.

After using this tool to get the query, immediately call web_search with that query to get actual LinkedIn profiles.`,
    inputSchema: z.object({
      company: z.string().describe("company name exactly as mentioned"),
      role: RoleType.describe("type of person to find"),
      customRole: z.string().nullable().describe("for 'other' role type: specify custom role, otherwise null"),
      location: z.string().nullable().describe("city, state, country, or region, otherwise null"),
    }),
    execute: async ({ company, role, customRole, location }) => {
      console.log(`[linkedinXray] Input: company="${company}" role="${role}" customRole="${customRole}" location="${location}"`);

      let roleClause = role === "other" && customRole
        ? `("${customRole}")`
        : ROLE_EXPANSIONS[role] || `("${role}")`;

      let query = `site:linkedin.com/in "${company}" ${roleClause}`;
      if (location) query += ` "${location}"`;

      console.log(`[linkedinXray] Generated query: ${query}`);
      return { query, role, company, location: location || null };
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
    description: "generate and verify email patterns for a person at a company",
    inputSchema: z.object({
      name: z.string().describe("person's full name"),
      company: z.string().describe("company name"),
      domain: z.string().describe("company domain (e.g., 'stripe.com')"),
      knownPattern: z.string().nullable().describe("known email to infer pattern, otherwise null"),
    }),
    execute: async ({ name, company, domain, knownPattern }) => {
      console.log(`[emailFinder] Input: name="${name}" company="${company}" domain="${domain}" knownPattern="${knownPattern}"`);
      const cleanDomain = domain.replace(/^www\./, "").toLowerCase();

      const parts = name.trim().split(/\s+/);
      const first = parts[0]?.toLowerCase() || "";
      const last = parts[parts.length - 1]?.toLowerCase() || "";
      const firstInitial = first[0] || "";

      let patterns: string[] = [];

      if (knownPattern && knownPattern.trim() !== "" && knownPattern !== null) {
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

      console.log(`[emailFinder] Testing ${patterns.length} patterns:`, patterns);

      for (const email of patterns) {
        try {
          const status = await verifyEmail(email);
          console.log("status: ", status, email);
          if (status === "valid") {
            console.log(`[emailFinder] ✅ Found verified email: ${email} (status: ${status})`);
            return { email, pattern: email.split("@")[0], verificationStatus: "verified" };
          } else if (status === "catch-all" || status === "catch_all") {
            console.log(`[emailFinder] ✅ Found possible email (catch-all): ${email} (status: ${status})`);
            return { email, pattern: email.split("@")[0], verificationStatus: "possible" };
          } else if (status === "acceptable") {
            console.log(`[emailFinder] ✅Found possible email (acceptable): ${email} (status: ${status})`);
            return { email, pattern: email.split("@")[0], verificationStatus: "possible" };
          }
          console.log(`[emailFinder] ❌ Rejected: ${email} (status: ${status})`);
        } catch (error) {
          console.error(`Failed to verify ${email}:`, error);
        }
      }

      console.log(`[emailFinder] No valid email found for ${name} at ${cleanDomain}`);
      return { email: null, pattern: null, verificationStatus: null };
    },
  });

  const searchWebTool = tool({
    description: `Execute the search. Must be called AFTER linkedin_xray_search!

Takes a search query (from linkedin_xray_search tool) and executes it to return actual LinkedIn profile URLs and snippets.

CRITICAL: Always call this after linkedin_xray_search. Don't stop after generating the query - actually search!`,
    inputSchema: z.object({
      query: z.string().describe("The search query to execute (e.g. site:linkedin.com/in \"stripe\" (recruiter OR \"technical recruiter\"))"),
    }),
    execute: async ({ query }) => {
      console.log(`[webSearch] Query: "${query}"`);
      console.log(`[webSearch] Using Tavily with includeDomains: ["linkedin.com"]`);

      const tvly = tavily({ apiKey: env.TAVILY_API_KEY });

      try {
        const startTime = Date.now();
        const response = await tvly.search(query, {
          searchDepth: "advanced",
          includeDomains: ["linkedin.com"],
          maxResults: 10,
          includeRawContent: false,
        });
        const elapsed = Date.now() - startTime;

        console.log(`[webSearch] Tavily returned ${response.results.length} results in ${elapsed}ms`);
        response.results.forEach((r, i) => {
          console.log(`[webSearch]   [${i}] ${r.url} — "${r.title}"`);
        });

        const results = response.results
          .filter((r) => r.url.includes("linkedin.com/in/"))
          .map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content,
          }));

        console.log(`[webSearch] After /in/ filter: ${results.length} profile URLs`);
        results.forEach((r, i) => {
          console.log(`[webSearch]   ✅ [${i}] ${r.url}`);
        });

        return JSON.stringify({ results });
      } catch (error) {
        console.error("[webSearch] ❌ Tavily search failed:", error);
        return JSON.stringify({ results: [] });
      }
    },
  });

return {
    companyLookupTool,
    linkedinXrayTool,
    emailFinderTool,
    searchWebTool,
  };
}
