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
   - Review `diff_stat` for a summary of changed lines/files.
   - Review `files_changed` for the list of affected file paths.
   - For `cherry-pick`, verify the commit SHA; for `patch`, verify the patch file path.
3. If the preview looks correct, call `task-router.merge_winner` with `cwd`, `task_id`, `agent`, and `strategy` to apply the merge.
4. If the merge fails during cherry-pick, call `task-router.abort_merge` with `cwd`, then advise the user to run `/repair`.

## Preview response fields

The `prepare_merge` response now includes:

| Field | Description |
|-------|-------------|
| `diff_stat` | `git diff --stat` output showing files and line counts |
| `files_changed` | Array of changed file paths from the agent's diff |
| `patch_file` | *(patch only)* Path to the generated `.patch` file |
| `commit_sha` | *(cherry-pick only)* The commit SHA to cherry-pick |

Always present these fields to the user before proceeding with the merge.

## Strategy guide

| Situation | Recommended strategy |
|-----------|----------------------|
| Docs, README, small text edits | `patch` |
| Code implementation, tests, refactor | `cherry-pick` |

## Constraints

- Do not write any files.
- Abort and repair before retrying a failed merge.
