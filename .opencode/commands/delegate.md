---
description: Dispatch a task directly to Codex or Gemini via MCP
---

Dispatch the user-described task to the appropriate agent by calling `task-router.dispatch_task` directly. Do not read or write any planning files.

## Agent routing

Choose `preferred_agent` based on task type:

| Task type | Agent |
|-----------|-------|
| implementation, refactor, tests, bugfix, script | codex |
| docs, summarization, comparison, ux-copy | gemini |

Override toward **gemini** for frontend/UI/UX-heavy work; override toward **codex** for backend/API/data/test-heavy work.

## Execution modes

- `single` — one agent only
- `fallback` — try primary agent first, switch to secondary on failure (default)
- `race` — dispatch to both agents in parallel, take the winner

## Steps

1. Determine `task_type` and `preferred_agent` from the user's description.
2. Assign a short, descriptive `task_id` (e.g. `impl-auth-module`).
3. Call `task-router.dispatch_task` with:
   - `task_id` — unique identifier for this task
   - `task_type` — one of the types above
   - `cwd` — current working directory
   - `prompt` — detailed, actionable instructions
   - `preferred_agent` — `codex` or `gemini`
   - `mode` — `single`, `fallback`, or `race`
   - `files_scope` *(optional)* — relative paths or glob patterns for relevant files
   - `test_command` *(optional)* — command to run tests after execution
4. Return immediately. Do not block.
5. Tell the user the `task_id` and remind them to run `/watch` to monitor progress.

## Constraints

- Do not write any files.
- Do not overlap `files_scope` between concurrent tasks.
- Keep prompts specific and actionable.
