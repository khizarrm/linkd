# Backend Orchestrator Agent - Prompt Research

## Files

### Core Agent Implementation
- `worker/src/agents/orchestrator.ts`: Main orchestrator agent class
  - Extends `Agent<CloudflareBindings>` from `agents` package
  - Implements `onStart()` and `onRequest()` lifecycle methods
  - Contains primary prompt template (lines 41-83)

### Routing & Entry Points
- `worker/src/index.ts` (lines 79-182): `OrchestratorRoute` class
  - OpenAPI route handler at `/api/agents/orchestrator`
  - Checks database cache before invoking agent
  - Calls agent via `getAgentByName(env.Orchestrator, "main")`

### Tools Used by Agent
- `worker/src/tools/searchWeb.ts`: Web search tool (Exa API)
- `worker/src/tools/peopleFinder.ts`: People search tool (Exa + LLM extraction)
- `worker/src/tools/emailFinder.ts`: Email discovery tool (Exa + LLM + verification)

### Configuration
- `worker/wrangler.toml` (lines 23-29): Durable Object binding for Orchestrator
- `worker/src/env.d.ts`: Type definitions for CloudflareBindings

## Data Structures

### Agent Request/Response
```typescript
// Request
{ query: string }

// Response
{
  company: string;
  website: string | null;
  description: string | null;
  techStack: string | null;
  industry: string | null;
  yearFounded: number | null;
  headquarters: string | null;
  revenue: string | null;
  funding: string | null;
  employeeCountMin: number | null;
  employeeCountMax: number | null;
  people: Array<{
    name: string;
    role: string;
    emails: string[];
  }>;
  favicon: string | null;
  state: any;
}
```

### AI SDK Configuration
- Model: `openai("gpt-4o-2024-11-20")`
- Tool choice: `"auto"` (agent decides when to use tools)
- Stop condition: `stepCountIs(15)` (max 15 tool-calling steps)

## Patterns

### Agent Architecture
- **Durable Object pattern**: Agent runs as Cloudflare Durable Object (stateful, single-instance)
- **Base class pattern**: Extends `Agent<T>` with lifecycle hooks
- **Tool orchestration**: Agent uses 3 tools in sequence (searchWeb → peopleFinder → emailFinder)

### Prompt Structure
- **Role definition**: "You are an external lead enrichment agent."
- **Tool descriptions**: Lists available tools and their purposes
- **Process steps**: 5-step workflow (Analyze → Company Data → People Data → Email Data → Output)
- **Output schema**: Inline JSON example showing expected structure
- **Rules**: Behavioral constraints (aggressive search, null handling, email verification)

### Response Processing
- **JSON extraction**: Strips markdown code blocks (` ```json `, ` ``` `)
- **Regex fallback**: Extracts JSON object if parsing fails
- **Post-processing**: Filters people without emails, saves to DB, adds favicon

### Tool Implementation Pattern
- All tools use `tool()` from `ai` SDK
- Zod schemas for input validation
- Environment access via `options.env`
- Error handling returns empty results gracefully

## Main Prompt (Lines 41-83)

```
You are an external lead enrichment agent.

# Tools Available:
1. searchWeb: Finds company metadata (Revenue, HQ, Domain).
2. peopleFinder: Finds specific names/roles of leaders.
3. emailFinder: Finds emails given Name + Domain.

# Process:
1. Analyze Request: Identify Company Name.
2. Company Data: Call 'searchWeb' to find domain, revenue, HQ, etc.
3. People Data: Call 'peopleFinder' with the company name.
4. Email Data: Call 'emailFinder' for the people returned in step 3.
5. Final Output: Return the comprehensive JSON.

# Output Schema:
{
  "company": "Company Name",
  "website": "https://company.com",
  "description": "Brief description from web",
  "techStack": "e.g. React, AWS (if found)",
  "industry": "Industry name",
  "yearFounded": 2020,
  "headquarters": "City, State, Country",
  "revenue": "e.g. $10M ARR (if found)",
  "funding": "e.g. Series A (if found)",
  "employeeCountMin": 10,
  "employeeCountMax": 50,
  "people": [
    {
      "name": "Full Name",
      "role": "Job Title",
      "emails": ["email1@domain.com"]
    }
  ]
}

# Rules:
- Use 'searchWeb' aggressively to fill metadata fields (Revenue, Funding, HQ).
- If exact numbers (revenue/funding) are not public, leave those specific fields null.
- Only include people with at least one verified email.
- Return raw JSON only.

User query: ${query}
```

### Prompt Characteristics
- **Template literal**: User query injected at end
- **Structured sections**: Tools, Process, Output Schema, Rules
- **Explicit workflow**: Step-by-step instructions
- **Schema as example**: JSON shown inline (not enforced by Zod)
- **Behavioral rules**: Aggressive search, null handling, email verification requirement

## Strategy

### Prompt Design Decisions
1. **Explicit process steps**: Forces sequential tool usage (searchWeb → peopleFinder → emailFinder)
2. **Inline schema**: Shows expected output format without strict validation
3. **Rule-based constraints**: "aggressively", "only include", "raw JSON only"
4. **Tool descriptions**: Brief one-liners per tool

### Execution Flow
1. Route receives query → checks DB cache
2. If not cached → invokes agent via Durable Object
3. Agent calls `generateText()` with prompt + tools
4. LLM orchestrates tool calls (up to 15 steps)
5. Response parsed, filtered, saved to DB
6. Returns JSON with favicon added

### Error Handling
- Query validation: Returns 400 if query missing
- JSON parsing: Multiple fallbacks (strip markdown, regex extract)
- DB errors: Logged but don't fail request
- Empty results: Returns `{ message: "no emails found" }` if no people with emails

## Unknowns

1. **Agent base class**: What does `Agent<T>` from `agents` package provide? (onStart, onRequest, state management)
2. **Durable Object state**: What is `this.state` used for? (appears in response but not set in code)
3. **Tool execution context**: How does `options.env` get populated? (tools receive env via options parameter)
4. **Step limit rationale**: Why 15 steps? (prevents infinite loops but may cut off complex queries)
5. **Prompt effectiveness**: Does explicit 5-step process match actual LLM behavior? (may deviate from instructions)
6. **Schema enforcement**: Output schema is example only - no Zod validation on LLM output
7. **Tool choice strategy**: `"auto"` lets LLM decide - could be `"required"` or `"none"` for different behaviors
