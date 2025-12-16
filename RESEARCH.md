# Domain Extractor Research - www Subdomain Issue

## Files

### Core Domain Extraction
- `worker/src/lib/utils.ts` (lines 56-180): Domain extraction and validation functions
  - `extractDomain()`: Extracts hostname from URL using URL constructor
  - `extractDomainFromQuery()`: Extracts domain from query string using regex patterns
  - `validateDomain()`: Validates domain by attempting HTTP/HTTPS fetch

### Orchestrator Agent
- `worker/src/agents/orchestrator.ts` (lines 36-47): Uses domain extraction
  - Line 37: Calls `extractDomainFromQuery(query)` to get domain
  - Line 44: Validates domain with `validateDomain(domain)`
  - Line 67: Passes domain directly to `emailFinder.execute()`

### Email Finder Tool
- `worker/src/tools/emailFinder.ts` (lines 52-67, 106-166): Email generation logic
  - `getEmailDomain()`: Receives domain and uses it directly for email generation
  - `generateEmailPatterns()`: Generates emails using domain as-is
  - `scrapeEmailPattern()`: Scrapes website using domain (www is fine here)

## Data Flow

1. **Query Input**: User provides "www.whatever.com"
2. **Extraction** (`extractDomainFromQuery`):
   - Regex pattern `/([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}/gi` matches "www.whatever.com"
   - Returns "www.whatever.com" (lowercased)
3. **Validation** (`validateDomain`):
   - Accepts "www.whatever.com" (valid for web access)
   - Returns `{ valid: true }`
4. **Email Generation** (`emailFinder.execute`):
   - Receives `domain = "www.whatever.com"`
   - `getEmailDomain("www.whatever.com")` returns `["www.whatever.com"]`
   - `generateEmailPatterns()` creates emails like `first.last@www.whatever.com` ❌

## Problem

**Root Cause**: `getEmailDomain()` in `emailFinder.ts` uses the domain as-is without stripping "www." prefix.

**Impact**: 
- Emails generated as `first.last@www.whatever.com` (invalid)
- Should be `first.last@whatever.com` (valid)

**Why www is extracted**:
- `extractDomainFromQuery` correctly extracts "www.whatever.com" (valid for web scraping)
- `extractDomain()` using URL constructor preserves full hostname including subdomains
- No logic exists to strip "www." before email generation

## Patterns

### Domain Extraction Strategy
- **URL with protocol**: Uses `extractDomain()` → URL constructor → `hostname` property
- **Plain domain in query**: Uses regex pattern matching → returns matched string
- **No www stripping**: Neither extraction function removes "www." prefix

### Email Domain Handling
- **Current**: Uses website domain directly for email generation
- **Expected**: Should strip "www." and other common subdomains before email generation
- **Web scraping**: Can use full domain with www (line 9 in emailFinder.ts)

## Strategy

### Option 1: Strip www in `getEmailDomain()` (Recommended)
- Modify `getEmailDomain()` in `emailFinder.ts` to strip "www." prefix
- Keep full domain for web scraping (already works)
- Minimal change, localized fix

### Option 2: Strip www in `extractDomainFromQuery()`
- Strip "www." during extraction
- Affects all uses of extracted domain (web scraping, validation)
- May break web scraping if www is required

### Option 3: Strip www in orchestrator before emailFinder
- Normalize domain in orchestrator before passing to emailFinder
- Keep original domain for web scraping
- Requires passing both normalized and original domains

## Unknowns

1. **Are there other subdomains to strip?** (e.g., "mail.", "blog.", "app.")
2. **Should www stripping be configurable?** (some companies use www for emails)
3. **Does web scraping need www?** (currently uses full domain, may work without)
4. **Are there edge cases?** (e.g., "www2.whatever.com", "www-whatever.com")
