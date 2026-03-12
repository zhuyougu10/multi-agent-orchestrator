---
description: Retry a failed task with fix instructions via MCP
---

Repair a failed task by calling `task-router.retry_task` directly. Do not read or write any planning files.

## Steps

1. Accept from the user:
   - `task_id` — the ID of the failed task
   - `issue` — description of what went wrong and how to fix it
   - `preferred_agent` *(optional)* — switch agents if the first attempt failed
2. *(Optional)* Call `task-router.collect_result` with the `task_id` to review the failure output before deciding on the fix.
3. Call `task-router.retry_task` with:
   - `task_id`
   - `issue` — clear repair instructions
   - `preferred_agent` *(optional)*
4. Tell the user the retry has been dispatched and to run `/watch` with the same `task_id` to monitor progress.

## Constraints

- Do not write any files.
- Maximum 2 retries per task; after that, escalate to manual review.
- Consider switching agents after the first failure.
