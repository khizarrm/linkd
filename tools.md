# Tools Documentation

## Overview

All tools are implemented using the `tool()` function from the `ai` SDK. They follow a consistent pattern:
- Zod schemas for input validation
- Environment access via `options.env`
- Graceful error handling (return empty results on failure)
- Located in `worker/src/tools/`

## Tools

### 1. searchWeb

**File**: `worker/src/tools/searchWeb.ts`

**Purpose**: Fast web search for company metadata (revenue, headquarters, domain, etc.)

**Input Schema**:
```typescript
{
  query: string  // Specific keywords to search for
}
```

**Output**:
```typescript
{
  results: Array<{
    title: string;
    url: string;
    content: string;
  }>
}
```

**Implementation**:
- Uses **Exa API** (`exa-js` package)
- Configuration:
  - `type: "fast"` - Fast search mode
  - `useAutoprompt: false` - Skips query rewriting (saves ~1-2s)
  - `numResults: 3` - Returns top 3 results
  - `maxCharacters: 1000` - Limits text content per result
- Error handling: Returns `{ results: [] }` on failure

**Dependencies**:
- `EXA_API_KEY` environment variable

**Usage Example**:
- Query: `"Apple revenue 2024"`
- Query: `"Stripe headquarters"`

---

### 2. peopleFinder

**File**: `worker/src/tools/peopleFinder.ts`

**Purpose**: Finds key executives (CEO, Founders, VPs) for a given company

**Input Schema**:
```typescript
{
  company: string;           // Company name (required)
  website?: string;          // Company website domain (optional, e.g. "stripe.com")
}
```

**Output**:
```typescript
{
  people: Array<{
    name: string;   // Full legal name
    role: string;   // Exact job title
  }>  // Min 1, max 5 people
}
```

**Implementation**:
1. **Web Search Phase**:
   - Executes 2 parallel Exa searches:
     - `${company} leadership team executives`
     - `${company} CEO CTO founder`
   - Each search: `type: "fast"`, `numResults: 3`, `maxCharacters: 1000`
   - Combines results into single context string

2. **LLM Extraction Phase**:
   - Uses `generateObject()` with `gpt-4o-mini`
   - Schema: `PeopleResultSchema` (validates 1-5 people)
   - Prompt priorities:
     1. Founders / CEO
     2. C-Suite (CTO, CFO, COO)
     3. VPs / Heads of Departments
   - **Strictly ignores**: Board members, advisors, investors

**Dependencies**:
- `EXA_API_KEY` environment variable
- `OPENAI_API_KEY` environment variable

**Error Handling**:
- Returns `{ people: [] }` if search fails or LLM extraction fails

---

### 3. emailFinder

**File**: `worker/src/tools/emailFinder.ts`

**Purpose**: Finds verified emails and job titles for a specific person at a company

**Input Schema**:
```typescript
{
  name: string;              // Full name (e.g. "Tobi Lütke")
  domain: string;            // Company domain (e.g. "shopify.com")
  company?: string;          // Company name (optional, e.g. "Shopify")
}
```

**Output**:
```typescript
{
  name: string;
  company: string;
  domain: string;
  employee_title: string;    // Job title extracted from context
  emails: string[];          // Up to 3 verified email addresses
  verification_summary: string;  // e.g. "2 valid out of 3 candidates"
}
```

**Implementation**:

1. **Web Search Phase**:
   - Executes 3 parallel Exa searches:
     - `${name} ${company || domain} email address contact info`
     - `${name} ${company || domain} linkedin profile`
     - `${name} ${company || domain} rocketreach`
   - Each search: `type: "fast"`, `numResults: 2`, `maxCharacters: 1000`
   - Combines results with title, URL, and content

2. **LLM Extraction Phase**:
   - Uses `generateObject()` with `gpt-4o-mini`
   - Schema: `EmailExtractionSchema`
   - Prompt instructions:
     - Look for direct email mentions (especially RocketReach)
     - If no direct email found, generate 3 "best guess" permutations:
       - `first.last@domain`
       - `first@domain`
       - `f.last@domain`
       - `first_last@domain`
     - Extract job title from context

3. **Email Verification Phase**:
   - Deduplicates extracted emails
   - Verifies each email using ZeroBounce API (`verifyEmail()`)
   - Only returns emails with `status === "valid"`
   - Limits to 3 verified emails max

**Dependencies**:
- `EXA_API_KEY` environment variable
- `OPENAI_API_KEY` environment variable
- `ZEROBOUNCE_API_KEY` environment variable

**Error Handling**:
- Returns `{ emails: [], employee_title: "", verification_summary: "Extraction failed" }` on LLM failure
- Returns empty emails array if verification fails

---

### 4. vectorizeSearch

**File**: `worker/src/tools/vectorizeSearch.ts`

**Purpose**: Semantic search for companies and employees using vector embeddings. Searches by meaning, not just keywords.

**Input Schema**:
```typescript
{
  query: string;                                    // Natural language query
  type?: "companies" | "employees" | "both";       // What to search (default: "both")
  limit?: number;                                   // Max results per type (default: 5)
}
```

**Output**:
```typescript
{
  success: boolean;
  query?: string;
  companies?: Array<CompanyResult>;
  employees?: Array<EmployeeResult>;
  error?: string;
}
```

**Implementation**:
- Uses `VectorizeHandler` class from `../lib/vectorize`
- Searches Cloudflare Vectorize indexes:
  - `COMPANY_VECTORS` - Company profile embeddings
  - `EMPLOYEE_VECTORS` - Employee record embeddings
- Semantic search finds matches by meaning (e.g., "AI companies" matches "machine learning startups")
- Returns structured results with company/employee data

**Dependencies**:
- Cloudflare Vectorize bindings (`COMPANY_VECTORS`, `EMPLOYEE_VECTORS`)
- Database access (via `VectorizeHandler`)

**Usage Examples**:
- Query: `"AI companies in San Francisco"` → Finds companies by industry/location
- Query: `"CTOs at semiconductor companies"` → Finds employees by role/industry
- Query: `"Anthropic employees"` → Finds employees by company

**Error Handling**:
- Returns `{ success: false, error: string, companies: [], employees: [] }` on failure

---

## Tool Exports

**File**: `worker/src/tools/index.ts`

All tools are exported individually and as a `ToolSet`:
```typescript
export const tools = { 
  searchWeb, 
  vectorizeSearch, 
  peopleFinder, 
  emailFinder 
} satisfies ToolSet;
```

## Common Patterns

### Environment Access
All tools access environment variables via:
```typescript
const env = ((options as any)?.env ?? process.env) as CloudflareBindings;
```

### Error Handling
- Tools return empty results (`[]`, `{}`) rather than throwing
- Errors are logged to console
- API key validation throws errors (fail fast)

### Performance Optimizations
- **Exa searches**: `useAutoprompt: false` saves 1-2 seconds
- **Parallel queries**: Multiple searches run concurrently with `Promise.all()`
- **Limited results**: `numResults: 2-3`, `maxCharacters: 1000` to reduce payload
- **LLM model**: Uses `gpt-4o-mini` for extraction (cheaper, faster than gpt-4o)

### Tool Usage in Orchestrator
The orchestrator agent uses 3 tools in sequence:
1. `searchWeb` → Company metadata
2. `peopleFinder` → Leadership team
3. `emailFinder` → Verified emails for each person

`vectorizeSearch` is available but not used by the orchestrator agent.

