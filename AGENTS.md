# AGENTS.md

## Research
- **Docs first** — verify with official documentation, don't assume
- **Parallel exploration** — launch multiple searches concurrently, don't stop at first result
- **Understand before implementing** — research existing patterns, reuse what exists
- **Evidence over assumptions** — if missing info, ask; fix root causes, not symptoms
- **Delegate hard problems** — don't struggle alone on architecture, debugging, or unfamiliar patterns
- **Synthesize before coding** — gather all findings, then act

## Planning & Code
- **Plan first, code second** — research-backed plan before any implementation
- **~300 line max per file** — split when exceeding
- **Match existing patterns** — naming, structure, styling, directory layout
- **Self-documenting code** — comments only for "why", never "what"
- **No type suppression** — no `as any`, `@ts-ignore`, `@ts-expect-error`
- **Clean diagnostics** — LSP/linter must pass before marking complete

## Workflow
- **Todos before work** — create before multi-step tasks, track in real-time (one `in_progress` at a time)
- **Verify after every change** — diagnostics, build, tests
- **Fix what you broke** — ignore pre-existing issues
- **Ask before committing** — never auto-commit
- **Get approval** — confirm changes work before cleanup or next steps
- **Reuse sessions** — continue with `session_id`, don't start fresh

## Communication
- **No preamble** — no "I'm on it", no flattery, no status updates
- **Match user style** — terse if they're terse, detailed if they want detail
- **Just do the work** — todos track progress, not announcements

## Hard Blocks

| Never Do | Why |
|----------|-----|
| Suppress type errors | Hides bugs |
| Auto-commit | User controls git |
| Assume unread code | Read first |
| Leave broken state | Fix or revert |

## When to Ask
- Multiple interpretations with 2x+ effort difference
- Missing critical info
- Design seems flawed
- Scope is unclear

Format: what you understood → what's ambiguous → options with effort → your recommendation

## Post-Task
Update this file with new principles learned. Keep it living.

---

### Message Parts Persistence
- `createUIMessageStream.onFinish` → `{ responseMessage }`, not `{ messages }`
- Handle `"null"` strings in JSON columns with try/catch
- Only store parts if they exist (null vs `"[]"`)
