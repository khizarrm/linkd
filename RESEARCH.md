# PostHog Events Research

## Files

### Core PostHog Setup
- `frontend/instrumentation-client.ts` - PostHog initialization singleton
- `frontend/src/components/posthog-provider.tsx` - Pageview tracking component
- `frontend/src/app/layout.tsx` - Renders PostHogPageview component globally

### Event Tracking
- `frontend/src/app/page.tsx` - Search-related events (`company_searched`, `search_completed`)
- `frontend/src/components/conditional-layout.tsx` - User identification on sign-in

## Data Structures

### PostHog Configuration
```typescript
posthog.init({
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  person_profiles: 'identified_only',
  capture_pageview: false, // manual capture
  capture_pageleave: true,
})
```

### Event Properties

**`$pageview`**
- `$current_url`: Full URL with query params

**`company_searched`**
- `search_query`: Trimmed search string

**`search_completed`**
- `search_query`: Original search query
- `company_name`: Company name from results or query
- `results_found`: Boolean
- `email_count`: Total emails found
- `person_count`: Number of people found
- `error`: Error message (on failure)

**User Identification**
- `email`: Primary email address
- `name`: Full name
- `firstName`: First name
- `lastName`: Last name

## Patterns

### Initialization
- PostHog initialized once in `instrumentation-client.ts`
- Client-side only (`typeof window !== 'undefined'` check)
- Exported singleton: `export { posthog }`
- Imported via: `import { posthog } from '@/../instrumentation-client'`

### Pageview Tracking
- Manual capture (auto-capture disabled)
- `PostHogPageview` component in root layout
- Tracks pathname + searchParams changes
- Uses `$pageview` event name (PostHog convention)

### User Identification
- Triggered in `ConditionalLayout` when user signs in
- Uses Clerk user data
- Calls `posthog.identify(userId, properties)`
- Runs on `useEffect` when `isSignedIn && user` changes

### Event Capture
- Direct `posthog.capture()` calls
- Event name as first arg, properties object as second
- No wrapper functions or abstractions
- Events fire synchronously (no queuing visible)

### Event Locations
- Search flow: `page.tsx` (3 events total)
- Page navigation: `posthog-provider.tsx` (automatic)
- User auth: `conditional-layout.tsx` (identification only)

## Strategy

### Current Implementation
1. **Setup**: Single initialization point, client-side only
2. **Pageviews**: Automatic via component in layout
3. **User Identity**: Set on sign-in via ConditionalLayout
4. **Custom Events**: Inline `posthog.capture()` calls at action points

### Event Flow
- Page loads → `$pageview` fires
- User signs in → `posthog.identify()` called
- User searches → `company_searched` fires
- Search completes → `search_completed` fires (success or failure)

## Unknowns

1. **Other pages**: No events found in `/bank`, `/inbox`, `/templates`, `/guide` - are these tracked?
2. **User actions**: No tracking for clicks, form submissions, or other interactions
3. **Error tracking**: Only search errors tracked - are other errors tracked?
4. **Feature flags**: PostHog supports feature flags - are they used?
5. **Session tracking**: How are sessions defined/managed?
6. **Event naming**: Is there a convention beyond `snake_case`?
7. **Properties validation**: Are event properties validated/typed?
8. **Testing**: How are PostHog events tested in development?
