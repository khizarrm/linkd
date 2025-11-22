// Utility to replace URL keywords with HTML hyperlinks
import { getCachedProfile } from './profile-cache';

/**
 * Replace URL keywords (linkedin, github, twitter, website) with HTML anchor tags
 * Uses profile cache to get the actual URLs
 */
export function replaceUrlKeywords(text: string): string {
  const profile = getCachedProfile();
  if (!profile) {
    // If no profile cache, return text as-is
    return text;
  }

  // Map of keywords to profile URL fields
  const urlMap: Record<string, string | null> = {
    linkedin: profile.linkedinUrl,
    github: profile.githubUrl,
    twitter: profile.twitterUrl,
    website: profile.websiteUrl,
  };

  // Replace keywords with HTML links (case-insensitive, whole word only)
  let result = text;
  const keywordPattern = /\b(linkedin|github|twitter|website)\b/gi;
  
  result = result.replace(keywordPattern, (match) => {
    const keyword = match.toLowerCase();
    const url = urlMap[keyword];
    
    // Only replace if URL exists
    if (url && url.trim()) {
      return `<a href="${url}" style="color: #3b82f6; text-decoration: underline;">${match}</a>`;
    }
    
    // Return original if no URL configured
    return match;
  });

  return result;
}

