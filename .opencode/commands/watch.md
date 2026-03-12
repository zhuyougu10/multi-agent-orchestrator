---
description: Monitor tasks with a live updating panel using polling
---

Monitor one or more tasks by polling `task-router.watch_task_group` repeatedly. This allows the user to see real-time progress updates.

## Steps

1. Ask the user (or accept as arguments) the list of `task_id` values to watch, and optionally the `agent` for each.

2. Initialize polling state:
   - Set `all_terminal = false`
   - Set `tasks` = list of {task_id, agent, cursor: 0}

3. **POLLING LOOP** - Repeat until `all_terminal` is true:
   
   a. Call `task-router.watch_task_group` with:
      - `tasks`: current task list with cursor values
      - `wait_ms`: 5000 (wait up to 5 seconds for new events)
   
   b. **IMMEDIATELY display** the `panel_text` to the user:
      ```
      --- Task Panel ---
      {panel_text}
      ------------------
      ```
   
   c. Update state from response:
      - `all_terminal` = response.all_terminal
      - `tasks` = response.tasks (updated cursors)
   
   d. If not terminal, briefly mention "Polling for updates..." then continue loop

4. When `all_terminal` is true, report final summary:
   - Display final `panel_text`
   - List which tasks completed successfully
   - List which tasks failed (include error summary if available)

## Example Panel Output

```
--- Task Panel ---
Tasks: 2 total | running: 1 | completed: 1 | failed: 0

task-001 | codex  | completed | 2024-01-15T10:30:05Z | completed
task-002 | gemini | running   | 2024-01-15T10:30:06Z | heartbeat
------------------
```

## Constraints

- Do NOT use `watch_task_group_blocking` - use the non-blocking `watch_task_group` with polling
- Do not write any files
- Always show `panel_text` to the user after each poll
- Do not proceed to `/merge` until all watched tasks are terminal
