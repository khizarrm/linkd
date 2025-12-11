import { verifyWebhook } from "@clerk/backend/webhooks";
import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";
import { users } from "../db/auth.schema";
import { eq } from "drizzle-orm";

export class ClerkWebhookRoute extends OpenAPIRoute {
  schema = {
    tags: ["Webhooks"],
    summary: "Clerk Webhook Handler",
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
      },
      "500": {
        description: "Internal server error",
      },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    try {
      // Verify webhook signature
      const evt = await verifyWebhook(request, {
        signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
      });

      const db = drizzle(env.DB, { schema });
      const eventType = evt.type;

      // Handle different event types
      if (eventType === "user.created") {
        await this.handleUserCreated(evt.data, db);
      } else if (eventType === "user.updated") {
        await this.handleUserUpdated(evt.data, db);
      } else if (eventType === "user.deleted") {
        await this.handleUserDeleted(evt.data, db);
      } else {
        // Unknown event type, log but don't fail
        console.log(`Unknown webhook event type: ${eventType}`);
      }

      return {
        success: true,
        message: `Webhook event ${eventType} processed successfully`,
      };
    } catch (error) {
      console.error("Error processing webhook:", error);
      return Response.json(
        { error: "Webhook verification failed", message: (error as Error).message },
        { status: 400 }
      );
    }
  }

  private async handleUserCreated(userData: any, db: any) {
    const clerkUserId = userData.id;
    if (!clerkUserId) {
      throw new Error("User ID is required");
    }

    // Extract email (primary email from email_addresses array)
    const primaryEmail = userData.email_addresses?.find(
      (email: any) => email.id === userData.primary_email_address_id
    ) || userData.email_addresses?.[0];

    if (!primaryEmail?.email_address) {
      throw new Error("User email is required");
    }

    // Combine first_name and last_name for name
    const firstName = userData.first_name || "";
    const lastName = userData.last_name || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

    // Check if user already exists (upsert pattern)
    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });

    if (existingUser) {
      // Update existing user
      await db
        .update(users)
        .set({
          email: primaryEmail.email_address,
          name: fullName,
          image: userData.image_url || null,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, clerkUserId))
        .returning();
    } else {
      // Insert new user
      await db.insert(users).values({
        clerkUserId,
        email: primaryEmail.email_address,
        name: fullName,
        image: userData.image_url || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  private async handleUserUpdated(userData: any, db: any) {
    const clerkUserId = userData.id;
    if (!clerkUserId) {
      throw new Error("User ID is required");
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });

    if (!existingUser) {
      // If user doesn't exist, create them (handles race condition)
      await this.handleUserCreated(userData, db);
      return;
    }

    // Extract email (primary email from email_addresses array)
    const primaryEmail = userData.email_addresses?.find(
      (email: any) => email.id === userData.primary_email_address_id
    ) || userData.email_addresses?.[0];

    // Combine first_name and last_name for name
    const firstName = userData.first_name || "";
    const lastName = userData.last_name || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

    // Build update object
    const updateFields: {
      email?: string;
      name?: string | null;
      image?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (primaryEmail?.email_address) {
      updateFields.email = primaryEmail.email_address;
    }
    if (fullName !== null) {
      updateFields.name = fullName;
    }
    if (userData.image_url !== undefined) {
      updateFields.image = userData.image_url || null;
    }

    // Update user
    await db
      .update(users)
      .set(updateFields)
      .where(eq(users.clerkUserId, clerkUserId))
      .returning();
  }

  private async handleUserDeleted(userData: any, db: any) {
    const clerkUserId = userData.id;
    if (!clerkUserId) {
      throw new Error("User ID is required");
    }

    // Delete user
    const result = await db
      .delete(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .returning();

    if (result.length === 0) {
      // User not found, but this is okay for webhooks (idempotent)
      console.log(`User ${clerkUserId} not found for deletion`);
    }
  }
}
