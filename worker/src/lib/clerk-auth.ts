import { createClerkClient } from "@clerk/backend";

/**
 * Verifies a Clerk JWT token from the Authorization header
 * @param request - The request object containing headers
 * @param secretKey - The Clerk secret key from environment
 * @returns Object with clerkUserId if valid, null if invalid
 */
export async function verifyClerkToken(
  request: Request,
  secretKey: string
): Promise<{ clerkUserId: string } | null> {
  try {
    // Extract Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.substring(7);

    // Initialize Clerk client with secret key
    const clerk = createClerkClient({ secretKey });

    // Verify token using Clerk
    const session = await clerk.verifySessionToken(token);

    // Extract user ID from verified session
    const clerkUserId = session.userId;
    if (!clerkUserId) {
      return null;
    }

    return { clerkUserId };
  } catch (error) {
    console.error("Clerk token verification failed:", error);
    return null;
  }
}

