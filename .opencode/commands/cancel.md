---
description: Cancel a running task by killing its agent process via MCP
---

Cancel a running task by calling `task-router.cancel_task` directly. This kills the agent process and marks the task as cancelled.

## Steps

1. Accept from the user:
   - `task_id` — the ID of the running task to cancel
2. Call `task-router.cancel_task` with `task_id`.
3. Report the result to the user:
   - If successful: which agent processes were killed.
   - If no active processes found: the task may have already completed or failed.

## What happens on cancel

- All active agent processes for the task are sent `SIGKILL`.
- A `failed` event is published with `phase: "cancelled"`.
- The result index is updated to `status: "cancelled"`.
- The `/watch` panel will reflect the cancelled state.

## When to use

- The task is stuck with no heartbeat or output for an extended period.
- The user realizes the task description was wrong and wants to stop it.
- Resource contention — need to free a concurrency slot for a higher-priority task.

## Constraints

- Do not write any files.
- Cancellation is irreversible. The task must be re-dispatched with a new `task_id` if needed.
- This does **not** clean up worktrees or artifacts. Use `/cleanup` for that.
