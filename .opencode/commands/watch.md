---
description: Block on a live task panel until all specified tasks complete
---

Monitor one or more tasks by calling `task-router.watch_task_group_blocking` directly. Do not read any planning files.

## Steps

1. Ask the user (or accept as arguments) the list of `task_id` values to watch, and optionally the `agent` for each.
2. Call `task-router.watch_task_group_blocking` with the task list. This call blocks until every task reaches a terminal state (`completed` or `failed`).
3. Display the returned `panel_history` or `panel_text` so the user can see the live task panel.
4. After the call returns, report:
   - Which tasks completed successfully
   - Which tasks failed (include error summary if available)

## Constraints

- Do not write any files.
- Do not proceed to `/merge` until all watched tasks are terminal.
