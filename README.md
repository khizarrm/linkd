# Linkd

An intelligent cold email automation platform for internship seekers.

Linkd streamlines the internship search process by automatically finding relevant companies, identifying founders and key personnel, verifying their emails, and sending personalized cold outreach on behalf of users.

> Status: Work in Progress

## How It Works

Users interact through a chat interface where they provide their resume and work preferences. The system:

1. Finds relevant companies via semantic web search
2. Identifies leadership (founders, C-suite) at each company
3. Verifies email addresses through pattern generation + ZeroBounce validation
4. Drafts personalized cold emails using proven formats
5. Sends emails on the user's behalf

## Chat Interface

The main user experience is a conversational chat page (`/chat`). Features:

- **Streaming responses** — Real-time SSE streaming from the research agent
- **Tool call visibility** — Shows which tools are running (search queries, web search, email verification) with live status indicators
- **Session continuity** — Conversation ID tracks multi-turn sessions
- **User profile dialog** — Quick access to update profile info (resume, links, preferences)
- **Stop button** — Abort in-progress requests
- **Auto-resizing input** — Textarea grows with content, max 200px

Messages are styled as chat bubbles — user messages on right (white), assistant responses on left (translucent). During loading, tool calls show as amber (running) → green (completed) pill indicators.

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Radix UI
- **Backend:** Cloudflare Workers, Hono (OpenAPI), Drizzle ORM, SQLite (D1)
- **AI:** OpenAI Agents SDK (GPT-5.2 research agent), Vercel AI SDK, GPT-4o-mini for extraction
- **Search:** Exa API (web search), Cloudflare Vectorize (semantic search)
- **Auth:** Clerk (frontend + JWT verification on backend)
- **Email Verification:** ZeroBounce API

## Architecture

### Monorepo

```
worker/     → Cloudflare Workers backend (Hono + OpenAPI/Chanfana)
frontend/   → Next.js 15 App Router frontend
```

### Agent System

**Orchestrator Agent** — Durable Object that runs the full pipeline: domain lookup → company metadata → people finder → email verification → store results.

**Research Agent** — OpenAI Agents SDK agent with streaming SSE responses. Tools: search query generation, user profile lookup, web search, email finding/verification. Maintains conversation sessions.

### Data Flow

```
User (chat) → Next.js → Clerk JWT → Hono Worker → Research Agent
  → generate_search_queries → web_search → find_and_verify_email
  → SSE stream back to frontend
```

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd linkd
   ```

2. Set up the backend:
   ```bash
   cd worker
   npm install
   # Create .dev.vars with: OPENAI_API_KEY, EXA_API_KEY, ZEROBOUNCE_API_KEY, CLERK_SECRET_KEY, CLERK_WEBHOOK_SIGNING_SECRET
   npm run dev
   ```

3. Set up the frontend (in a new terminal):
   ```bash
   cd frontend
   pnpm install
   # Create .env with: NEXT_PUBLIC_API_URL=http://localhost:8787
   pnpm dev
   ```

4. Access the application at [http://localhost:3000](http://localhost:3000)

## Development

### Backend Commands
```bash
cd worker
npm run dev              # Local dev server on :8787
npm run deploy           # Deploy to Cloudflare Workers
npm run cf-typegen       # Regenerate Cloudflare binding types
npx drizzle-kit generate # Generate DB migration
npx drizzle-kit migrate  # Run DB migration
```

### Frontend Commands
```bash
cd frontend
pnpm dev                 # Dev server on :3000
pnpm build               # Production build
pnpm lint                # ESLint
```

The frontend proxies `/api/*` requests to the backend via Next.js rewrites configured in `next.config.ts`.
