import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";
import { waitlist } from "../db/waitlist.schema";

export class PublicWaitlistRoute extends OpenAPIRoute {
  schema = {
    tags: ["Public"],
    summary: "Join Waitlist",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              email: z.string().email(),
              name: z.string().optional(),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Successfully joined waitlist",
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
        description: "Invalid request",
      },
      "409": {
        description: "Email already exists in waitlist",
      },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const { email, name } = await this.getValidatedData<typeof this.schema>().then(d => d.body);

    const db = drizzle(env.DB, { schema });

    try {
      const newWaitlistEntry = {
        id: crypto.randomUUID(),
        email,
        name: name || null,
        status: "pending",
      };

      await db.insert(waitlist).values(newWaitlistEntry);

      return {
        success: true,
        message: "Successfully joined waitlist",
      };
    } catch (error: any) {
      // Check if it's a unique constraint violation
      if (error.message?.includes("UNIQUE constraint failed") || error.message?.includes("unique")) {
        return Response.json(
          { error: "Email already exists in waitlist" },
          { status: 409 }
        );
      }

      return Response.json(
        { error: "Failed to join waitlist", message: (error as Error).message },
        { status: 500 }
      );
    }
  }
}

