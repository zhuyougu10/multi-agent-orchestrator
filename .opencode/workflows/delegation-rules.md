# Delegation Rules

Use these rules whenever `/orchestrate`, `/delegate`, `/watch`, `/review`, or `/merge` reasons about task routing.

## Preferred Routing By Task Type

- Codex preferred: implementation, refactor, tests, bugfix, script
- Gemini preferred: docs, summarization, comparison, ux-copy

## Domain Overrides

- Prefer Gemini for frontend, UI, presentation, and UX-heavy work
- Prefer Codex for backend, API, data flow, persistence, and test-heavy work

## Split Rules

- If a request mixes frontend and backend work, split it when practical.
- Give each delegated task a narrow file scope.
- Avoid overlapping file scopes for concurrent tasks.

## Execution Modes

- `single` for simple, deterministic tasks
- `fallback` for most tasks where reliability matters
- `race` for ambiguous or high-value tasks where comparison is useful

## Delegation Requirements

For each dispatched task, define:

- `task_id`
- `task_type`
- `prompt`
- `files_scope`
- `preferred_agent`
- `mode`
- `test_command` when applicable

## Review Expectations

- Do not merge delegated output blindly.
- Wait for `/watch` to reach terminal states before `/review`.
- Use evidence from results, scores, tests, and diffs before approving merge.
