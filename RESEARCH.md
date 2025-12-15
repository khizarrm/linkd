# Frontend UI Research

## Files

### Search Page (Main Page)
- `frontend/src/app/page.tsx` - Main search page component
- `frontend/src/components/search/search-header.tsx` - Page header with title/tagline
- `frontend/src/components/search/search-form.tsx` - Search input with animated placeholder
- `frontend/src/components/search/search-results.tsx` - Results container/state handler
- `frontend/src/components/search/person-card.tsx` - Individual person result card
- `frontend/src/components/search/empty-state.tsx` - No results state
- `frontend/src/components/search/loading-skeleton.tsx` - Loading state skeleton

### Layout & Structure
- `frontend/src/app/layout.tsx` - Root layout with Clerk auth
- `frontend/src/components/conditional-layout.tsx` - Sidebar wrapper (hidden on login)
- `frontend/src/components/app-sidebar.tsx` - Navigation sidebar
- `frontend/src/app/globals.css` - Global styles, animations, dark theme

## UI Design System

### Color Palette
- Background: `#0a0a0a` (near-black)
- Text primary: `#e8e8e8` (off-white)
- Text secondary: `#6a6a6a` (gray)
- Cards: `#151515` (dark gray)
- Borders: `#2a2a2a` → `#3a3a3a` (hover)
- Button: White background, black text

### Typography
- Font: Geist Sans (via Next.js)
- Weight: Light (`font-light`) throughout
- Tracking: Tight (`tracking-tight`)
- Responsive sizes: `text-xs sm:text-sm md:text-base` pattern

### Animations
- `animate-fade-in-up` - Staggered fade-in from bottom
- `animate-shimmer` - Loading skeleton shimmer
- Slot machine placeholder rotation (3s interval)

## Search Page UI

### Layout Structure
```
- Full-screen centered container (max-w-4xl)
- Vertical stack: Header → Form → Results
- Negative top margin (-mt-16) for centering
- Responsive padding: px-4 sm:px-6
```

### Search Header
**Text:**
- Title: `"linkd"` (h1, text-3xl → text-7xl responsive)
- Tagline: `"link up ting"` (text-xs → text-base, gray)

**Styling:**
- Centered text
- Light font weight
- Fade-in animation (0.05s delay for tagline)

### Search Form
**Placeholder Texts (rotating every 3s):**
1. `"gimme tim cooks email from apple"`
2. `"exa ai, the api search company"`
3. `"cohere"`
4. `"fouders from datacurve"` (typo: "fouders")
5. `"ceo of poolside ai"`

**Input:**
- Dark card background (`#151515`)
- Border: `#2a2a2a` → `#4a4a4a` on focus
- Rounded: `rounded-2xl sm:rounded-full`
- Responsive text: `text-sm sm:text-lg md:text-xl`
- Slot machine animation when empty/unfocused

**Button:**
- Text: `"Send"` (or `"Searching"` with spinner when loading)
- White bg, black text
- Uppercase, tracking-wider
- Disabled when empty/loading

**Keyboard:**
- Cmd/Ctrl + Enter submits

### Search Results

**Loading State:**
- 3 skeleton cards in grid
- Shimmer animation
- Responsive grid: 1 col → 2 cols (sm) → 3 cols (lg)

**Empty State:**
- Emoji: 🔍
- Title: `"No emails found"`
- Body: `"We couldn't find any verified email addresses for your search."`
- Help text: `"Try adding more context (like their website, what they do, or specific details), or choose a smaller or mid-size company — those usually work best."`

**Error State:**
- Red text: `text-red-400/80`
- Shows error message from API

**Results Grid:**
- Responsive: 1 → 2 → 3 columns
- Gap: `gap-3 sm:gap-4`
- Max width: `max-w-5xl`

### Person Card

**Structure:**
- Dark card: `bg-[#151515]` with border
- Rounded: `rounded-2xl sm:rounded-3xl`
- Padding: `p-5 sm:p-6 md:p-8`
- Hover: border lightens, slight scale on active

**Content:**
- **Name:** Large (text-xl → text-3xl), light weight, break-word
- **Verified Badge:** Blue badge with checkmark if email exists
- **Role:** Gray text below name
- **Company:** 
  - Favicon or Building2 icon
  - Company name/domain (clickable link)
  - Underlined, hover effect
- **Email Section:**
  - Dark background box (`#0a0a0a`)
  - Email address (break-all)
  - Copy button (Copy icon → Check icon on success)
  - "No verified emails found" italic text if none

**Animations:**
- Staggered fade-in: `animationDelay: ${index * 0.1}s`

## Sidebar

**Header:**
- Text: `"LINKD"` (uppercase, tracking-tight)
- Collapsible trigger button

**Navigation:**
- Section label: `"Application"`
- Menu item: `"Search"` (icon: Search, links to `/`)

**Footer:**
- User profile button (avatar + name/email)
- Sign out button (appears on click, animated slide-in)
- Settings commented out

## Text/Copy Inventory

### Search Page
- Title: `"linkd"`
- Tagline: `"link up ting"`
- Button: `"Send"` / `"Searching"`
- Placeholders: 5 rotating examples (see above)
- Empty: `"No emails found"` + help text
- Error: Dynamic from API
- No results: `"No results found"`

### Person Cards
- Badge: `"Verified"`
- Email copy: `"No verified emails found"`
- Company fallback: `"Company Website"`

### Sidebar
- Brand: `"LINKD"`
- Nav: `"Search"`
- Actions: `"Sign out"`, `"Settings"` (commented)

## Patterns

### Responsive Design
- Mobile-first breakpoints: `sm:`, `md:`, `lg:`
- Text scales: `text-xs sm:text-sm md:text-base`
- Spacing scales: `mt-5 sm:mt-6 md:mt-8`
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

### State Management
- Local state for form/UI (`useState`)
- SWR for data fetching (`mutate` for cache invalidation)
- Clerk for auth (`useAuth`, `useUser`)

### Error Handling
- Try/catch in search handler
- Error state displayed in results component
- Fallback UI for missing data

### Accessibility
- Semantic HTML (article, h1, h2)
- Keyboard navigation (Cmd+Enter)
- Focus states on interactive elements
- Alt text for images

## Unknowns

- Why search page doesn't use sidebar layout (ConditionalLayout shows sidebar on all pages except login, but search page has its own full-screen layout)
- Typo in placeholder: `"fouders"` vs `"founders"` - intentional or bug?
- Brand name inconsistency: `"linkd"` (lowercase) vs `"LINKD"` (uppercase in sidebar)
- Tagline `"link up ting"` - meaning/purpose unclear
