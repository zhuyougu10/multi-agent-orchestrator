# Finish Workflow

Use this workflow when approved work has been merged or is ready for closure.

## Goals

- leave the main workspace in a verified state
- clean up temporary resources
- update project memory files
- produce a final, accurate handoff summary

## Process

1. Confirm the intended changes are present in the main workspace.
2. Run the final validation appropriate to the change set.
3. Clean up worktrees or task-router state that is no longer needed.
4. Update:
   - `task_plan.md`
   - `findings.md`
   - `progress.md`
5. Report what changed, how it was verified, and any remaining issues.

## Completion Standard

The task is not fully finished until verification, cleanup, and planning-file updates are all done.

This workflow is for closure only. Planning, implementation-plan authoring, and execution discipline belong in earlier workflow documents.
