import { fromHono } from "chanfana";
import { OpenAPIRoute } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { CloudflareBindings } from "./env.d";
import Orchestrator from "./agents/orchestrator";
import { ProtectedEmailSendRoute } from "./endpoints/emailSend";
import {
  GoogleAuthInitiateRoute,
  GoogleAuthCallbackRoute,
  GoogleAuthStatusRoute,
} from "./endpoints/googleAuth";
import {
  Agent,
  AgentNamespace,
  getAgentByName,
  routeAgentRequest,
} from "agents";
import { z } from "zod";
import {
  ProtectedTemplatesCreateRoute,
  ProtectedTemplatesListRoute,
  ProtectedTemplatesDeleteRoute,
  ProtectedTemplatesUpdateRoute,
  ProtectedTemplateProcessRoute,
} from "./endpoints/templates";
import {
  ProtectedCompaniesListRoute,
  ProtectedCompanyEmployeesRoute,
} from "./endpoints/companies";
import {
  ProtectedChatsListRoute,
  ProtectedChatsCreateRoute,
  ProtectedChatsGetRoute,
  ProtectedChatsUpdateRoute,
  ProtectedChatsDeleteRoute,
  ProtectedMessagesCreateRoute,
} from "./endpoints/chats";
import {
  VectorizePopulateCompaniesRoute,
  VectorizePopulateEmployeesRoute,
  VectorizeSearchRoute,
  VectorizeStatsRoute,
  VectorizeUpdateCompanyRoute,
} from "./endpoints/vectorize";
import { PublicWaitlistRoute } from "./endpoints/waitlist";
import { PublicFeedbackRoute } from "./endpoints/feedback";
import { ClerkWebhookRoute } from "./endpoints/clerkWebhook";
import { ResearchAgentRoute } from "./agents/research/endpoint";
import { findExistingCompanyAndEmployees } from "./db/companies";

interface Env {
  Orchestrator: AgentNamespace<Orchestrator>;
}

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Global CORS configuration for all routes
app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://try-linkd.com",
        "https://www.try-linkd.com",
      ];

      // 1. Handle missing origin (e.g., server-side calls or Postman)
      if (!origin) {
        return allowed[0]; // Safe to default to localhost for non-browser tools
      }

      // 2. Check if origin is explicitly allowed
      if (allowed.includes(origin)) {
        return origin;
      }

      // 3. Check for dynamic localhost ports (preview environments)
      if (/^http:\/\/localhost:\d+$/.test(origin)) {
        return origin;
      }

      // 4. Block unauthorized origins
      // Returning null blocks the request (secure)
      // Log for debugging in Cloudflare Worker logs
      console.log("Blocked CORS origin:", origin);
      return null;
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

// Create OpenAPI instance
const openapi = fromHono(app, {
  docs_url: "/",
  schema: {
    info: {
      title: "Applyo API",
      version: "1.0.0",
      description: `A modern API for outreach and company management.`,
    },
  },
});

class OrchestratorRoute extends OpenAPIRoute {
  schema = {
    tags: ["Agents"],
    summary: "Call Orchestrator Agent",
    description:
      "Find emails for people at a company. Takes a query like 'find founder emails at datacurve' or just 'datacurve'",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              query: z
                .string()
                .min(1)
                .describe(
                  "Query like 'find founder emails at datacurve' or just 'datacurve'",
                ),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Agent response with people and their emails",
        content: {
          "application/json": {
            schema: z.object({
              company: z.string().describe("Company name"),
              people: z
                .array(
                  z.object({
                    name: z.string().describe("Person's full name"),
                    role: z.string().describe("Job title"),
                    emails: z
                      .array(z.string())
                      .describe("List of email addresses"),
                  }),
                )
                .describe("List of people with their emails"),
              state: z.any().optional(),
              error: z.string().optional(),
            }),
          },
        },
      },
    },
  };

  async handle(c: any) {
    const env = c.env;

    const reqData = await this.getValidatedData<typeof this.schema>();
    const query = reqData.body.query;

    // Check database first before calling orchestrator
    try {
      const existing = await findExistingCompanyAndEmployees(env.DB, query);

      if (existing && existing.employees.length > 0) {
        // Format response to match orchestrator output
        const people = existing.employees
          .filter((emp) => emp.email && emp.email.trim() !== "") // Only include employees with emails
          .map((emp) => ({
            name: emp.employeeName,
            role: emp.employeeTitle || null,
            emails: emp.email ? [emp.email] : [],
          }));

        if (people.length > 0) {
          return new Response(
            JSON.stringify({
              company: existing.company.companyName,
              website: existing.company.website || null,
              description: existing.company.description || null,
              techStack: existing.company.techStack || null,
              industry: existing.company.industry || null,
              yearFounded: existing.company.yearFounded || null,
              headquarters: existing.company.headquarters || null,
              revenue: existing.company.revenue || null,
              funding: existing.company.funding || null,
              employeeCountMin: existing.company.employeeCountMin || null,
              employeeCountMax: existing.company.employeeCountMax || null,
              people,
              state: {},
            }),
            {
              headers: { "Content-Type": "application/json" },
              status: 200,
            },
          );
        }
      }
    } catch (dbError) {
      // If DB check fails, return maintenance message
      console.error("Error checking database:", dbError);
    }

    // If not found in DB, return maintenance message instead of calling orchestrator
    // This saves credits by not doing research for companies not in DB
    return new Response(
      JSON.stringify({
        company: "",
        website: "",
        people: [],
        message: "currently undergoing maintenance :(",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
}

// Register routes
openapi.post("/api/public/waitlist", PublicWaitlistRoute);
openapi.post("/api/public/feedback", PublicFeedbackRoute);
// @ts-expect-error - chanfana type inference issue with webhook routes
openapi.post("/api/webhooks/clerk", ClerkWebhookRoute);
openapi.post("/api/agents/orchestrator", OrchestratorRoute);
openapi.post("/api/protected/email/send", ProtectedEmailSendRoute);
openapi.get("/api/protected/auth/google", GoogleAuthInitiateRoute);
openapi.get("/api/protected/auth/google/callback", GoogleAuthCallbackRoute);
openapi.get("/api/protected/auth/google/status", GoogleAuthStatusRoute);
openapi.post("/api/protected/templates", ProtectedTemplatesCreateRoute);
openapi.get("/api/protected/templates", ProtectedTemplatesListRoute);
openapi.delete("/api/protected/templates/:id", ProtectedTemplatesDeleteRoute);
openapi.put("/api/protected/templates/:id", ProtectedTemplatesUpdateRoute);
openapi.post("/api/protected/templates/process", ProtectedTemplateProcessRoute);
openapi.get("/api/protected/companies", ProtectedCompaniesListRoute);
openapi.get(
  "/api/protected/companies/:id/employees",
  ProtectedCompanyEmployeesRoute,
);

openapi.get("/api/protected/chats", ProtectedChatsListRoute);
openapi.post("/api/protected/chats", ProtectedChatsCreateRoute);
openapi.get("/api/protected/chats/:id", ProtectedChatsGetRoute);
openapi.put("/api/protected/chats/:id", ProtectedChatsUpdateRoute);
openapi.delete("/api/protected/chats/:id", ProtectedChatsDeleteRoute);
openapi.post("/api/protected/chats/:id/messages", ProtectedMessagesCreateRoute);

// Research Agent Route (OpenAI Agents SDK)
openapi.post("/api/agents/research", ResearchAgentRoute);

// Vectorize Routes
openapi.post(
  "/api/vectorize/populate-companies",
  VectorizePopulateCompaniesRoute,
);
openapi.post(
  "/api/vectorize/populate-employees",
  VectorizePopulateEmployeesRoute,
);
openapi.get("/api/vectorize/search", VectorizeSearchRoute);
openapi.get("/api/vectorize/stats", VectorizeStatsRoute);
openapi.post("/api/vectorize/update-company/:id", VectorizeUpdateCompanyRoute);

// Simple health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      const agentResponse = await routeAgentRequest(request, env);
      if (agentResponse) return agentResponse;
    }
    return openapi.fetch(request, env, ctx);
  },
};

export { Orchestrator };
