import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";
import { users } from "../db/auth.schema";
import { eq } from "drizzle-orm";

export class ProtectedProfileGetRoute extends OpenAPIRoute {
  schema = {
    tags: ["API"],
    summary: "Get User Profile",
    request: {
      query: z.object({
        clerkUserId: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Profile retrieved",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              user: z.object({
                clerkUserId: z.string(),
                email: z.string(),
                name: z.string().nullable(),
                image: z.string().nullable(),
                linkedinUrl: z.string().nullable(),
                githubUrl: z.string().nullable(),
                websiteUrl: z.string().nullable(),
                twitterUrl: z.string().nullable(),
                info: z.string().nullable(),
                createdAt: z.string(),
                updatedAt: z.string(),
              }),
            }),
          },
        },
      },
      "404": {
        description: "User not found",
      },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const reqData = await this.getValidatedData<typeof this.schema>();
    const { clerkUserId } = reqData.query;
    const db = drizzle(env.DB, { schema });

    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return {
      success: true,
      user: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
        image: user.image,
        linkedinUrl: user.linkedinUrl,
        githubUrl: user.githubUrl,
        websiteUrl: user.websiteUrl,
        twitterUrl: user.twitterUrl,
        info: user.info,
        createdAt: new Date(user.createdAt).toISOString(),
        updatedAt: new Date(user.updatedAt).toISOString(),
      },
    };
  }
}

export class ProtectedProfileUpdateRoute extends OpenAPIRoute {
  schema = {
    tags: ["API"],
    summary: "Update User Profile",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              clerkUserId: z.string(),
              name: z.string().optional(),
              linkedinUrl: z.string().optional(),
              githubUrl: z.string().optional(),
              websiteUrl: z.string().optional(),
              twitterUrl: z.string().optional(),
              info: z.string().optional(),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Profile updated",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              user: z.object({
                clerkUserId: z.string(),
                email: z.string(),
                name: z.string().nullable(),
                image: z.string().nullable(),
                linkedinUrl: z.string().nullable(),
                githubUrl: z.string().nullable(),
                websiteUrl: z.string().nullable(),
                twitterUrl: z.string().nullable(),
                info: z.string().nullable(),
                createdAt: z.string(),
                updatedAt: z.string(),
              }),
            }),
          },
        },
      },
      "404": {
        description: "User not found",
      },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const updateData = await this.getValidatedData<typeof this.schema>().then(
      (d) => d.body,
    );
    const { clerkUserId } = updateData;
    const db = drizzle(env.DB, { schema });

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });

    if (!existingUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Build update object (only include fields that are provided)
    const updateFields: {
      name?: string;
      linkedinUrl?: string | null;
      githubUrl?: string | null;
      websiteUrl?: string | null;
      twitterUrl?: string | null;
      info?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (updateData.name !== undefined) {
      updateFields.name = updateData.name || null;
    }
    if (updateData.linkedinUrl !== undefined) {
      updateFields.linkedinUrl = updateData.linkedinUrl || null;
    }
    if (updateData.githubUrl !== undefined) {
      updateFields.githubUrl = updateData.githubUrl || null;
    }
    if (updateData.websiteUrl !== undefined) {
      updateFields.websiteUrl = updateData.websiteUrl || null;
    }
    if (updateData.twitterUrl !== undefined) {
      updateFields.twitterUrl = updateData.twitterUrl || null;
    }
    if (updateData.info !== undefined) {
      updateFields.info = updateData.info || null;
    }

    // Update user
    const result = await db
      .update(users)
      .set(updateFields)
      .where(eq(users.clerkUserId, clerkUserId))
      .returning();

    const updatedUser = result[0];

    return {
      success: true,
      user: {
        clerkUserId: updatedUser.clerkUserId,
        email: updatedUser.email,
        name: updatedUser.name,
        image: updatedUser.image,
        linkedinUrl: updatedUser.linkedinUrl,
        githubUrl: updatedUser.githubUrl,
        websiteUrl: updatedUser.websiteUrl,
        twitterUrl: updatedUser.twitterUrl,
        info: updatedUser.info,
        createdAt: new Date(updatedUser.createdAt).toISOString(),
        updatedAt: new Date(updatedUser.updatedAt).toISOString(),
      },
    };
  }
}
