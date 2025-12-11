export async function verifyEmail(email: string, env: { ZEROBOUNCE_API_KEY: string }): Promise<string> {
    const apiKey = env.ZEROBOUNCE_API_KEY;
    const url = `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}`;

    const response = await fetch(url);

    console.log("the response: ", response)
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

    console.log("ZeroBounce verification result:", data);

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
