---
description: View task history and analytics via MCP
---

View a summary of all dispatched tasks, their scores, agent statistics, and retry counts by calling `task-router.task_history` directly.

## Steps

1. Call `task-router.task_history` (no parameters needed).
2. Present the summary to the user, including:
   - **Total tasks** and status breakdown (completed, failed, running, cancelled).
   - **Average score** across all scored task runs.
   - **Total retries** consumed.
   - **Agent stats** — runs and wins per agent (codex vs gemini).
3. Optionally list individual tasks with their scores and statuses.

## Response fields

| Field | Description |
|-------|-------------|
| `total_tasks` | Total number of dispatched tasks |
| `status_counts` | Object with `completed`, `failed`, `running`, `cancelled` counts |
| `average_score` | Mean score across all scored runs (null if no scores) |
| `total_retries` | Sum of all retry counts |
| `agent_stats` | Per-agent `{ runs, wins }` (win = score >= 60) |
| `tasks` | Array of individual task entries, sorted newest first |

Each task entry includes:
- `task_id`, `task_type`, `mode`, `selected_agent`
- `retry_count`, `status`, `created_at`
- `scores` — object mapping agent name to score value

## Constraints

- Do not write any files.
- This is a read-only operation.
