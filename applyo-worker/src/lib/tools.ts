import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { VectorizeHandler } from "./vectorize";
import type { CloudflareBindings } from "../env.d";

interface ExaSearchResult {
    title?: string;
    url?: string;
    text?: string;
    published_date?: string;
    author?: string;
}

interface ExaApiResponse {
    results?: ExaSearchResult[];
    autopromptString?: string;
}

export const searchWeb = tool({

    description: "Search the web for information. Use this to find people, companies, or any other information online.", 
    inputSchema: z.object({
        query: z.string().describe("The search query to find information on the web")
    }),
  
    execute: async ({ query }, options) => {
        console.log("using search tool")
        const env = ((options as any)?.env ?? process.env) as {
            EXA_API_KEY?: string;
        };
        if (!env?.EXA_API_KEY) {
            throw new Error("Search tool - EXA_API_KEY is missing from the environment");
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout for Exa
        
        try {
            const response = await fetch('https://api.exa.ai/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': env.EXA_API_KEY
                },
                body: JSON.stringify({
                    query: query,
                    num_results: 10,
                    use_autoprompt: true,
                    contents: {
                        text: {
                            max_characters: 500
                        }
                    }
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const responseText = await response.text();
            
            if (!response.ok) {
                throw new Error(`Exa AI request failed: ${response.status} ${response.statusText} - ${responseText}`);
            }

            const data = JSON.parse(responseText) as ExaApiResponse;
            
            return {
                results: (data.results || []).map((r: ExaSearchResult) => ({
                    title: r.title || '',
                    url: r.url || '',
                    content: r.text || ''
                }))
            };
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Search request timed out after 10 seconds');
            }
            throw error;
        }
    }
});

export const vectorizeSearch = tool({
    description: "Search for companies and employees using semantic search. This searches through company profiles and employee records to find relevant matches based on meaning, not just keywords. Use this to find companies by industry, tech stack, or description, or to find employees by role, company, or expertise.",
    inputSchema: z.object({
        query: z.string().describe("The search query in natural language (e.g., 'AI companies in San Francisco', 'CTOs at semiconductor companies', 'Anthropic employees')"),
        type: z.enum(['companies', 'employees', 'both']).optional().describe("What to search for: 'companies' for company profiles only, 'employees' for people only, 'both' for everything (default)"),
        limit: z.number().optional().describe("Maximum number of results to return per type (default: 5)")
    }),
    execute: async ({ query, type, limit }, options) => {
        console.log('[vectorizeSearch] Starting search:', { query, type: type || 'both', limit: limit || 5 });
        
        const env = ((options as any)?.env ?? process.env) as CloudflareBindings;
        if (!env) {
            console.error('[vectorizeSearch] Error: environment bindings are missing');
            throw new Error("Vectorize search tool - environment bindings are missing");
        }
        
        try {
            const handler = new VectorizeHandler(env);
            const searchOptions = { 
                type: type || 'both' as 'companies' | 'employees' | 'both', 
                limit: limit || 5 
            };
            
            console.log('[vectorizeSearch] Calling VectorizeHandler.search with options:', searchOptions);
            const result = await handler.search(query, searchOptions);
            
            if (!result.success) {
                console.error('[vectorizeSearch] Search failed:', result.error);
                return {
                    success: false,
                    error: result.error || 'Search failed',
                    companies: [],
                    employees: []
                };
            }
            
            const companyCount = result.results.companies?.length || 0;
            const employeeCount = result.results.employees?.length || 0;
            console.log('[vectorizeSearch] Search successful:', { 
                query: result.query, 
                type: result.type,
                companyResults: companyCount,
                employeeResults: employeeCount
            });
            
            return {
                success: true,
                query: result.query,
                companies: result.results.companies || [],
                employees: result.results.employees || []
            };
        } catch (error) {
            console.error('[vectorizeSearch] Exception during search:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                companies: [],
                employees: []
            };
        }
    }
});

export const tools = { searchWeb, vectorizeSearch } satisfies ToolSet;