import { eq } from "drizzle-orm";
import { users } from "../db/auth.schema";

export async function ensureUserRecord(
  db: any,
  auth: {
    clerkUserId: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  },
) {
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkUserId, auth.clerkUserId),
  });

  if (existing) return existing;

  const fallbackEmail = `${auth.clerkUserId}@local.invalid`;
  const now = new Date();

  await db.insert(users).values({
    clerkUserId: auth.clerkUserId,
    email: auth.email || fallbackEmail,
    name: auth.name ?? null,
    image: auth.image ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return db.query.users.findFirst({
    where: eq(users.clerkUserId, auth.clerkUserId),
  });
}
