import { tool } from "ai";
import { z } from "zod";

export const websiteScraper = tool({
  description: "Scrapes a brand website to find PR/press/collab emails, founder names, and any other visible emails. Checks multiple pages: homepage, about, contact, press.",

  inputSchema: z.object({
    domain: z.string().describe("The brand's domain without protocol, e.g., 'kosas.com'"),
  }),

  execute: async ({ domain }) => {
    console.log(`[websiteScraper] Starting scrape for ${domain}`);

    // Initialize result structure
    const result = {
      domain,
      prEmails: [] as string[],
      founderInfo: null as { name: string; role: string; email: string | null } | null,
      otherEmails: [] as string[],
      pagesScraped: [] as string[],
    };

    // List of paths to scrape (common patterns for Shopify and standard sites)
    const pathsToTry = [
      "",
      "/about",
      "/about-us",
      "/contact",
      "/contact-us",
      "/press",
      "/pages/about",
      "/pages/about-us",
      "/pages/contact",
      "/pages/press",
      "/pages/our-story",
    ];

    // Build full URLs
    const urlsToScrape = pathsToTry.map((path) => `https://${domain}${path}`);

    // Email regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    // PR email prefixes (lowercase)
    const prPrefixes = ["pr", "press", "collab", "collabs", "partnership", "partnerships", "media", "creator", "creators", "influencer", "influencers"];

    // Founder/CEO patterns to search for in text
    const founderPatterns = [
      /(?:founded by|founder[:\s]+|co-founder[:\s]+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s*,\s*|\s+is\s+|\s+as\s+)(?:founder|co-founder|ceo|chief executive)/gi,
      /(?:ceo|chief executive officer)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
      /(?:meet the founder|our founder|about the founder)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    ];

    // Helper function to fetch a URL with timeout
    async function fetchWithTimeout(url: string, timeoutMs: number = 5000): Promise<string | null> {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: controller.signal,
          redirect: "follow",
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.log(`[websiteScraper] ${url} returned ${response.status}`);
          return null;
        }

        return await response.text();
      } catch (error) {
        console.log(`[websiteScraper] Failed to fetch ${url}: ${error instanceof Error ? error.message : "Unknown error"}`);
        return null;
      }
    }

    // Helper function to extract emails from HTML
    function extractEmails(html: string): string[] {
      const matches = html.match(emailRegex) || [];
      // Deduplicate and filter out common false positives
      const filtered = [...new Set(matches)].filter((email) => {
        const lower = email.toLowerCase();
        // Filter out image files, CSS, JS that sometimes match
        if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".js") || lower.endsWith(".css")) {
          return false;
        }
        // Filter out example emails
        if (lower.includes("example.com") || lower.includes("youremail") || lower.includes("email@")) {
          return false;
        }
        return true;
      });
      return filtered;
    }

    // Helper function to categorize an email
    function categorizeEmail(email: string, domain: string): "pr" | "other" | "external" {
      const lower = email.toLowerCase();
      const emailDomain = lower.split("@")[1];
      
      // Check if it's from this domain (handle .com/.ca variants)
      const baseDomain = domain.replace(/\.(com|ca|co\.uk|io|co)$/, "").toLowerCase();
      const emailBaseDomain = emailDomain?.replace(/\.(com|ca|co\.uk|io|co)$/, "") || "";
      
      if (!emailBaseDomain.includes(baseDomain) && !baseDomain.includes(emailBaseDomain)) {
        return "external"; // Different domain, skip
      }

      const localPart = lower.split("@")[0];
      
      // Check if it's a PR-type email
      for (const prefix of prPrefixes) {
        if (localPart === prefix || localPart.startsWith(prefix + ".") || localPart.startsWith(prefix + "_")) {
          return "pr";
        }
      }

      return "other";
    }

    // Helper function to extract founder info from text
    function extractFounderInfo(html: string): { name: string; role: string } | null {
      // Remove HTML tags for text analysis
      const textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ");

      for (const pattern of founderPatterns) {
        // Reset regex lastIndex
        pattern.lastIndex = 0;
        const match = pattern.exec(textContent);
        if (match && match[1]) {
          const name = match[1].trim();
          // Validate it looks like a real name (2-4 words, reasonable length)
          const words = name.split(/\s+/);
          if (words.length >= 2 && words.length <= 4 && name.length >= 5 && name.length <= 50) {
            // Determine role based on pattern
            const patternStr = pattern.source.toLowerCase();
            let role = "Founder";
            if (patternStr.includes("ceo") || patternStr.includes("chief executive")) {
              role = "CEO";
            } else if (patternStr.includes("co-founder")) {
              role = "Co-Founder";
            }
            console.log(`[websiteScraper] Found founder: ${name} (${role})`);
            return { name, role };
          }
        }
      }

      return null;
    }

    // Scrape all URLs
    const allEmails: string[] = [];
    let founderFound = false;

    for (const url of urlsToScrape) {
      const html = await fetchWithTimeout(url);
      
      if (html) {
        result.pagesScraped.push(url);
        console.log(`[websiteScraper] Successfully scraped ${url} (${html.length} chars)`);

        // Extract emails
        const emails = extractEmails(html);
        allEmails.push(...emails);

        // Try to find founder info (only if not already found)
        if (!founderFound) {
          const founder = extractFounderInfo(html);
          if (founder) {
            result.founderInfo = { ...founder, email: null };
            founderFound = true;
          }
        }
      }
    }

    // Categorize all found emails
    const seenEmails = new Set<string>();
    for (const email of allEmails) {
      const lower = email.toLowerCase();
      if (seenEmails.has(lower)) continue;
      seenEmails.add(lower);

      const category = categorizeEmail(email, domain);
      if (category === "pr") {
        result.prEmails.push(email);
      } else if (category === "other") {
        result.otherEmails.push(email);
      }
      // Skip external emails
    }

    // If we found founder info and there's an email that might be theirs, try to match
    if (result.founderInfo && result.otherEmails.length > 0) {
      const founderFirstName = result.founderInfo.name.split(" ")[0].toLowerCase();
      const founderLastName = result.founderInfo.name.split(" ").slice(-1)[0].toLowerCase();
      
      for (const email of result.otherEmails) {
        const localPart = email.toLowerCase().split("@")[0];
        if (
          localPart.includes(founderFirstName) ||
          localPart.includes(founderLastName) ||
          localPart === `${founderFirstName}.${founderLastName}` ||
          localPart === `${founderFirstName}${founderLastName}` ||
          localPart === founderFirstName
        ) {
          result.founderInfo.email = email;
          console.log(`[websiteScraper] Matched founder email: ${email}`);
          break;
        }
      }
    }

    console.log(`[websiteScraper] Scrape complete for ${domain}:`);
    console.log(`  - Pages scraped: ${result.pagesScraped.length}`);
    console.log(`  - PR emails: ${result.prEmails.length} (${result.prEmails.join(", ")})`);
    console.log(`  - Other emails: ${result.otherEmails.length}`);
    console.log(`  - Founder: ${result.founderInfo?.name || "Not found"}`);
    console.log(`  - Founder email: ${result.founderInfo?.email || "Not found"}`);

    return result;
  },
});

