import { tool } from "ai";
import { z } from "zod";
import { verifyEmail } from "../lib/utils";

// Scrape website for existing emails to detect pattern
async function scrapeEmailPattern(domain: string): Promise<string | null> {
  try {
    console.log(`[emailFinder] [scrapeEmailPattern] Fetching https://${domain}...`);
    const res = await fetch(`https://${domain}`, { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000)
    });
    const html = await res.text();
    
    // Find all emails on the page
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = html.match(emailRegex) || [];
    console.log(`[emailFinder] [scrapeEmailPattern] Found ${emails.length} total emails on page`);
    
    // Filter to emails matching this domain (or .com/.ca variants)
    const baseDomain = domain.replace(/\.(com|ca|co\.uk|io)$/, '');
    const domainEmails = emails.filter(e => e.includes(baseDomain));
    console.log(`[emailFinder] [scrapeEmailPattern] Found ${domainEmails.length} emails matching domain ${baseDomain}`);
    
    if (domainEmails.length === 0) {
      console.log(`[emailFinder] [scrapeEmailPattern] No domain-matching emails found, pattern detection skipped`);
      return null;
    }
    
    // Detect pattern from first email found
    const sample = domainEmails[0];
    const [local] = sample.split('@');
    console.log(`[emailFinder] [scrapeEmailPattern] Analyzing sample email: ${sample} (local part: ${local})`);
    
    let detectedPattern: string | null = null;
    if (local.includes('.')) detectedPattern = 'first.last';
    else if (local.includes('_')) detectedPattern = 'first_last';
    else if (/^[a-z]+[A-Z]/.test(local)) detectedPattern = 'firstlast';
    else if (/^[a-z]{1}[a-z]+$/.test(local) && local.length > 6) detectedPattern = 'firstlast';
    else if (/^[a-z]\.[a-z]+$/.test(local)) detectedPattern = 'f.last';
    else if (/^[a-z]+$/.test(local) && local.length <= 6) detectedPattern = 'first';
    else detectedPattern = 'first.last'; // default
    
    console.log(`[emailFinder] [scrapeEmailPattern] Detected pattern: ${detectedPattern}`);
    return detectedPattern;
  } catch (error) {
    console.log(`[emailFinder] [scrapeEmailPattern] Error scraping domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

function getEmailDomain(websiteDomain: string, scrapedEmail?: string): string[] {
  // If we scraped an email, use that domain
  if (scrapedEmail) {
    const emailDomain = scrapedEmail.split('@')[1];
    if (emailDomain) return [emailDomain];
  }
  
  // Otherwise try both .ca and .com
  const domains = [websiteDomain];
  if (websiteDomain.endsWith('.ca')) {
    domains.push(websiteDomain.replace('.ca', '.com'));
  } else if (websiteDomain.endsWith('.com')) {
    domains.push(websiteDomain.replace('.com', '.ca'));
  }
  return domains;
}

function generateEmailPatterns(name: string, domain: string, pattern?: string | null): string[] {
  const parts = name.toLowerCase().trim().split(/\s+/);
  const first = parts[0] || '';
  const last = parts[parts.length - 1] || '';
  const firstInitial = first[0] || '';

  // If we detected a pattern, prioritize it
  if (pattern) {
    const patternMap: Record<string, string[]> = {
      'first.last': [`${first}.${last}@${domain}`],
      'first_last': [`${first}_${last}@${domain}`],
      'firstlast': [`${first}${last}@${domain}`],
      'f.last': [`${firstInitial}.${last}@${domain}`],
      'first': [`${first}@${domain}`],
    };
    return patternMap[pattern] || [`${first}.${last}@${domain}`];
  }

  // Fallback: try common patterns (fewer than before)
  return [
    `${first}.${last}@${domain}`,
    `${first}@${domain}`,
    `${first}${last}@${domain}`,
  ];
}

export const emailFinder = tool({
  description: "Finds verified emails for a list of people at a company.",

  inputSchema: z.object({
    people: z.array(z.object({
      name: z.string(),
      role: z.string().optional(),
    })),
    domain: z.string(),
  }),

  execute: async ({ people, domain }, options) => {
    const env = ((options as any)?.env ?? process.env) as any;
    if (!env.ZEROBOUNCE_API_KEY) throw new Error("Missing ZEROBOUNCE_API_KEY");

    console.log(`[emailFinder] Starting email search for ${people.length} people at ${domain}`);

    // 1. Scrape website for email pattern
    console.log(`[emailFinder] Scraping ${domain} for email pattern...`);
    const pattern = await scrapeEmailPattern(domain);
    console.log(`[emailFinder] Detected email pattern: ${pattern || 'none, using defaults'}`);

    // 2. Get possible email domains
    const emailDomains = getEmailDomain(domain);
    console.log(`[emailFinder] Trying email domains: ${emailDomains.join(', ')}`);

    // 3. Find first valid email (process sequentially, stop on first success)
    console.log(`[emailFinder] Processing ${people.length} people sequentially, stopping at first valid email...`);
    
    for (let personIndex = 0; personIndex < people.length; personIndex++) {
      const person = people[personIndex];
      console.log(`[emailFinder] [${personIndex + 1}/${people.length}] Processing: ${person.name} (${person.role || 'Unknown role'})`);
      let testedCount = 0;
      
      for (const emailDomain of emailDomains) {
        const candidates = generateEmailPatterns(person.name, emailDomain, pattern);
        console.log(`[emailFinder] [${person.name}] Trying domain ${emailDomain} with ${candidates.length} pattern(s): ${candidates.join(', ')}`);
        
        for (const email of candidates) {
          testedCount++;
          try {
            console.log(`[emailFinder] [${person.name}] Testing email ${testedCount}: ${email}`);
            const status = await verifyEmail(email, env);
            console.log(`[emailFinder] [${person.name}] Email ${email} status: ${status}`);
            
            if (status === "valid") {
              console.log(`[emailFinder] [${person.name}] ✓ Found valid email: ${email} (tested ${testedCount} candidates)`);
              console.log(`[emailFinder] Stopping search - returning first valid email found`);
              return {
                domain,
                people: [{ name: person.name, role: person.role || "Unknown", emails: [email] }],
                summary: `Found email for ${person.name}`,
              };
            }
          } catch (error) {
            console.log(`[emailFinder] [${person.name}] ✗ Error testing ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            continue;
          }
        }
      }
      
      console.log(`[emailFinder] [${person.name}] ✗ No valid email found (tested ${testedCount} candidates across ${emailDomains.length} domain(s))`);
    }

    console.log(`[emailFinder] No valid emails found for any of ${people.length} people`);
    return {
      domain,
      people: [],
      summary: `No valid emails found`,
    };
  },
});