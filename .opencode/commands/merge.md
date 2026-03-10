---
description: Merge the selected winning result back to main workspace
---

Your task is to merge approved task results into the main workspace.

Follow this workflow strictly:

1. Read progress.md to identify tasks approved for merge

2. For each approved task:
   a. Determine merge strategy:
      - Docs, README, small edits: patch
      - Code implementation, tests, refactor: cherry-pick
      - High-risk, large changes: manual-review

   b. Prepare the merge:
      - Call task-router.prepare_merge
      - task_id: the approved task
      - agent: the winning agent
      - strategy: patch or cherry-pick

   c. Review merge preparation:
      - Check diff_stat for scope
      - Verify commit SHA (cherry-pick)
      - Verify patch files (patch mode)

   d. Execute the merge:
      - Call task-router.merge_winner
      - task_id: the approved task
      - agent: the winning agent
      - strategy: the selected strategy

   e. Handle merge result:
      - If success: Record in progress.md
      - If conflict: Call task-router.abort_merge, then repair

3. Post-merge verification:
   - Run tests if applicable
   - Check for broken imports
   - Verify functionality

4. Error handling:
   - Patch apply failure: Try cherry-pick or repair
   - Cherry-pick conflict: Abort and repair
   - Test failure: Repair with fix instructions

5. Output:
   - Merge summary
   - Tasks merged successfully
   - Tasks with conflicts
   - Files changed
