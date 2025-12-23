# Orchestrator Agent Research

## Files

- `src/agents/orchestrator.ts` - Main Orchestrator agent class
- `src/tools/emailFinder.ts` - Email finding tool
- `src/tools/peopleFinder.ts` - People finding tool (not used by Orchestrator)
- `src/tools/searchWeb.ts` - Web search tool (not used by Orchestrator)
- `src/tools/vectorizeSearch.ts` - Vector search tool (not used by Orchestrator)
- `src/lib/utils.ts` - Domain extraction, validation, email verification
- `src/db/companies.ts` - Database operations for companies/employees
- `src/index.ts` - Route handler that invokes Orchestrator
- `src/env.d.ts` - Type definitions for Cloudflare bindings

## Data Structures

### Orchestrator Schemas
- `CompanyMetadataSchema` - Company info (name, description, techStack, industry, yearFounded, headquarters, revenue, funding, employeeCount)
- `PersonSchema` - Person info (name, role, confidence: "high"|"medium"|"low")
- `PeopleExtractionSchema` - Extraction result (people array, needsMoreSearch boolean, reasoning string)

### Database Tables
- `company_profiles` - Company metadata (id, companyName, website, description, techStack, industry, yearFounded, headquarters, revenue, funding, employeeCountMin/Max)
- `employees` - Employee records (id, employeeName, employeeTitle, email, companyName)

### Tool Input/Output
- `emailFinder`: Input `{ people: [{name, role?}], domain }` → Output `{ domain, people: [{name, role, emails: string[]}], summary }`
- Internal `search` tool: Input `{ query, numResults? }` → Output `[{title, url, content}]`

## Patterns

### Agent Base Class
- Extends `Agent<CloudflareBindings>` from "agents" package
- Implements `onStart()` and `onRequest(request)` lifecycle methods
- `onRequest` receives HTTP request, returns Response
- Access to `this.env` for Cloudflare bindings (DB, API keys, etc.)

### Agentic Loop Pattern
- Multi-step LLM orchestration with tool use
- Uses `generateText` with tools for research/search
- Uses `generateObject` with Zod schemas for structured extraction
- Extracts tool results from `steps[].toolResults[].output` (AI SDK v5 format)
- Validates context length before extraction to prevent hallucinations

### Tool Creation Pattern
- Tools created via `tool()` from "ai" package
- Define `description`, `inputSchema` (Zod), `execute` function
- Tools receive `options` param with `env` for API keys
- Tools return structured data, errors handled gracefully

### Database Pattern
- Uses Drizzle ORM with D1 (SQLite)
- `upsertCompany` - Insert or update company by name/website
- `upsertEmployee` - Insert or update employee by name+company
- Normalizes website URLs (strips www., ensures https://)

## Strategy

### Orchestrator Flow

1. **Request Handling** (`onRequest`)
   - Extract domain from query using `extractDomainFromQuery()`
   - Validate domain with `validateDomain()` (HTTP HEAD check)
   - Check DB cache via `findExistingCompanyAndEmployees()` (in route handler, not agent)
   - If cached, return immediately
   - Otherwise run agent loop

2. **Agent Loop** (`runAgentLoop`)
   - Creates internal `search` tool using Exa API
   - **Step 1: Research** - `generateText` with search tool (max 3 roundtrips)
     - System prompt: Understand company, find leadership sources
     - Searches: `"{domain}" company`, `"{domain}" founders OR leadership`
   - **Step 2: Extract Metadata** - `generateObject` with `CompanyMetadataSchema`
     - Extracts from research context (tool results)
   - **Step 3: Find People** - `generateText` with search tool (max 5 roundtrips)
     - System prompt: Find leadership, verify company match
     - Searches: `"{domain}" founders CEO`, `site:linkedin.com/in "{domain}"`, `site:crunchbase.com "{domain}"`
   - **Step 4: Extract People** - `generateObject` with `PeopleExtractionSchema`
     - Validates context length (rejects if <100 chars to prevent hallucinations)
     - Extracts people with confidence levels
   - **Step 5: Validation** (conditional)
     - If `needsMoreSearch` or all confidence="low", run additional searches
     - Re-extract with validation context
   - Returns `{ metadata, people }` (filters out "low" confidence)

3. **Email Finding**
   - Calls `emailFinder.execute()` with validated people
   - Returns only people with verified emails

4. **Database Save**
   - `upsertCompany()` - saves company metadata
   - `upsertEmployee()` - saves each person with email

### Tool Implementations

**Internal Search Tool** (in orchestrator)
- Uses Exa API (`exa.searchAndContents`)
- Config: `type: "auto"`, `useAutoprompt: false`, `numResults: 5`, `maxCharacters: 1500`
- Returns `[{title, url, content}]`
- Errors return empty array

**emailFinder Tool**
- **Pattern Detection**: Scrapes company website for existing emails, detects pattern (first.last, first_last, firstlast, f.last, first)
- **Domain Handling**: Strips subdomains (www., mail., blog., app.), tries both .com/.ca variants
- **Email Generation**: Generates candidates based on detected pattern or defaults
- **Verification**: Uses ZeroBounce API (`verifyEmail()`) to validate emails
- **Sequential Processing**: Processes people one at a time, stops at first valid email found
- Returns first person with valid email, or empty if none found

**Tool Result Extraction**
- AI SDK v5 format: `steps[].toolResults[].output`
- Flattens arrays, filters for objects with `title` or `content`
- Joins into context string for LLM prompts

## Unknowns

- **Agent base class**: Source/implementation of `Agent` from "agents" package not in codebase (external dependency)
- **Tool result format**: Why `output` vs `result` property? (AI SDK v5 vs v4 difference)
- **Confidence thresholds**: Why 100 chars minimum for context validation?
- **Email finder early exit**: Why stop at first valid email instead of finding all?
- **Exa API limits**: Rate limits, cost implications not documented
- **ZeroBounce API**: Rate limits, validation accuracy not documented
- **Database caching**: Route handler checks DB, but agent doesn't - potential race condition?
- **Error recovery**: What happens if Step 1-4 fail partially? (Some steps have try/catch, others don't)

