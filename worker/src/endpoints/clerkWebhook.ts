import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { Webhook } from "svix";
import type { WebhookEvent, UserJSON } from "@clerk/backend";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";
import { users } from "../db/auth.schema";
import { eq } from "drizzle-orm";

function mapClerkUserToDbUser(userData: UserJSON) {
  const email = userData.email_addresses?.[0]?.email_address || "";
  const name = userData.first_name && userData.last_name
    ? `${userData.first_name} ${userData.last_name}`
    : userData.username || null;
  
  const metadata = userData.public_metadata || userData.unsafe_metadata || {};
  
  return {
    clerkUserId: userData.id,
    email,
    name: name || null,
    image: userData.image_url || null,
    linkedinUrl: (metadata as any)?.linkedinUrl || null,
    githubUrl: (metadata as any)?.githubUrl || null,
    websiteUrl: (metadata as any)?.websiteUrl || null,
    twitterUrl: (metadata as any)?.twitterUrl || null,
  };
}

export class ClerkWebhookRoute extends OpenAPIRoute {
  schema = {
    tags: ["Webhooks"],
    summary: "Clerk Webhook Handler",
    description: "⚠️ This endpoint requires svix headers for verification. Testing in Swagger will fail without proper headers. Clerk automatically includes these headers when sending webhooks.",
    request: {
      headers: z.object({
        "svix-id": z.string().describe("Svix webhook ID header"),
        "svix-timestamp": z.string().describe("Svix webhook timestamp header"),
        "svix-signature": z.string().describe("Svix webhook signature header"),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              type: z.string().describe("Event type: user.created, user.updated, or user.deleted"),
              data: z.any().describe("User data from Clerk"),
            }),
            example: {
              type: "user.created",
              data: {
                id: "user_2abc123def456",
                first_name: "John",
                last_name: "Doe",
                username: "johndoe",
                email_addresses: [
                  {
                    id: "idn_2abc123",
                    email_address: "john.doe@example.com",
                    verification: {
                      status: "verified",
                      strategy: "email_code",
                    },
                  },
                ],
                image_url: "https://img.clerk.com/example.jpg",
                public_metadata: {
                  linkedinUrl: "https://linkedin.com/in/johndoe",
                  githubUrl: "https://github.com/johndoe",
                },
                unsafe_metadata: {},
                created_at: 1234567890,
                updated_at: 1234567890,
              },
            },
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Webhook processed successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
            }),
          },
        },
      },
      "400": {
        description: "Webhook verification failed",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
      },
    },
  };

  async handle(c: any) {
    const env = c.env;

    try {
      // Get raw body for webhook verification
      const rawBody = await c.req.text();
      
      // Extract svix headers
      const svixId = c.req.header("svix-id");
      const svixTimestamp = c.req.header("svix-timestamp");
      const svixSignature = c.req.header("svix-signature");

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error("Missing svix headers");
        return Response.json(
          { error: "Missing required svix headers" },
          { status: 400 }
        );
      }

      // Initialize webhook with signing secret
      const wh = new Webhook(env.CLERK_WEBHOOK_SIGNING_SECRET);

      // Verify webhook
      const evt = wh.verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as WebhookEvent;

      // Initialize database connection
      const db = drizzle(env.DB, { schema });

      // Process webhook event
      const eventType = evt.type;

      console.log(`Received webhook with event type of ${eventType}`);
      console.log("Webhook payload:", evt.data);

      // Type narrowing for specific event types
      if (evt.type === "user.created") {
        try {
          const userData: UserJSON = evt.data;
          console.log("userId:", userData.id);
          
          const mappedUser = mapClerkUserToDbUser(userData);
          const clerkUserId = mappedUser.clerkUserId;
          
          // Check if user already exists
          const existing = await db.query.users.findFirst({
            where: eq(users.clerkUserId, clerkUserId),
          });
          
          if (!existing) {
            // Insert new user
            await db.insert(users).values({
              ...mappedUser,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } catch (dbError: any) {
          console.error("Database error in user.created:", dbError);
          return Response.json(
            { error: "Failed to process user creation", details: dbError.message },
            { status: 500 }
          );
        }
      } else if (evt.type === "user.updated") {
        try {
          const userData: UserJSON = evt.data;
          console.log("userId:", userData.id);
          
          const mappedUser = mapClerkUserToDbUser(userData);
          const clerkUserId = mappedUser.clerkUserId;
          
          // Check if user exists
          const existing = await db.query.users.findFirst({
            where: eq(users.clerkUserId, clerkUserId),
          });
          
          if (existing) {
            // Update existing user
            await db.update(users)
              .set({
                ...mappedUser,
                updatedAt: new Date(),
              })
              .where(eq(users.clerkUserId, clerkUserId));
          } else {
            // Insert if not exists (upsert pattern)
            await db.insert(users).values({
              ...mappedUser,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } catch (dbError: any) {
          console.error("Database error in user.updated:", dbError);
          return Response.json(
            { error: "Failed to process user update", details: dbError.message },
            { status: 500 }
          );
        }
      } else if (evt.type === "user.deleted") {
        try {
          const clerkUserId = evt.data.id;
          console.log("Deleting userId:", clerkUserId);
          
          // Delete user
          await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
        } catch (dbError: any) {
          console.error("Database error in user.deleted:", dbError);
          return Response.json(
            { error: "Failed to process user deletion", details: dbError.message },
            { status: 500 }
          );
        }
      }

      return Response.json(
        {
          success: true,
          message: "Webhook processed successfully",
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error("Webhook verification error:", error);
      return Response.json(
        { error: error.message || "Webhook verification failed" },
        { status: 400 }
      );
    }
  }
}
