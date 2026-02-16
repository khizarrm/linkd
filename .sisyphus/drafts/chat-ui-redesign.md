# Draft: Chat UI Redesign - ChatGPT-style Dark Theme

## Requirements (confirmed)
- **Dark color scheme**: User wants ChatGPT-like dark theme (current is too light)
- **Assistant message layout**: NO message box for AI responses - should take full width below user message
- **Typing indicator**: Replace current bouncing dots with provided `MessageLoading` SVG component
- **Better streaming**: Streaming doesn't work properly currently, need to fix
- **Better tool call UX**: Improve display of tool calls during streaming
- **Overall better UI/UX**: Significantly improved experience

## Current Implementation Analysis

### Files Identified
- `frontend/src/components/chat/chat-interface.tsx` - Main chat component
- `frontend/src/components/chat/message-content.tsx` - Message rendering (person cards, email entries)
- `frontend/src/components/ui/ai-input.tsx` - Input component (rounded, pill-style)
- `frontend/src/app/globals.css` - Theme variables (currently LIGHT with oklch values ~0.98 background)
- `frontend/src/contexts/chat-context.tsx` - Chat state management

### Current Styling Issues
- Background: `oklch(0.98 0.005 95)` - Very light, almost white
- Messages: Glass morphism style with `bg-white/70 backdrop-blur-md`
- User messages: `rounded-3xl rounded-br-lg bg-primary` 
- Assistant messages: `glass-chat-bubble` with ring border
- Both user AND assistant messages are in bubble containers (wrong for assistant)

### Current Streaming Implementation
- Backend: SSE via `text/event-stream`
- Events: `step` (tool calls), `output` (final), `done`, `error`
- Frontend reads chunks properly but tool calls use simple text labels
- Streaming text uses Framer Motion word-by-word fade (looks okay)
- Tool call display: Just animated text with pulse - not very polished

### Loading Indicator (to replace)
- Current: Framer Motion bouncing dots (3 dots animation)
- New: Provided SVG `MessageLoading` component

## Technical Decisions
- **Theme approach**: Add dark mode CSS variables to `:root` or `.dark` class
- **Assistant layout**: Remove box styling, allow full-width flow
- **Streaming UX**: Keep existing SSE, improve UI for tool calls

## Research Findings (from agents)

### Backend Streaming - WORKS CORRECTLY
- SSE with proper headers (`text/event-stream`, `no-cache`, `X-Accel-Buffering: no`)
- Event types: `step` (tool calls), `output` (final result), `done`, `error`
- Tool labels: `linkedin_xray_search`, `web_search`, `find_and_verify_email`
- Data format: PeopleFinderOutput with status, message, people[], emails[]
- **Streaming itself works - issue is UI/UX of displaying streamed content**

### Current Theme - LIGHT ONLY
- Background: `oklch(0.98 0.005 95)` - near white
- No dark mode implemented despite `next-themes` being installed
- Glass morphism with `bg-white/70 backdrop-blur-md`
- Hardcoded `stone-*` colors in message-content.tsx

### Current Issues Identified
1. Both user AND assistant messages use bubble containers (assistant shouldn't)
2. Tool call display is just pulsing text - not visually appealing
3. Loading indicator uses Framer Motion dots - user wants provided SVG instead
4. Light theme only - user wants ChatGPT-style dark
5. Message cards use hardcoded light colors (stone-50, etc.)

## Decisions Made
- **Theme**: Dark only - replace light theme entirely with ChatGPT-style dark
- **Input**: Keep current AIInput component (pill shape, auto-resize) - just update colors/outlines for dark theme
- **Tool calls**: Collapsible accordion - shows "Working..." summary, expandable to see individual steps
- **Sidebar**: Yes, dark sidebar too - consistent dark theme across entire app

## Scope Boundaries
- INCLUDE: Chat interface styling, message layout, loading indicator, streaming UX, dark theme
- EXCLUDE: Backend streaming logic (confirmed working), auth, database
