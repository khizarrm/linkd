// Profile cache utility using localStorage
// Stores user profile data locally to avoid unnecessary API calls

const PROFILE_CACHE_KEY = 'user_profile_cache';
const CACHE_TIMESTAMP_KEY = 'user_profile_cache_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export interface CachedProfile {
  id: string;
  email: string | null;
  name: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  createdAt: string;
}

/**
 * Get cached profile data if it exists and is still valid
 */
export function getCachedProfile(): CachedProfile | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (!cached || !timestamp) return null;

    const cacheAge = Date.now() - parseInt(timestamp, 10);
    if (cacheAge > CACHE_DURATION) {
      // Cache expired, remove it
      clearProfileCache();
      return null;
    }

    return JSON.parse(cached) as CachedProfile;
  } catch (error) {
    console.error('Error reading profile cache:', error);
    clearProfileCache();
    return null;
  }
}

/**
 * Save profile data to cache
 */
export function setCachedProfile(profile: CachedProfile): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error saving profile cache:', error);
  }
}

/**
 * Update specific fields in the cached profile
 */
export function updateCachedProfile(updates: Partial<CachedProfile>): void {
  if (typeof window === 'undefined') return;

  const cached = getCachedProfile();
  if (cached) {
    const updated = { ...cached, ...updates };
    setCachedProfile(updated);
  }
}

/**
 * Clear the profile cache
 */
export function clearProfileCache(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Error clearing profile cache:', error);
  }
}

/**
 * Check if cache exists and is valid
 */
export function hasValidCache(): boolean {
  return getCachedProfile() !== null;
}

