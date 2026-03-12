---
name: execute-plan
description: Execute an approved implementation plan in order, keep progress synchronized, and stop safely on blockers or design changes. Use once a usable implementation plan already exists.
---

# Execute Plan

Execute the approved plan without improvising unrecorded design changes.

## Rules

1. Re-read the approved implementation plan before starting the next phase.
2. Execute tasks in the documented order unless a recorded dependency change justifies a change.
3. Update `progress.md` after each meaningful action or verification step.
4. Update `findings.md` when execution reveals new constraints, caveats, or follow-up work.
5. If execution requires a design change, pause and route back to the appropriate earlier skill before continuing.

## Delegated Execution

- Give delegated agents the approved implementation plan, scoped files, and verification expectations.
- Keep each delegated task aligned to one clear execution unit when possible.
- Review delegated output against the plan, not just against the final diff.

## Handoff

When plan execution is complete, move to `verify` for evidence gathering and `finish` for closure.
