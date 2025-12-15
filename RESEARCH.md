# CORS Issue Research

## Problem
CORS error when frontend at `https://try-linkd.com` calls backend at `https://applyo-worker.applyo.workers.dev/api/agents/orchestrator`. Server returns `Access-Control-Allow-Origin: http://localhost:3000` instead of the actual origin.

## Files

### Backend (Worker)
- `worker/src/index.ts` (lines 26-44): Global CORS middleware configuration
  - Uses Hono's `cors()` middleware
  - Origin function checks allowed list and returns origin or fallback
  - Applied to all routes via `app.use("*", cors(...))`
- `worker/src/agents/orchestrator.ts`: Orchestrator agent implementation
- `worker/src/endpoints/*.ts`: Other endpoints (all use same CORS middleware)

### Frontend
- `frontend/lib/api.ts`: API client with `apiFetch()` helper
  - Uses `NEXT_PUBLIC_API_URL` env var
  - Sets `credentials: 'include'` on requests
- `frontend/src/hooks/use-protected-api.ts`: Hook that calls orchestrator endpoint
- `frontend/next.config.ts`: Next.js rewrites API calls to worker URL

## Data Structures

### CORS Configuration
```typescript
cors({
    origin: (origin) => {
        const allowed = [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://try-linkd.com"
        ];
        return allowed.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin) ? origin : allowed[0];
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
})
```

## Patterns

### CORS Setup
- Single global CORS middleware applied to all routes
- Origin function validates against hardcoded allowed list
- Fallback returns `allowed[0]` when origin doesn't match

### API Calls
- Frontend uses `apiFetch()` helper with base URL from env var
- All requests include `credentials: 'include'`
- Next.js rewrites `/api/*` paths to worker URL

## Root Cause

**Bug in origin function (line 36 of `worker/src/index.ts`):**

When `origin` parameter is `null` or `undefined`:
1. `allowed.includes(origin)` returns `false`
2. Regex test fails (or throws if origin is null)
3. Function returns `allowed[0]` (`http://localhost:3000`) as fallback

This happens when:
- Preflight OPTIONS request has no Origin header (shouldn't happen but can)
- Hono CORS middleware passes `null`/`undefined` in edge cases
- Origin header is missing or malformed

**Expected behavior:**
- If origin is `https://try-linkd.com`, should return `https://try-linkd.com`
- If origin is `null`/`undefined`, should handle gracefully (return `null` or first allowed)

## Strategy

1. **Fix origin function** to handle `null`/`undefined`:
   - Check if origin exists before validation
   - Return `null` or first allowed origin when origin is missing
   - Ensure `https://try-linkd.com` is properly matched

2. **Verify CORS behavior**:
   - Ensure preflight OPTIONS requests are handled
   - Confirm Hono CORS middleware works with origin function
   - Test with actual production origin

3. **Environment considerations**:
   - Check if `NEXT_PUBLIC_API_URL` is set correctly in production
   - Verify worker deployment has latest code
   - Confirm no caching issues

## Unknowns

1. **Why origin is null/undefined**: Need to verify if Hono passes null for certain request types
2. **Deployment state**: Is the deployed worker running the latest code with `https://try-linkd.com` in allowed list?
3. **Environment variables**: What is `NEXT_PUBLIC_API_URL` set to in production?
4. **Caching**: Could Cloudflare Workers be caching old CORS headers?
