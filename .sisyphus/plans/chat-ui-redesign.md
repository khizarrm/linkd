# Chat UI Redesign - ChatGPT-style Dark Theme

## TL;DR

> **Quick Summary**: Transform the chat page to shadcn/ui-style dark theme (stone/slate palette), fix assistant message layout (full-width, no bubble), add collapsible accordion for tool calls, replace loading indicator with SVG, and cleanup all unused code/colors.
> 
> **Deliverables**:
> - Dark theme CSS variables (shadcn/ui stone-slate palette) in globals.css
> - Full-width assistant messages (no bubble container)
> - ToolCallAccordion component for streaming tool steps
> - MessageLoading SVG component
> - Updated UI primitives (dialog, textarea, card) for dark theme
> - Dark sidebar styling
> - Cleanup: remove unused glass-* classes, old loading code, dead color references
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (CSS vars) → Task 2 (components) → Task 3 (chat interface) → Task 4 (UI primitives)

---

## Context

### Original Request
User wants significantly better chat UI: dark color scheme like ChatGPT, assistant messages without box/bubble taking full width, better tool call display during streaming, replace current loading indicator with provided SVG, overall improved UX.

### Interview Summary
**Key Discussions**:
- Dark theme ONLY (no toggle) - replace light theme entirely
- Keep current AIInput component (pill shape, auto-resize) - just update colors
- Assistant messages should NOT be in bubble boxes - take full width
- Tool calls as collapsible accordion ("Working..." summary, expandable steps)
- Replace Framer Motion bouncing dots with provided MessageLoading SVG
- Dark sidebar too - consistent theme across app

**Research Findings**:
- Backend streaming works correctly (SSE with proper events)
- Current theme uses OKLCH color space in CSS variables
- 48+ hardcoded `stone-*` colors across 14 files need updating
- `glass-chat-bubble` class uses `bg-white/70` - will break on dark
- Sidebar uses CSS variables (`bg-sidebar`, etc.) - will auto-update
- dialog.tsx, textarea.tsx, card.tsx have hardcoded light colors

### Metis Review
**Identified Gaps** (addressed):
- Dialog/textarea/card primitives have hardcoded whites - added to scope
- `glass-*` CSS utilities need dark treatment or removal
- `reduced-motion` fallbacks hardcoded to white - will fix
- feedback-dialog.tsx already semi-dark, needs consistency fix

---

## Work Objectives

### Core Objective
Transform the chat interface from light to dark theme with improved message layout and streaming UX, creating a ChatGPT-like experience.

### Concrete Deliverables
- `frontend/src/app/globals.css` - Dark OKLCH CSS variables
- `frontend/src/components/ui/message-loading.tsx` - New SVG loading component
- `frontend/src/components/chat/tool-call-accordion.tsx` - New collapsible tool steps
- `frontend/src/components/chat/chat-interface.tsx` - Updated message layout + new components
- `frontend/src/components/chat/message-content.tsx` - Dark theme colors for cards
- `frontend/src/components/ui/dialog.tsx` - Dark theme colors
- `frontend/src/components/ui/textarea.tsx` - Dark theme colors
- `frontend/src/components/ui/card.tsx` - Dark theme colors
- `frontend/src/components/ui/ai-input.tsx` - Dark theme colors

### Definition of Done
- [x] `pnpm build` in frontend/ completes with zero errors
- [x] Chat page renders with dark background
- [x] Assistant messages appear full-width without bubble
- [x] Tool calls show as collapsible accordion during streaming
- [x] Loading indicator uses bouncing dots SVG
- [x] All dialogs render correctly on dark background
- [x] Sidebar is dark themed

### Must Have
- shadcn/ui-style dark color palette (stone/slate - like zinc-900/950 backgrounds)
- Full-width assistant messages (no bubble/box)
- Collapsible accordion for tool call steps
- MessageLoading SVG component (provided by user)
- Consistent dark theme across chat page and sidebar
- Cleanup of all unused code: glass-* classes, old Framer Motion loading dots, dead color variables

### Must NOT Have (Guardrails)
- NO theme toggle/switcher - dark only
- NO changes to backend API or streaming logic
- NO new npm dependencies (except if absolutely needed for accordion)
- NO changes to pages outside /chat route (login, guide, etc.)
- NO restructuring component hierarchy or creating new contexts
- NO Lottie, Rive, or complex animation frameworks
- NO changes to message data model or database schema

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
> All verification via agent-executed commands and tools.

### Test Decision
- **Infrastructure exists**: NO (no Playwright)
- **Automated tests**: NO - User will verify manually
- **Framework**: None

### Agent-Executed QA Scenarios (MANDATORY)

**Verification Tool by Deliverable Type:**
| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| Build | Bash | `pnpm build` exit code 0 |
| Code quality | Bash/grep | No hardcoded light colors in modified files |
| TypeScript | Bash | `pnpm tsc --noEmit` no errors |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Dark theme CSS variables (globals.css)
└── Task 2: Create MessageLoading + ToolCallAccordion components

Wave 2 (After Wave 1):
├── Task 3: Update chat-interface.tsx (message layout, integrate new components)
├── Task 4: Update message-content.tsx (dark card colors)
└── Task 5: Update UI primitives (dialog, textarea, card, ai-input)

Wave 3 (After Wave 2):
└── Task 6: Final build verification and color audit

Critical Path: Task 1 → Task 3 → Task 6
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 4, 5 | 2 |
| 2 | None | 3 | 1 |
| 3 | 1, 2 | 6 | 4, 5 |
| 4 | 1 | 6 | 3, 5 |
| 5 | 1 | 6 | 3, 4 |
| 6 | 3, 4, 5 | None | None (final) |

---

## TODOs

- [x] 1. Dark Theme CSS Variables

  **What to do**:
  - Update `:root` CSS variables in `globals.css` to shadcn/ui dark theme (stone/slate palette)
  - REMOVE `glass-chat-bubble` class entirely (no longer used after assistant message layout change)
  - REMOVE `glass-card` class if unused, or update for dark theme
  - Update `prefers-reduced-motion` fallbacks from white to dark colors
  - Remove any dead/unused CSS animations or utilities
  - Suggested shadcn/ui dark palette (stone/slate):
    - `--background`: `oklch(0.129 0.005 285)` (zinc-950 equivalent)
    - `--foreground`: `oklch(0.97 0.005 285)` (zinc-50 equivalent)
    - `--card`: `oklch(0.155 0.005 285)` (zinc-900 equivalent)
    - `--card-foreground`: `oklch(0.97 0.005 285)`
    - `--primary`: `oklch(0.97 0.005 285)` (light for contrast)
    - `--primary-foreground`: `oklch(0.155 0.005 285)`
    - `--secondary`: `oklch(0.215 0.005 285)` (zinc-800)
    - `--muted`: `oklch(0.215 0.005 285)` (zinc-800)
    - `--muted-foreground`: `oklch(0.55 0.005 285)` (zinc-400)
    - `--accent`: `oklch(0.215 0.005 285)`
    - `--border`: `oklch(0.215 0.005 285)` (zinc-800)
    - `--input`: `oklch(0.215 0.005 285)`
    - `--ring`: `oklch(0.55 0.005 285)`
    - `--sidebar`: `oklch(0.115 0.005 285)` (slightly darker)

  **Must NOT do**:
  - Add media queries for light/dark switching
  - Add ThemeProvider or next-themes configuration
  - Change non-color CSS (spacing, fonts, animations)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: None

  **References**:
  - `frontend/src/app/globals.css:46-86` - Current `:root` CSS variables to update
  - `frontend/src/app/globals.css:317-333` - `glass-card` and `glass-chat-bubble` classes
  - ChatGPT dark theme for visual reference (background ~#212121, text ~#ececec)

  **Acceptance Criteria**:
  - [ ] All `:root` variables updated to shadcn/ui dark stone/slate OKLCH values
  - [ ] `glass-chat-bubble` class REMOVED (grep returns 0 matches)
  - [ ] `glass-card` removed or updated for dark theme
  - [ ] `prefers-reduced-motion` fallbacks use dark colors
  - [ ] Any dead/unused CSS utilities cleaned up
  - [ ] `pnpm build` passes with zero errors

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Build succeeds after CSS changes
    Tool: Bash
    Steps:
      1. cd frontend && pnpm build
    Expected Result: Exit code 0, no errors
    Evidence: Build output captured
  ```

  **Commit**: YES
  - Message: `feat(theme): add dark theme CSS variables`
  - Files: `frontend/src/app/globals.css`

---

- [x] 2. Create MessageLoading and ToolCallAccordion Components

  **What to do**:
  - Create `frontend/src/components/ui/message-loading.tsx` with the user-provided SVG component
  - Create `frontend/src/components/chat/tool-call-accordion.tsx`:
    - Collapsed state shows "Working..." with spinner/animation
    - Expanded state shows list of tool steps with status (running/done)
    - Use Radix Accordion or simple CSS for collapse/expand
    - Each step shows: label, status indicator (spinner for running, checkmark for done)
  - Export both components properly

  **Must NOT do**:
  - Add new npm dependencies for accordion (use Radix or native CSS)
  - Create complex animations beyond simple transitions
  - Add state management beyond local component state

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - User-provided MessageLoading SVG (in original request)
  - `frontend/src/components/chat/chat-interface.tsx:13-17` - Current Step interface to match
  - `frontend/src/components/ui/` - Follow existing component patterns
  - Radix Accordion docs if using: https://www.radix-ui.com/primitives/docs/components/accordion

  **MessageLoading Component** (user-provided):
  ```tsx
  function MessageLoading() {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        className="text-foreground"
      >
        <circle cx="4" cy="12" r="2" fill="currentColor">
          <animate
            id="spinner_qFRN"
            begin="0;spinner_OcgL.end+0.25s"
            attributeName="cy"
            calcMode="spline"
            dur="0.6s"
            values="12;6;12"
            keySplines=".33,.66,.66,1;.33,0,.66,.33"
          />
        </circle>
        <circle cx="12" cy="12" r="2" fill="currentColor">
          <animate
            begin="spinner_qFRN.begin+0.1s"
            attributeName="cy"
            calcMode="spline"
            dur="0.6s"
            values="12;6;12"
            keySplines=".33,.66,.66,1;.33,0,.66,.33"
          />
        </circle>
        <circle cx="20" cy="12" r="2" fill="currentColor">
          <animate
            id="spinner_OcgL"
            begin="spinner_qFRN.begin+0.2s"
            attributeName="cy"
            calcMode="spline"
            dur="0.6s"
            values="12;6;12"
            keySplines=".33,.66,.66,1;.33,0,.66,.33"
          />
        </circle>
      </svg>
    );
  }
  export { MessageLoading };
  ```

  **ToolCallAccordion Props Interface**:
  ```tsx
  interface Step {
    id: string;
    label: string;
    status: "running" | "done";
  }
  interface ToolCallAccordionProps {
    steps: Step[];
    isLoading: boolean;
  }
  ```

  **Acceptance Criteria**:
  - [ ] `message-loading.tsx` created with SVG animation
  - [ ] `tool-call-accordion.tsx` created with collapse/expand
  - [ ] Accordion shows "Working..." when collapsed with step count
  - [ ] Accordion expands to show individual steps
  - [ ] Steps show spinner icon when running, checkmark when done
  - [ ] Components use CSS variables for colors (dark-theme compatible)
  - [ ] TypeScript compiles without errors

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: TypeScript compilation succeeds
    Tool: Bash
    Steps:
      1. cd frontend && pnpm tsc --noEmit
    Expected Result: Exit code 0, no type errors
    Evidence: Output captured
  ```

  **Commit**: YES
  - Message: `feat(chat): add MessageLoading and ToolCallAccordion components`
  - Files: `frontend/src/components/ui/message-loading.tsx`, `frontend/src/components/chat/tool-call-accordion.tsx`

---

- [x] 3. Update Chat Interface - Message Layout and Component Integration

  **What to do**:
  - Remove bubble styling from assistant messages (remove `glass-chat-bubble`, rounded corners, padding)
  - Keep user messages in bubble (right-aligned, rounded, with background)
  - Assistant messages: full-width, left-aligned, no background/border
  - Replace Framer Motion loading dots (lines 401-418) with `<MessageLoading />`
  - Replace current step display (lines 380-399) with `<ToolCallAccordion />`
  - Import and integrate the new components
  - Update `StreamingText` component styling for dark theme if needed

  **Must NOT do**:
  - Change streaming logic or SSE handling
  - Modify message state structure
  - Change how messages are saved to backend
  - Add new state management

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `frontend/src/components/chat/chat-interface.tsx:358-423` - Current message rendering to modify
  - `frontend/src/components/chat/chat-interface.tsx:30-58` - StreamingText component
  - `frontend/src/components/chat/chat-interface.tsx:401-418` - Current loading dots to replace
  - `frontend/src/components/chat/chat-interface.tsx:380-399` - Current step display to replace

  **Current message styling to change** (lines 366-371):
  ```tsx
  // CURRENT - both have containers
  className={`max-w-[80%] text-[15px] leading-relaxed whitespace-pre-wrap ${
    message.role === "user"
      ? "rounded-3xl rounded-br-lg bg-primary text-primary-foreground px-5 py-3"
      : "rounded-3xl rounded-bl-lg glass-chat-bubble text-foreground px-5 py-4 ring-1 ring-black/[0.08] shadow-sm"
  }`}
  
  // TARGET - user has bubble, assistant is plain
  // User: keep current bubble styling (update colors for dark)
  // Assistant: remove max-w-[80%], remove glass-chat-bubble, remove rounded/ring/shadow, just text
  ```

  **Acceptance Criteria**:
  - [ ] User messages: right-aligned bubble with dark-theme colors
  - [ ] Assistant messages: full-width, no bubble/box, just text content
  - [ ] Loading indicator: uses MessageLoading SVG component
  - [ ] Tool steps: displayed in ToolCallAccordion (collapsed by default)
  - [ ] StreamingText still works for word-by-word animation
  - [ ] Old Framer Motion loading dots code REMOVED (lines 401-418)
  - [ ] No `glass-chat-bubble` class usage remains
  - [ ] `pnpm build` passes

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Build succeeds after chat interface changes
    Tool: Bash
    Steps:
      1. cd frontend && pnpm build
    Expected Result: Exit code 0
    Evidence: Build output captured

  Scenario: No old loading code remains
    Tool: Bash
    Steps:
      1. grep -n "motion.div" frontend/src/components/chat/chat-interface.tsx | grep -v StreamingText
    Expected Result: No matches for loading dots motion.div (StreamingText is fine)
    Evidence: Grep output
  ```

  **Commit**: YES
  - Message: `feat(chat): update message layout and integrate new loading/accordion components`
  - Files: `frontend/src/components/chat/chat-interface.tsx`

---

- [x] 4. Update Message Content Cards for Dark Theme

  **What to do**:
  - Update `PersonCard` component: replace `bg-stone-50`, `ring-stone-200`, `text-stone-*` with CSS variables
  - Update `EmailEntryCard` component: replace `bg-emerald-*`, `bg-stone-*`, `ring-*` with dark-compatible colors
  - LinkedIn button can keep brand color `#0077B5` but ensure contrast on dark
  - Copy button and other interactive elements need dark theme treatment
  - Use semantic color variables: `bg-card`, `text-card-foreground`, `border`, etc.

  **Must NOT do**:
  - Change component structure or props
  - Modify JSON parsing logic
  - Change how data is displayed (just colors)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:
  - `frontend/src/components/chat/message-content.tsx:43-67` - PersonCard with hardcoded colors
  - `frontend/src/components/chat/message-content.tsx:70-115` - EmailEntryCard with hardcoded colors
  - `frontend/src/app/globals.css` - CSS variables to use

  **Color mappings**:
  - `bg-stone-50` → `bg-card`
  - `ring-stone-200` → `ring-border` or `border`
  - `text-stone-900` → `text-foreground`
  - `text-stone-500` → `text-muted-foreground`
  - `text-stone-400` → `text-muted-foreground`
  - `bg-emerald-50` → `bg-emerald-950/30` (dark green tint)
  - `ring-emerald-100` → `ring-emerald-800/50`
  - `bg-emerald-100` → `bg-emerald-900/50`
  - `text-emerald-700` → `text-emerald-400`
  - `bg-white` → `bg-card`

  **Acceptance Criteria**:
  - [ ] PersonCard uses CSS variables, no hardcoded stone-* colors
  - [ ] EmailEntryCard uses dark-compatible colors
  - [ ] Found emails show green tint on dark background
  - [ ] Not-found emails show muted styling
  - [ ] Copy button visible and functional on dark
  - [ ] LinkedIn button has good contrast
  - [ ] Zero `bg-stone-`, `text-stone-`, `ring-stone-` in file

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: No hardcoded stone colors remain
    Tool: Bash
    Steps:
      1. grep -c "stone-" frontend/src/components/chat/message-content.tsx
    Expected Result: 0 matches
    Evidence: Grep output
  ```

  **Commit**: YES
  - Message: `feat(chat): update message content cards for dark theme`
  - Files: `frontend/src/components/chat/message-content.tsx`

---

- [x] 5. Update UI Primitives for Dark Theme

  **What to do**:
  - Update `dialog.tsx`: replace `bg-white`, `text-stone-*`, `border-stone-*` with CSS variables
  - Update `textarea.tsx`: replace `bg-white/90`, `border-slate-*` with CSS variables
  - Update `card.tsx`: replace `bg-white/90` with CSS variables
  - Update `ai-input.tsx`: update colors/borders for dark theme (keep shape/functionality)
  - Update `feedback-dialog.tsx`: make consistent with new dark theme (already semi-dark)
  - Use semantic variables: `bg-background`, `bg-card`, `text-foreground`, `border`, etc.

  **Must NOT do**:
  - Change component APIs or props
  - Restructure component logic
  - Add new features to these components

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:
  - `frontend/src/components/ui/dialog.tsx` - Multiple hardcoded whites
  - `frontend/src/components/ui/textarea.tsx` - `bg-white/90`, `border-slate-*`
  - `frontend/src/components/ui/card.tsx` - `bg-white/90`
  - `frontend/src/components/ui/ai-input.tsx` - Input styling
  - `frontend/src/components/feedback-dialog.tsx` - Already semi-dark, needs consistency

  **Acceptance Criteria**:
  - [ ] dialog.tsx: no `bg-white`, `text-stone-*`, `border-stone-*`
  - [ ] textarea.tsx: no `bg-white`, `border-slate-*`
  - [ ] card.tsx: no `bg-white`
  - [ ] ai-input.tsx: works on dark background with good contrast
  - [ ] feedback-dialog.tsx: consistent dark styling
  - [ ] All dialogs render correctly on dark background
  - [ ] `pnpm build` passes

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: No hardcoded white/stone/slate in UI primitives
    Tool: Bash
    Steps:
      1. grep -E "bg-white|text-stone|border-stone|border-slate" frontend/src/components/ui/dialog.tsx frontend/src/components/ui/textarea.tsx frontend/src/components/ui/card.tsx
    Expected Result: No matches (or only intentional opacity variants)
    Evidence: Grep output
  ```

  **Commit**: YES
  - Message: `feat(ui): update dialog, textarea, card, ai-input for dark theme`
  - Files: `frontend/src/components/ui/dialog.tsx`, `frontend/src/components/ui/textarea.tsx`, `frontend/src/components/ui/card.tsx`, `frontend/src/components/ui/ai-input.tsx`, `frontend/src/components/feedback-dialog.tsx`

---

- [x] 6. Final Build Verification and Color Audit

  **What to do**:
  - Run full build to verify no errors
  - Audit modified files for any remaining hardcoded light-theme colors
  - Run TypeScript check
  - Verify all imports resolve correctly

  **Must NOT do**:
  - Make additional changes (this is verification only)
  - Touch files outside the modified set

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None
  - **Blocked By**: Tasks 3, 4, 5

  **References**:
  - All files modified in previous tasks

  **Acceptance Criteria**:
  - [ ] `pnpm build` exits with code 0
  - [ ] `pnpm tsc --noEmit` exits with code 0
  - [ ] No `bg-stone-`, `text-stone-` in modified chat components
  - [ ] No `bg-white` (non-opacity) in modified UI components

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Full build succeeds
    Tool: Bash
    Steps:
      1. cd frontend && pnpm build
    Expected Result: Exit code 0, "Build successful" or similar
    Evidence: Full build output

  Scenario: TypeScript compilation succeeds
    Tool: Bash
    Steps:
      1. cd frontend && pnpm tsc --noEmit
    Expected Result: Exit code 0, no errors
    Evidence: TSC output

  Scenario: Color audit passes
    Tool: Bash
    Steps:
      1. grep -rn "bg-stone-\|text-stone-" frontend/src/components/chat/
    Expected Result: 0 matches
    Evidence: Grep output
  ```

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(theme): add dark theme CSS variables` | globals.css | pnpm build |
| 2 | `feat(chat): add MessageLoading and ToolCallAccordion components` | message-loading.tsx, tool-call-accordion.tsx | pnpm tsc |
| 3 | `feat(chat): update message layout and integrate new components` | chat-interface.tsx | pnpm build |
| 4 | `feat(chat): update message content cards for dark theme` | message-content.tsx | grep audit |
| 5 | `feat(ui): update primitives for dark theme` | dialog.tsx, textarea.tsx, card.tsx, ai-input.tsx, feedback-dialog.tsx | pnpm build |
| 6 | (no commit - verification only) | - | full build + audit |

---

## Success Criteria

### Verification Commands
```bash
# Build
cd frontend && pnpm build
# Expected: Exit code 0

# TypeScript
cd frontend && pnpm tsc --noEmit  
# Expected: Exit code 0

# Color audit - chat components
grep -rn "bg-stone-\|text-stone-\|ring-stone-" frontend/src/components/chat/
# Expected: 0 matches

# Color audit - UI primitives
grep -E "bg-white[^/]" frontend/src/components/ui/dialog.tsx frontend/src/components/ui/textarea.tsx frontend/src/components/ui/card.tsx
# Expected: 0 matches (bg-white/XX opacity variants OK)
```

### Final Checklist
- [x] Chat page has dark background (shadcn/ui stone-slate style)
- [x] User messages in right-aligned bubbles
- [x] Assistant messages full-width, no bubble
- [x] Tool calls in collapsible accordion
- [x] Loading uses SVG bouncing dots
- [x] Sidebar is dark themed
- [x] All dialogs render on dark background
- [x] Build passes with zero errors
- [x] No unused code: glass-* classes removed, old loading dots removed
- [x] Consistent stone/slate color scheme throughout
