---
name: delegation-rules
description: Route tasks to Codex or Gemini, choose execution modes, and define safe delegation boundaries. Use whenever `/orchestrate`, `/delegate`, `/watch`, `/review`, `/merge`, or `/repair` reasons about routing or retries.
---

# Delegation Rules

Use these rules whenever orchestrated work is split or delegated.

## Preferred Routing

- Codex preferred: implementation, refactor, tests, bugfix, script
- Gemini preferred: docs, summarization, comparison, ux-copy

## Domain Overrides

- Prefer Gemini for frontend, UI, presentation, and UX-heavy work.
- Prefer Codex for backend, API, data flow, persistence, and test-heavy work.

## Split Rules

- Split mixed frontend/backend work when practical.
- Give each delegated task a narrow file scope.
- Avoid overlapping file scopes for concurrent tasks.

## Execution Modes

- `single` for simple, deterministic tasks
- `fallback` for most tasks where reliability matters
- `race` for ambiguous or high-value tasks where comparison is useful

## Delegation Requirements

For each dispatched task, define `task_id`, `task_type`, `prompt`, `files_scope`, `preferred_agent`, `mode`, and `test_command` when applicable.

Do not merge delegated output blindly. Wait for `/watch` to reach terminal states before `/review`.
