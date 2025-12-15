# Protected Routes Authentication Fix

## Problem
- `getToken` import error: Not exported from `@clerk/nextjs`
- 401 Unauthorized: API calls fail because no token is sent to backend
- `apiFetch()` utility cannot use React hooks directly

## Solution Strategy
Refactor API client to accept token as parameter and create hook-based wrapper for components.

[x] Step 1: Remove invalid `getToken` import from `frontend/lib/api.ts` - Remove `import { getToken } from '@clerk/nextjs'` from line 1 - Verify file compiles without import errors

[x] Step 2: Refactor `apiFetch()` to accept optional token parameter - Change function signature to `async function apiFetch(url: string, options: RequestInit = {}, token?: string | null)` - Remove `await getToken()` call from line 24 - Use provided token parameter instead - Verify function accepts token parameter

[x] Step 3: Create `useProtectedApi()` hook in `frontend/src/hooks/use-protected-api.ts` - Import `useAuth` from `@clerk/nextjs` - Create hook that calls `const { getToken } = useAuth()` - Return object with all `protectedApi` methods that automatically inject token - Each method should call `getToken()` and pass to `apiFetch()` - Verify hook returns API methods with token injection

[x] Step 4: Update `use-templates.ts` to use `useProtectedApi()` hook - Import `useProtectedApi` instead of `protectedApi` - Call `const protectedApi = useProtectedApi()` at start of hook - Verify templates list loads successfully with authentication

[x] Step 5: Update `create-template-dialog.tsx` to use `useProtectedApi()` hook - Import `useProtectedApi` hook - Add `const protectedApi = useProtectedApi()` at component top level - Verify template creation works with authentication

[x] Step 6: Update `template-list.tsx` to use `useProtectedApi()` hook - Import `useProtectedApi` hook - Add `const protectedApi = useProtectedApi()` at component top level - Verify template deletion works with authentication

[x] Step 7: Update `profile-settings-dialog.tsx` to use `useProtectedApi()` hook - Import `useProtectedApi` hook - Add `const protectedApi = useProtectedApi()` at component top level - Verify profile get and update work with authentication

[x] Step 8: Update `employee-compose-modal.tsx` to use `useProtectedApi()` hook - Import `useProtectedApi` hook - Add `const protectedApi = useProtectedApi()` at component top level - Verify template list, process, and email send work with authentication

[x] Step 9: Update `company-detail-dialog.tsx` to use `useProtectedApi()` hook - Import `useProtectedApi` hook - Add `const protectedApi = useProtectedApi()` at component top level - Verify company employees list works with authentication

[x] Step 10: Update `person-card.tsx` to use `useProtectedApi()` hook - Import `useProtectedApi` hook - Add `const protectedApi = useProtectedApi()` at component top level - Verify template list, process, and email send work with authentication

[x] Step 11: Update `use-companies.ts` to use `useProtectedApi()` hook - Import `useProtectedApi` instead of `protectedApi` - Call `const protectedApi = useProtectedApi()` at start of hook - Verify companies list loads successfully with authentication

[x] Step 12: Update `agentsApi.orchestrator()` to use token parameter - Modify `orchestrator` method to accept optional token parameter - Pass token to `apiFetch()` call - Verify agents API still works (if used in client components, may need hook wrapper)

[ ] Step 13: Test protected routes end-to-end - Log in as authenticated user - Verify templates page loads without 401 errors - Create a new template and verify it succeeds - List templates and verify they load - Update a template and verify it succeeds - Delete a template and verify it succeeds - Verify all API calls include Authorization header in network tab - Verify backend receives valid Clerk token and processes requests

[ ] Step 14: Verify middleware protection for page routes - Confirm `middleware.ts` protects `/templates` route - Test accessing `/templates` while logged out redirects to login - Verify middleware doesn't interfere with API token flow
