# Research: Backend Token Verification Error

## Problem

1. **Backend Error**: `clerk.verifySessionToken is not a function` in `worker/src/lib/clerk-auth.ts`
2. **401 Unauthorized**: Templates API returns 401 due to token verification failure

## Files

- `frontend/lib/api.ts` - API client with `apiFetch()` helper (line 20-41)
- `frontend/src/components/templates/create-template-dialog.tsx` - Uses `protectedApi.createTemplate()` (line 259)
- `frontend/src/components/templates/template-list.tsx` - Uses `protectedApi.listTemplates()` and `deleteTemplate()`
- `frontend/src/hooks/use-templates.ts` - Uses `protectedApi.listTemplates()`
- `worker/src/endpoints/templates.ts` - Backend routes using `verifyClerkToken()` (lines 47, 116, 201, 283, 362)
- `worker/src/lib/clerk-auth.ts` - Token verification utility (expects `Authorization: Bearer <token>`)

## Root Cause

**Backend Token Verification Issue:**
- `worker/src/lib/clerk-auth.ts` line 27: `clerk.verifySessionToken(token)` → **FAILS**
- `verifySessionToken()` is NOT a method on Clerk client object
- `@clerk/backend` v2.27.0 does not provide `verifySessionToken()` method
- Correct API: `verifyToken()` function imported directly from `@clerk/backend`

**Current Implementation (BROKEN):**
```typescript
const clerk = createClerkClient({ secretKey });
const session = await clerk.verifySessionToken(token); // ❌ Method doesn't exist
```

**Correct Implementation:**
```typescript
import { verifyToken } from "@clerk/backend";
const verifiedToken = await verifyToken(token, { secretKey });
```

## Current Flow

1. Client sends request with `Authorization: Bearer <token>` header
2. Backend `verifyClerkToken()` extracts token from header
3. Creates Clerk client: `createClerkClient({ secretKey })`
4. Calls `clerk.verifySessionToken(token)` → **FAILS** (method doesn't exist)
5. Error caught, returns null → Backend returns 401

## Patterns

**Backend Auth Pattern:**
```typescript
const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
if (!authResult) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
const { clerkUserId } = authResult;
```

**Clerk v6 Client-Side Token Pattern:**
```typescript
import { useAuth } from '@clerk/nextjs';

function Component() {
  const { getToken } = useAuth();
  const token = await getToken();
  // Use token in API call
}
```

**Affected Endpoints:**
- `worker/src/endpoints/templates.ts` - All 5 routes use `verifyClerkToken()` (lines 47, 116, 201, 283, 362)
- `worker/src/endpoints/profile.ts` - 2 routes use `verifyClerkToken()` (lines 50, 141)
- All protected routes fail token verification

**Clerk Backend SDK v2.27.0:**
- Package: `@clerk/backend@^2.27.0`
- Correct import: `import { verifyToken } from "@clerk/backend"`
- Function signature: `verifyToken(token: string, options: { secretKey: string })`
- Returns: Verified token payload with `sub` (user ID) field

