---
description: Finalize the task after merge and cleanup
---

Your task is to finalize the completed work and clean up resources.

Follow this repository-skill procedure strictly:

0. Apply `.opencode/skills/finish/SKILL.md` and use it as the completion checklist.

1. Verify main workspace:
    - Confirm all approved changes are merged
    - Check working directory is clean
   - Verify no orphaned changes

2. Run final validation:
   - Run full test suite if applicable
   - Check for broken imports
   - Verify build succeeds
   - Check for lint errors

3. Clean up worktrees:
   - Call task-router.cleanup_task for each completed task
   - This removes worktree directories and branches

4. Update planning files:
   - Mark all tasks as completed in task_plan.md
   - Add final notes to findings.md
   - Update final status in progress.md

5. Generate final report:
   - Summary of completed work
   - Files changed
   - Tests passed
   - Any remaining issues
   - Recommendations for next steps

6. Output:
   - Final implementation summary
   - List of changed files
   - Test results
   - Remaining TODOs (if any)
