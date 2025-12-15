import { verifyToken } from "@clerk/backend";

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

    // Verify token using Clerk
    const verifiedToken = await verifyToken(token, { secretKey });

    // Extract user ID from verified token (sub field contains user ID)
    const clerkUserId = verifiedToken.sub;
    if (!clerkUserId) {
      return null;
    }

    return { clerkUserId };
  } catch (error) {
    console.error("Clerk token verification failed:", error);
    return null;
  }
}

