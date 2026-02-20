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

function mapLinkedinProfiles(results: TavilyResult[]) {
  return results
    .filter((result) => result.url.includes("linkedin.com/in/"))
    .map((result) => {
      const roleMatch = result.title.match(/[-\u2013\u2014|](.+?)(?:at|$)/);
      const snippet = roleMatch ? roleMatch[1].trim() : "";
      return {
        name: result.title.replace(/ [-\u2013\u2014|].*$/, "").trim(),
        url: result.url,
        snippet,
      };
    });
}

function dedupeProfiles(
  profiles: Array<{
    name: string;
    url: string;
    snippet: string;
  }>,
) {
  const seen = new Set<string>();
  return profiles.filter((profile) => {
    if (seen.has(profile.url)) return false;
    seen.add(profile.url);
    return true;
  });
}

function compactSnippet(content: string, maxLength: number) {
  return content.length <= maxLength
    ? content
    : `${content.slice(0, maxLength).trimEnd()}...`;
}

export function createTools(
  env: CloudflareBindings,
  options?: {
    onToolStart?: (toolName: string) => string | undefined;
    onToolEnd?: (toolName: string, stepId?: string, failed?: boolean) => void;
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
    optimizeToolLoop?: boolean;
  },
) {
  const optimizeToolLoop = options?.optimizeToolLoop === true;

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

      let failed = false;
      try {
        const initialResponse = await tavilySearch(env.TAVILY_API_KEY, query, {
          searchDepth: optimizeToolLoop ? "basic" : "advanced",
          includeDomains: ["linkedin.com"],
          maxResults: optimizeToolLoop ? 6 : 10,
        });

        let profiles = dedupeProfiles(mapLinkedinProfiles(initialResponse.results))
          .slice(0, validatedMaxResults);

        if (optimizeToolLoop && profiles.length < validatedMaxResults) {
          const fallbackResponse = await tavilySearch(env.TAVILY_API_KEY, query, {
            searchDepth: "advanced",
            includeDomains: ["linkedin.com"],
            maxResults: 10,
          });
          profiles = dedupeProfiles([
            ...profiles,
            ...mapLinkedinProfiles(fallbackResponse.results),
          ]).slice(0, validatedMaxResults);
        }

        if (profiles.length > 0) options?.onPeopleFound?.(profiles);
        return { query, resultCount: profiles.length, profiles };
      } catch (error) {
        failed = true;
        return { query, resultCount: 0, profiles: [], error: String(error) };
      } finally {
        options?.onToolEnd?.("linkedin_search", resolvedStepId, failed);
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
      let failed = false;
      try {
        const response = await tavilySearch(env.TAVILY_API_KEY, query, {
          searchDepth: optimizeToolLoop ? "basic" : "advanced",
          maxResults: optimizeToolLoop ? 5 : 10,
        });

        return {
          resultCount: response.results.length,
          results: response.results.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: compactSnippet(r.content, optimizeToolLoop ? 180 : 300),
          })),
        };
      } catch (error) {
        failed = true;
        return { resultCount: 0, results: [], error: String(error) };
      } finally {
        options?.onToolEnd?.("web_search", resolvedStepId, failed);
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

      let failed = false;
      try {
        const response = await tavilySearch(env.TAVILY_API_KEY, query, {
          searchDepth: "basic",
          maxResults: optimizeToolLoop ? 3 : 5,
        });

        return {
          results: response.results.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: compactSnippet(r.content, optimizeToolLoop ? 180 : 300),
          })),
        };
      } catch (error) {
        failed = true;
        return { results: [], error: String(error) };
      } finally {
        options?.onToolEnd?.("company_lookup", resolvedStepId, failed);
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
    }),
    execute: async ({ name, domain }) => {
      const resolvedStepId = options?.onToolStart?.("find_and_verify_email");
      let failed = false;
      try {
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
        ];

        const results = await Promise.allSettled(
          patterns.map(async (email) => {
            const status = await verifyEmail(email);
            return { email, status };
          }),
        );

        const fulfilled = results.flatMap((r) =>
          r.status === "fulfilled" ? [r.value] : [],
        );

        const valid = fulfilled.find((r) => r.status === "valid");
        if (valid) {
          options?.onEmailFound?.({
            name,
            email: valid.email,
            domain: cleanDomain,
            verificationStatus: "verified",
          });
          return {
            email: valid.email,
            pattern: valid.email.split("@")[0],
            verificationStatus: "verified",
          };
        }

        const catchAll = fulfilled.find(
          (r) => r.status === "catch-all" || r.status === "catch_all",
        );
        if (catchAll) {
          options?.onEmailFound?.({
            name,
            email: catchAll.email,
            domain: cleanDomain,
            verificationStatus: "possible",
          });
          return {
            email: catchAll.email,
            pattern: catchAll.email.split("@")[0],
            verificationStatus: "possible",
          };
        }

        failed = true;
        return { email: null, pattern: null, verificationStatus: null };
      } finally {
        options?.onToolEnd?.("find_and_verify_email", resolvedStepId, failed);
      }
    },
  });

  return { linkedinSearch, webSearch, companyLookup, emailFinder };
}
