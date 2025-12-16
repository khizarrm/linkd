export async function verifyEmail(email: string, env: { ZEROBOUNCE_API_KEY: string }): Promise<string> {
    const apiKey = env.ZEROBOUNCE_API_KEY;
    const url = `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}`;

    const response = await fetch(url);
    const data = await response.json() as {
        address: string;
        status: string;
        sub_status: string;
        account: string;
        domain: string;
        did_you_mean: string;
        domain_age_days: string;
        free_email: boolean;
        mx_found: boolean;
        mx_record: string;
        smtp_provider: string;
        firstname: string;
        lastname: string;
        gender: string;
        country: string;
        region: string;
        city: string;
        zipcode: string;
        processed_at: string;
    };

    return data.status;
}

/**
 * Normalizes a URL by adding https:// protocol if missing.
 * Handles URLs like "apple.com" -> "https://apple.com"
 * Returns null if the input is empty or invalid.
 */
export function normalizeUrl(url: string | null | undefined): string | null {
    if (!url || url.trim() === "") {
        return null;
    }
    
    const trimmed = url.trim();
    
    // If it already has a protocol, return as is
    if (trimmed.match(/^https?:\/\//i)) {
        return trimmed;
    }
    
    // Add https:// if missing
    return `https://${trimmed}`;
}

/**
 * Extracts the domain from a URL (with or without protocol).
 * Returns null if the input is empty or invalid.
 */
export function extractDomain(url: string | null | undefined): string | null {
    if (!url || url.trim() === "") {
        return null;
    }
    
    try {
        const normalized = normalizeUrl(url);
        if (!normalized) {
            return null;
        }
        
        const urlObj = new URL(normalized);
        return urlObj.hostname;
    } catch (e) {
        console.error("Failed to extract domain from URL:", url, e);
        return null;
    }
}

/**
 * Validates a domain by attempting to reach it via HTTP/HTTPS.
 * Returns a validation result object with valid flag and optional error message.
 */
export async function validateDomain(domain: string): Promise<{ valid: boolean; error?: string }> {
    if (!domain || domain.trim() === "") {
        return { valid: false, error: "Domain is required" };
    }

    const trimmed = domain.trim();
    
    // Basic domain format validation
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(trimmed)) {
        return { valid: false, error: "Domain format is invalid" };
    }

    try {
        // Try HTTPS first
        const httpsUrl = `https://${trimmed}`;
        const httpsResponse = await fetch(httpsUrl, {
            method: "HEAD",
            signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (httpsResponse.ok || httpsResponse.status < 500) {
            return { valid: true };
        }

        // If HTTPS fails, try HTTP
        const httpUrl = `http://${trimmed}`;
        const httpResponse = await fetch(httpUrl, {
            method: "HEAD",
            signal: AbortSignal.timeout(5000),
        });

        if (httpResponse.ok || httpResponse.status < 500) {
            return { valid: true };
        }

        return { valid: false, error: "Domain is unreachable" };
    } catch (error: any) {
        // Handle timeout, network errors, etc.
        if (error.name === "AbortError" || error.name === "TimeoutError") {
            return { valid: false, error: "Domain is unreachable" };
        }
        if (error.message?.includes("Failed to fetch") || error.message?.includes("network")) {
            return { valid: false, error: "Domain is unreachable" };
        }
        // Strip out Cloudflare internal error references and provide clean message
        return { valid: false, error: "Domain is invalid or unreachable" };
    }
}

/**
 * Normalizes a website URL by stripping www. and ensuring https:// protocol.
 * Returns format: https://example.com (without www.)
 */
export function normalizeWebsite(url: string | null | undefined): string | null {
    if (!url || url.trim() === "") {
        return null;
    }
    
    const domain = extractDomain(url);
    if (!domain) {
        return null;
    }
    
    // Strip www. subdomain
    const cleanDomain = domain.toLowerCase().startsWith('www.') 
        ? domain.substring(4) 
        : domain;
    
    return `https://${cleanDomain}`;
}

/**
 * Extracts a domain/URL from a query string.
 * Handles various formats like "stripe.com", "https://stripe.com", "find emails at stripe.com"
 */
export function extractDomainFromQuery(query: string): string | null {
    if (!query || query.trim() === "") {
        return null;
    }

    // Try to extract URL with protocol first
    const urlWithProtocol = query.match(/https?:\/\/[^\s]+/i);
    if (urlWithProtocol) {
        const domain = extractDomain(urlWithProtocol[0]);
        if (domain) {
            return domain;
        }
    }

    // Try to extract domain-like patterns (e.g., "example.com", "subdomain.example.com")
    const domainPattern = /([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}/gi;
    const domainMatches = query.match(domainPattern);
    
    if (domainMatches && domainMatches.length > 0) {
        // Prefer longer domains (likely more specific)
        const sortedMatches = domainMatches.sort((a, b) => b.length - a.length);
        const candidate = sortedMatches[0];
        
        // Basic validation: exclude common false positives
        // Only filter out if it's a single-word TLD that appears alone (not a real domain)
        const parts = candidate.split(".");
        if (parts.length >= 2) {
            // Check if it's a valid domain structure (has at least domain name + TLD)
            // Only filter out if the entire match is just a common TLD word
            const tld = parts[parts.length - 1].toLowerCase();
            const domainName = parts[parts.length - 2].toLowerCase();
            
            // If domain name is too short (1-2 chars) and TLD is common, might be false positive
            // But if domain name is 3+ chars, it's likely a real domain
            if (domainName.length >= 3) {
                return candidate.toLowerCase();
            }
            
            // For short domain names, only filter out if TLD is a very common word
            const commonWordTlds = ["com", "org", "net"]; // Only filter these for very short domains
            if (!commonWordTlds.includes(tld)) {
                return candidate.toLowerCase();
            }
        }
    }

    return null;
}
