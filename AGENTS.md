# AGENTS.md — Core Principles

This document defines core principles and rules for all AI agents working on this codebase.

---

## Research & Exploration

### 1. Documentation First
- **Use Context7 MCP** for up-to-date documentation
- **Always refer to official docs** when task involves a specific library/framework
- Don't assume knowledge - verify with current documentation
- Examples: Vercel AI SDK, React, Next.js, Cloudflare Workers, etc.

### 2. Parallel Exploration
- Launch **multiple background agents in parallel** (explore + librarian)
- Use direct tools alongside agents (grep, ast-grep, LSP)
- **Don't stop at first result** - be exhaustive in search
- Maximize throughput through concurrent operations

### 3. Codebase Understanding
- **Research existing patterns** before implementing new code
- Look for reusable components, hooks, utilities
- Understand directory structure and match it
- Don't reinvent what already exists

### 4. Evidence-Based Decisions
- Act only on **evidence and data**, never assumptions
- Fix **root causes**, not symptoms
- If missing critical info → **ask**, don't guess
- Back all decisions with research findings

### 5. Specialist Consultation
- **Don't struggle alone** on complex problems
- Use **Oracle** for: architecture decisions, debugging after 2+ failures, unfamiliar patterns
- Use **Artistry** for: non-conventional approaches requiring creative solutions
- Delegate to agents with appropriate skills (git-master, frontend-ui-ux, playwright, etc.)

### 6. Synthesize Before Coding
- Gather all findings from parallel searches
- Analyze and **synthesize** before diving into implementation
- Don't code until you understand the full picture

---

## Planning & Implementation

### 7. Plan First, Code Second
- Create **low-level plan** before writing code
- Explain what the fix will look like
- Ensure plan is **research-backed**
- Only proceed when approach is validated

### 8. File Size & Structure
- New files should be **~300 lines** maximum
- When exceeding, **split into components**
- Follow existing **directory structure** (e.g., `components/chat/` for chat-related)
- Match existing patterns (naming, styling, imports)

### 9. Code Quality
- **Self-documenting code** - no unnecessary comments
- Remove comments that explain "what" - code should speak for itself
- Keep comments only for "why" (complex algorithms, security, performance)
- Respect **type safety** - no `as any`, `@ts-ignore`, `@ts-expect-error`
- **LSP diagnostics** must be clean before marking complete

### 10. Todo Management
- Create todos **before starting** any multi-step task
- Mark `in_progress` before starting each step
- Mark `completed` **immediately** after finishing (don't batch)
- Only one todo `in_progress` at a time
- Track progress visibly for user

### 11. Session Continuity
- Always use `session_id` from previous delegation
- **Don't start fresh** when continuing work
- Preserves 70%+ tokens by reusing context
- Required for: follow-up questions, bug fixes, multi-turn conversations

---

## Workflow

### 12. User Approval Flow
- Ask **"Does this look good?"** before proceeding after implementation
- Get **approval before cleanup** of unused code
- Don't commit unless explicitly requested
- Confirm all changes are working before offering cleanup

### 13. Parallel Execution Pattern
```typescript
// CORRECT: Fire multiple agents in parallel
task(subagent_type="explore", run_in_background=true, ...)
task(subagent_type="librarian", run_in_background=true, ...)

// WRONG: Sequential or blocking
result = task(..., run_in_background=false)
```

### 14. Delegation Prompt Structure
All delegations must include 6 sections:
1. **TASK** - Atomic, specific goal
2. **EXPECTED OUTCOME** - Concrete deliverables with success criteria
3. **REQUIRED TOOLS** - Explicit tool whitelist
4. **MUST DO** - Exhaustive requirements, leave nothing implicit
5. **MUST NOT DO** - Forbidden actions, anticipate rogue behavior
6. **CONTEXT** - File paths, patterns, constraints

### 15. Verification
After any change:
- Run `lsp_diagnostics` on changed files
- Build/test commands if project has them
- **Verify results** before marking complete
- Fix issues you caused, ignore pre-existing issues

### 16. Stop & Clean Up
- **Cancel all background tasks** at end: `background_cancel(all=true)`
- Conserves resources, ensures clean workflow
- Do this before final answer delivery

---

## Communication

### 17. Be Concise
- **No acknowledgments** ("I'm on it", "Let me...", "I'll start...")
- Answer **directly** without preamble
- One-word answers acceptable when appropriate
- **No flattery** or praise

### 18. No Status Updates
- Don't announce what you're doing
- Use **todos for progress tracking**
- Just do the work

### 19. Match User Style
- If user is terse, be terse
- If user wants detail, provide detail
- Adapt to their communication preference

---

## Technical Specifics

### Frontend (Next.js + React)
- **Research existing components** in `src/components/` before creating new ones
- Check `src/lib/` for utilities
- Match existing patterns (Radix UI, Tailwind classes, shadcn/ui)
- Follow routing structure in `src/app/`

### Backend (Cloudflare Workers + Hono)
- Understand existing D1 schema and Drizzle ORM
- Match OpenAPI patterns in `src/endpoints/`
- Follow error handling conventions
- Respect auth patterns (Clerk JWT verification)

---

## Hard Blocks (Never Violate)

| Constraint | No Exceptions |
|------------|---------------|
| Type error suppression | `as any`, `@ts-ignore`, `@ts-expect-error` |
| Commit without explicit request | Never auto-commit |
| Speculate about unread code | Always read before assuming |
| Leave code in broken state | Fix or revert, never broken |

---

## When to Ask

**MUST ask when:**
- Multiple valid interpretations with 2x+ effort difference
- Missing critical info (file path, error, context)
- Design seems flawed or suboptimal
- Uncertain about scope or requirements

**Ask format:**
```
What I understood: [interpretation]
What I'm unsure about: [specific ambiguity]
Options I see:
1. [Option A] - [effort/implications]
2. [Option B] - [effort/implications]

My recommendation: [suggestion with reasoning]
```

---

## Post-Task

After completing any task:
1. **Update AGENTS.md** with new principles learned
2. Note patterns that emerged
3. Add any rules that would have helped
4. Keep document living and evolving
