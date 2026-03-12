# Planning Workflow

Use this workflow for any task that needs more than a few direct edits or persistent task tracking.

## Persistent Planning Files

Maintain these files in the repository root:

- `task_plan.md` - the active goal, phases, decisions, and errors
- `findings.md` - research notes, discoveries, and constraints
- `progress.md` - chronological execution log and verification notes

## Planning Rules

1. Create or update the planning files before substantial implementation.
2. Re-read the planning files before major decisions if context has shifted.
3. After every meaningful discovery, add it to `findings.md`.
4. After every major action or verification step, add it to `progress.md`.
5. Keep `task_plan.md` current with phases, status, decisions, and errors.

## Task Decomposition

- Break work into the smallest verifiable units that still make sense independently.
- Use file scopes to avoid overlap between concurrently delegated tasks.
- Separate frontend-heavy and backend-heavy work when possible.
- Prefer one clear purpose per task.

## Handoff To Later Workflows

- Use `implementation-plans.md` after the design is approved and the next step is turning it into executable file-level work.
- Use `execute-plan.md` once the implementation plan is approved and execution begins.

## Error Logging

Every failed attempt that changes the execution path should be recorded in `task_plan.md` so the same failure is not repeated blindly.
