---
description: Clean up all artifacts for a completed task via MCP
---

Remove all artifacts (worktrees, branches, result files, score files, bundles, patches, events, and job files) for a completed task by calling `task-router.cleanup_task` directly.

## Steps

1. Accept from the user:
   - `task_id` — the ID of the task to clean up
2. Call `task-router.cleanup_task` with `task_id`.
3. Report what was cleaned:
   - Worktrees removed and branches deleted (per agent).
   - Artifact files deleted (results, scores, bundles, patches, events, job).

## What gets cleaned

| Artifact | Location | Cleaned |
|----------|----------|---------|
| Git worktrees | `work/worktrees/<task_id>-<agent>` | Yes (force removed) |
| Git branches | `agent/<task_id>-<agent>` | Yes (deleted) |
| Job file | `work/jobs/<task_id>.json` | Yes |
| Result index | `work/results/<task_id>.json` | Yes |
| Agent results | `work/results/<task_id>.<agent>.json` | Yes |
| Score files | `work/scores/<task_id>.<agent>.json` | Yes |
| Bundle files | `work/bundles/<task_id>.<agent>.json` | Yes |
| Patch directories | `work/patches/<task_id>-<agent>/` | Yes (recursively) |
| Event file | `work/events/<task_id>.jsonl` | Yes |

## When to use

- After a task has been successfully merged and is no longer needed.
- To free disk space from accumulated task artifacts.
- After reviewing a failed task that will not be retried.

## Constraints

- Do not write any files.
- Ensure the task is **not currently running** before cleanup. Use `/cancel` first if needed.
- Cleanup is irreversible — all task data will be permanently deleted.
