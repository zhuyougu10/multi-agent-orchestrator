---
description: Block on a visible task panel until all dispatched tasks are terminal
---

Your task is to load the currently active dispatched tasks and call the blocking MCP watcher so the user can see a task panel until every task is terminal.

Follow this workflow strictly:

0. Treat `.opencode/workflows/delegation-rules.md` as the canonical source for task identity and grouping expectations recorded during `/delegate`.

1. Read progress.md to identify active dispatched tasks:
   - tasks launched by `/delegate`
   - tasks not yet marked `completed` or `failed`
   - recover `task_id`, `agent`, and latest `cursor` if known

2. Build the watcher input:
   - include all active tasks in a single call to `task-router.watch_task_group_blocking`

3. Call the blocking watcher:
   - use `task-router.watch_task_group_blocking`
   - print the returned `panel_history` or final `panel_text` so the user can see the visible task panel snapshots
   - this command must not return until the MCP tool reports that all tasks are terminal

4. After the blocking watcher returns:
   - record final statuses in progress.md
   - optionally collect final task payloads with `task-router.collect_result`
   - only then allow the orchestrator to continue to `/review`

5. Constraints:
   - treat both `completed` and `failed` as terminal
   - do not start `/review`, `/merge`, or later steps until `/watch` finishes
   - keep the panel output visible and easy to scan

6. Output:
   - Final panel snapshot
   - Terminal summary counts
   - Which tasks completed and which failed
