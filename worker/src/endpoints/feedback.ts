import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";
import { feedback } from "../db/feedback.schema";

export class PublicFeedbackRoute extends OpenAPIRoute {
  schema = {
    tags: ["Public"],
    summary: "Submit Feedback",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              email: z.string().email(),
              feedback: z.string().min(1),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Successfully submitted feedback",
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
    },
  };

  async handle(c: any) {
    console.log("[FEEDBACK] Endpoint called");

    const env = c.env;
    console.log("[FEEDBACK] Environment check:", {
      hasDB: !!env.DB,
      dbType: typeof env.DB
    });

    let validatedData;
    try {
      validatedData = await this.getValidatedData<typeof this.schema>().then(d => d.body);
      console.log("[FEEDBACK] Validated data:", {
        emailProvided: !!validatedData.email,
        feedbackLength: validatedData.feedback?.length || 0
      });
    } catch (error) {
      console.error("[FEEDBACK] Validation error:", error);
      throw error;
    }

    const { email, feedback: feedbackText } = validatedData;

    console.log("[FEEDBACK] Initializing database");
    const db = drizzle(env.DB, { schema });
    console.log("[FEEDBACK] Database initialized");

    try {
      const newFeedback = {
        id: crypto.randomUUID(),
        email,
        feedback: feedbackText,
      };

      console.log("[FEEDBACK] Attempting to insert:", {
        id: newFeedback.id,
        hasEmail: !!newFeedback.email,
        feedbackLength: newFeedback.feedback.length
      });

      await db.insert(feedback).values(newFeedback);
      console.log("[FEEDBACK] Insert successful");

      return {
        success: true,
        message: "Successfully submitted feedback",
      };
    } catch (error: any) {
      console.error("[FEEDBACK] Database insert failed:", {
        errorName: error?.name,
        errorMessage: error?.message,
        errorStack: error?.stack,
        errorCause: error?.cause,
        fullError: JSON.stringify(error, null, 2)
      });

      return Response.json(
        {
          error: "Failed to submit feedback",
          message: error?.message || "Unknown error",
          details: error?.cause || error?.toString()
        },
        { status: 500 }
      );
    }
  }
}
