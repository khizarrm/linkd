import type { D1Database, KVNamespace, VectorizeIndex, Ai } from "@cloudflare/workers-types";
import type { AgentNamespace } from "agents";
import type Orchestrator from "./agents/orchestrator";

export interface CloudflareBindings {
    DB: D1Database;
    KV?: KVNamespace;
    COMPANY_VECTORS: VectorizeIndex;
    EMPLOYEE_VECTORS: VectorizeIndex;
    AI: Ai;
    Orchestrator: AgentNamespace<Orchestrator>;
    EXA_API_KEY: string;
    ZEROBOUNCE_API_KEY: string;
    OPENAI_API_KEY: string;
    ANTHROPIC_API_KEY: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    CLERK_SECRET_KEY: string;
    CLERK_WEBHOOK_SIGNING_SECRET: string;
    TAVILY_API_KEY: string;
}

declare global {
    namespace NodeJS {
        interface ProcessEnv extends CloudflareBindings {
            // Additional environment variables can be added here
        }
    }
}