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
    GOOGLE_REFRESH_TOKEN?: string;
    CLERK_SECRET_KEY: string;
    CLERK_WEBHOOK_SIGNING_SECRET: string;
    TAVILY_API_KEY: string;
    RESEARCH_BASELINE_TELEMETRY?: string;
    RESEARCH_SEND_LAST_MESSAGE_ONLY?: string;
    RESEARCH_SERVER_RECONSTRUCT_CONTEXT?: string;
    RESEARCH_PRUNE_CONTEXT?: string;
    RESEARCH_COMPACT_CONTEXT?: string;
    RESEARCH_PROMPT_CACHE?: string;
    RESEARCH_OPTIMIZE_TOOL_LOOP?: string;
}

declare global {
    namespace NodeJS {
        interface ProcessEnv extends CloudflareBindings {
            // Additional environment variables can be added here
        }
    }
}
