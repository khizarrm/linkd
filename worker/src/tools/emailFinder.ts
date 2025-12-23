import { tool } from "ai";
import { z } from "zod";
import { verifyEmail } from "../lib/utils";

// Scrape website for existing emails to detect pattern
async function scrapeEmailPattern(domain: string): Promise<{ pattern: string | null; sampleEmail: string | null }> {
  try {
    console.log(`[emailFinder] Scraping ${domain} for email pattern...`);
    const res = await fetch(`https://${domain}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    const html = await res.text();

    // Find all emails on the page
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = html.match(emailRegex) || [];

    // Filter to emails matching this domain
    const baseDomain = domain.replace(/\.(com|ca|co\.uk|io|co)$/, "").toLowerCase();
    const domainEmails = emails.filter((e) => e.toLowerCase().includes(baseDomain));

    if (domainEmails.length === 0) {
      return { pattern: null, sampleEmail: null };
    }

    // Detect pattern from first personal-looking email (skip hello@, info@, etc)
    const genericPrefixes = ["hello", "hi", "info", "contact", "support", "team", "press", "pr", "collab", "media"];
    const personalEmail = domainEmails.find((e) => {
      const local = e.split("@")[0].toLowerCase();
      return !genericPrefixes.includes(local);
    });

    const sample = personalEmail || domainEmails[0];
    const [local] = sample.split("@");

    let pattern: string | null = null;
    if (local.includes(".")) pattern = "first.last";
    else if (local.includes("_")) pattern = "first_last";
    else pattern = "first";

    console.log(`[emailFinder] Detected pattern: ${pattern} (from ${sample})`);
    return { pattern, sampleEmail: sample };
  } catch (error) {
    console.log(`[emailFinder] Pattern scrape failed: ${error instanceof Error ? error.message : "Unknown"}`);
    return { pattern: null, sampleEmail: null };
  }
}

function generateEmailCandidates(name: string, domain: string, detectedPattern: string | null): string[] {
  const parts = name.toLowerCase().trim().split(/\s+/);
  const first = parts[0] || "";
  const last = parts[parts.length - 1] || "";

  const candidates: string[] = [];

  // If we detected a pattern, prioritize it
  if (detectedPattern === "first.last") {
    candidates.push(`${first}.${last}@${domain}`);
    candidates.push(`${first}@${domain}`);
  } else if (detectedPattern === "first_last") {
    candidates.push(`${first}_${last}@${domain}`);
    candidates.push(`${first}@${domain}`);
  } else if (detectedPattern === "first") {
    candidates.push(`${first}@${domain}`);
    candidates.push(`${first}.${last}@${domain}`);
  } else {
    // No pattern detected - try common DTC brand patterns
    candidates.push(`${first}@${domain}`);
    candidates.push(`${first}.${last}@${domain}`);
    candidates.push(`${first}${last}@${domain}`);
  }

  // Always try hello@ as a founder alias (common for small DTC brands)
  candidates.push(`hello@${domain}`);

  return candidates;
}

export const emailFinder = tool({
  description: "Finds and verifies email for a person at a company. Can also verify a known email directly.",

  inputSchema: z.object({
    people: z
      .array(
        z.object({
          name: z.string(),
          role: z.string().optional(),
        })
      )
      .describe("List of people to find emails for (typically just 1 founder)"),
    domain: z.string().describe("Company domain without protocol"),
    knownEmail: z.string().optional().describe("If provided, just verify this email instead of guessing"),
  }),

  execute: async ({ people, domain, knownEmail }, options) => {
    const env = ((options as any)?.env ?? process.env) as any;
    if (!env.ZEROBOUNCE_API_KEY) throw new Error("Missing ZEROBOUNCE_API_KEY");

    const cleanDomain = domain.replace(/^www\./, "").toLowerCase();

    console.log(`[emailFinder] Starting for domain: ${cleanDomain}`);

    // If we have a known email, just verify it
    if (knownEmail) {
      console.log(`[emailFinder] Verifying known email: ${knownEmail}`);
      try {
        const status = await verifyEmail(knownEmail, env);
        console.log(`[emailFinder] Known email status: ${status}`);

        if (status === "valid") {
          return {
            domain: cleanDomain,
            people: [{ name: people[0]?.name || "Unknown", role: people[0]?.role || "Founder", emails: [knownEmail] }],
            summary: `Verified email: ${knownEmail}`,
          };
        }
      } catch (error) {
        console.log(`[emailFinder] Known email verification failed: ${error instanceof Error ? error.message : "Unknown"}`);
      }

      return {
        domain: cleanDomain,
        people: [],
        summary: `Known email ${knownEmail} could not be verified`,
      };
    }

    // No known email - detect pattern and guess
    const { pattern } = await scrapeEmailPattern(cleanDomain);

    // Try each person (usually just 1)
    for (const person of people) {
      console.log(`[emailFinder] Finding email for: ${person.name}`);

      const candidates = generateEmailCandidates(person.name, cleanDomain, pattern);
      console.log(`[emailFinder] Candidates: ${candidates.join(", ")}`);

      for (const email of candidates) {
        try {
          console.log(`[emailFinder] Testing: ${email}`);
          const status = await verifyEmail(email, env);
          console.log(`[emailFinder] ${email} -> ${status}`);

          if (status === "valid") {
            console.log(`[emailFinder] Found valid email: ${email}`);
            return {
              domain: cleanDomain,
              people: [{ name: person.name, role: person.role || "Founder", emails: [email] }],
              summary: `Found email for ${person.name}`,
            };
          }
        } catch (error) {
          console.log(`[emailFinder] Error testing ${email}: ${error instanceof Error ? error.message : "Unknown"}`);
          continue;
        }
      }

      console.log(`[emailFinder] No valid email found for ${person.name}`);
    }

    return {
      domain: cleanDomain,
      people: [],
      summary: "No valid emails found",
    };
  },
});
