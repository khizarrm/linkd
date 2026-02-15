import { tool } from "ai";
import { z } from "zod";
import type { CloudflareBindings } from "../../env.d";

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
}

async function tavilySearch(
  apiKey: string,
  query: string,
  options?: {
    searchDepth?: "basic" | "advanced";
    maxResults?: number;
    includeDomains?: string[];
  },
): Promise<TavilyResponse> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: options?.searchDepth ?? "basic",
      max_results: options?.maxResults ?? 5,
      include_domains: options?.includeDomains,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<TavilyResponse>;
}

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

export function createTools(
  env: CloudflareBindings,
  options?: {
    onToolStart?: (toolName: string) => string | undefined;
    onToolEnd?: (toolName: string, stepId?: string) => void;
    onEmailFound?: (data: {
      name: string;
      email: string;
      domain: string;
      verificationStatus: "verified" | "possible";
    }) => void;
    onPeopleFound?: (
      profiles: Array<{
        name: string;
        url: string;
        snippet: string;
      }>,
    ) => void;
  },
) {
  const linkedinSearch = tool({
    description: "Search LinkedIn for people at a specific company",
    inputSchema: z.object({
      company: z.string(),
      role: RoleType,
      customRole: z.string().nullable(),
      location: z.string().nullable(),
      maxResults: z.number().min(1).max(5).default(3).optional(),
    }),
    execute: async ({
      company,
      role,
      customRole,
      location,
      maxResults = 3,
    }) => {
      const resolvedStepId = options?.onToolStart?.("linkedin_search");
      const roleClause =
        role === "other" && customRole
          ? `("${customRole}")`
          : ROLE_EXPANSIONS[role] || `("${role}")`;

      let query = `site:linkedin.com/in "${company}" ${roleClause}`;
      if (location) query += ` "${location}"`;

      let validatedMaxResults = 3;
      if (
        typeof maxResults === "number" &&
        maxResults >= 1 &&
        maxResults <= 5
      ) {
        validatedMaxResults = maxResults;
      }

      try {
        const response = await tavilySearch(env.TAVILY_API_KEY, query, {
          searchDepth: "advanced",
          includeDomains: ["linkedin.com"],
          maxResults: 10,
        });

        const profiles = response.results
          .filter((r) => r.url.includes("linkedin.com/in/"))
          .slice(0, validatedMaxResults)
          .map((r) => {
            const roleMatch = r.title.match(/[-\u2013\u2014|](.+?)(?:at|$)/);
            const snippet = roleMatch ? roleMatch[1].trim() : "";

            return {
              name: r.title.replace(/ [-\u2013\u2014|].*$/, "").trim(),
              url: r.url,
              snippet,
            };
          });

        if (profiles.length > 0) {
          options?.onPeopleFound?.(profiles);
        }

        return { query, resultCount: profiles.length, profiles };
      } catch (error) {
        return { query, resultCount: 0, profiles: [], error: String(error) };
      } finally {
        options?.onToolEnd?.("linkedin_search", resolvedStepId);
      }
    },
  });

  const webSearch = tool({
    description: "Search the web for general information",
    inputSchema: z.object({
      query: z.string(),
    }),
    execute: async ({ query }) => {
      const resolvedStepId = options?.onToolStart?.("web_search");
      try {
        const response = await tavilySearch(env.TAVILY_API_KEY, query, {
          searchDepth: "advanced",
          maxResults: 10,
        });

        return {
          resultCount: response.results.length,
          results: response.results.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.content.substring(0, 300),
          })),
        };
      } catch (error) {
        return { resultCount: 0, results: [], error: String(error) };
      } finally {
        options?.onToolEnd?.("web_search", resolvedStepId);
      }
    },
  });

  const companyLookup = tool({
    description: "Verify a company exists and get basic info",
    inputSchema: z.object({
      companyName: z.string(),
      context: z.string().nullable(),
    }),
    execute: async ({ companyName, context }) => {
      const resolvedStepId = options?.onToolStart?.("company_lookup");
      const query =
        `"${companyName}" company official website ${context || ""}`.trim();

      try {
        const response = await tavilySearch(env.TAVILY_API_KEY, query, {
          searchDepth: "basic",
          maxResults: 5,
        });

        return {
          results: response.results.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.content.substring(0, 300),
          })),
        };
      } catch (error) {
        return { results: [], error: String(error) };
      } finally {
        options?.onToolEnd?.("company_lookup", resolvedStepId);
      }
    },
  });

  async function verifyEmail(email: string): Promise<string> {
    const apiKey = env.ZEROBOUNCE_API_KEY;
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

  const emailFinder = tool({
    description: "Find and verify email address for a person at a company",
    inputSchema: z.object({
      name: z.string(),
      domain: z.string(),
      knownPattern: z.string().nullable(),
    }),
    execute: async ({ name, domain, knownPattern }) => {
      const resolvedStepId = options?.onToolStart?.("find_and_verify_email");
      try {
        const cleanDomain = domain.replace(/^www\./, "").toLowerCase();

        const parts = name.trim().split(/\s+/);
        const first = parts[0]?.toLowerCase() || "";
        const last = parts[parts.length - 1]?.toLowerCase() || "";
        const firstInitial = first[0] || "";

        const patterns: string[] = [];

        if (
          knownPattern &&
          knownPattern.trim() !== "" &&
          knownPattern !== null
        ) {
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

        for (const email of patterns) {
          try {
            const status = await verifyEmail(email);
            if (status === "valid") {
              options?.onEmailFound?.({
                name,
                email,
                domain: cleanDomain,
                verificationStatus: "verified",
              });
              return {
                email,
                pattern: email.split("@")[0],
                verificationStatus: "verified",
              };
            } else if (
              status === "catch-all" ||
              status === "catch_all" ||
              status === "acceptable"
            ) {
              options?.onEmailFound?.({
                name,
                email,
                domain: cleanDomain,
                verificationStatus: "possible",
              });
              return {
                email,
                pattern: email.split("@")[0],
                verificationStatus: "possible",
              };
            }
          } catch {
            // Continue to next pattern
          }
        }

        return { email: null, pattern: null, verificationStatus: null };
      } finally {
        options?.onToolEnd?.("find_and_verify_email", resolvedStepId);
      }
    },
  });

  return { linkedinSearch, webSearch, companyLookup, emailFinder };
}
