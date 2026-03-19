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

## Retry limit

The system **enforces a hard limit of 2 retries per task**. The `retry_count` is tracked in the job file and incremented automatically on each retry. If the limit is exceeded, `retry_task` will throw an error:

```
retry limit exceeded for <task_id>: 2/2
```

When this happens:
- Do **not** attempt to call `retry_task` again.
- Advise the user to review the failure manually, adjust the approach, or dispatch a new task with a different `task_id`.

## Constraints

- Do not write any files.
- Maximum **2 retries** per task (enforced by the system). After that, escalate to manual review.
- Consider switching agents after the first failure.
- The response now includes a `retry_count` field showing the current retry number.
