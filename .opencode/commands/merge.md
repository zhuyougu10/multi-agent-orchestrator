---
description: Merge a task result back to the main workspace via MCP
---

Merge an approved task result by calling `task-router.prepare_merge` then `task-router.merge_winner` directly. Do not read or write any planning files.

## Steps

1. Accept from the user:
   - `task_id` — the task whose result should be merged
   - `agent` — the winning agent (`codex` or `gemini`)
   - `strategy` *(optional)* — `patch` or `cherry-pick` (default: `patch`)
2. Call `task-router.prepare_merge` with `task_id`, `agent`, and `strategy` to preview the changes.
   - Review `diff_stat` for scope.
   - For `cherry-pick`, verify the commit SHA; for `patch`, verify the patch files.
3. If the preview looks correct, call `task-router.merge_winner` with `cwd`, `task_id`, `agent`, and `strategy` to apply the merge.
4. If the merge fails during cherry-pick, call `task-router.abort_merge` with `cwd`, then advise the user to run `/repair`.

## Strategy guide

| Situation | Recommended strategy |
|-----------|----------------------|
| Docs, README, small text edits | `patch` |
| Code implementation, tests, refactor | `cherry-pick` |

## Constraints

- Do not write any files.
- Abort and repair before retrying a failed merge.
