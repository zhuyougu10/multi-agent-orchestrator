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
- `fallback` — try primary agent first, switch to secondary on failure **or low score** (default)
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
   - `constraints` *(optional)* — string array of expectations the agent must satisfy (e.g. `["add error handling", "write unit tests"]`). Violated constraints deduct 10 points from the score.
   - `test_command` *(optional)* — command to run tests after execution
   - `output_schema` *(optional)* — expected fields in the agent's JSON output
   - `timeout_ms` *(optional, default 300000)* — hard timeout in ms (1000–600000)
   - `idle_timeout_ms` *(optional, default 3000)* — idle timeout in ms (500–60000). Increase for tasks where the agent may think for a long time without producing output.
   - `score_threshold` *(optional, default 0)* — minimum score (0–100) for the primary agent in `fallback` mode. If the primary agent's score is below this threshold, the secondary agent is automatically invoked even if the run technically succeeded.
4. Return immediately. Do not block.
5. Tell the user the `task_id` and remind them to run `/watch` to monitor progress.

## Constraints

- Do not write any files.
- Do not overlap `files_scope` between concurrent tasks.
- Keep prompts specific and actionable.
- The system enforces a maximum of **4 concurrent tasks** by default. Additional dispatches will queue until a slot is available.
