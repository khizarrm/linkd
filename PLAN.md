# Domain Validation Guard for Orchestrator Agent

## Goal
Add domain validation guard to orchestrator agent that validates URLs/domains before processing enrichment requests.

## Implementation Steps

- [x] Step 1: Create `validateDomain` function in `worker/src/lib/utils.ts` - Convert the provided tool code into a standalone async function that takes a domain string and returns validation result object - Verification: Function exists and exports correctly

- [x] Step 2: Create `extractDomainFromQuery` helper function in `worker/src/lib/utils.ts` - Function that attempts to extract a domain/URL from the query string (handles cases like "stripe.com", "https://stripe.com", "find emails at stripe.com") - Verification: Function can extract domains from various query formats

- [x] Step 3: Import validation functions in `worker/src/agents/orchestrator.ts` - Add imports for `validateDomain` and `extractDomainFromQuery` from `../lib/utils` - Verification: Imports are present and TypeScript compiles without errors

- [x] Step 4: Add domain extraction logic in `onRequest` method - After parsing query (line 18), call `extractDomainFromQuery(query)` to get potential domain - Verification: Domain extraction runs and logs extracted domain (if found)

- [x] Step 5: Add validation guard in `onRequest` method - If domain is extracted, call `validateDomain(domain)` - If validation returns `valid: false`, return early with 400 error response - Verification: Invalid domains return 400 error before agent processing starts

- [ ] Step 6: Test validation with valid domain - Send request with valid domain (e.g., "stripe.com") - Verification: Request proceeds normally through orchestrator

- [ ] Step 7: Test validation with invalid domain - Send request with invalid/unreachable domain - Verification: Request returns 400 error with validation failure message

- [ ] Step 8: Test validation with company name only - Send request with just company name (e.g., "stripe") - Verification: Request proceeds normally (no domain to validate)
