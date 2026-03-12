# Execute Plan Workflow

Use this workflow when an implementation plan is already approved and execution is the next step.

## Goals

- execute the approved plan in the intended order
- keep progress and discoveries synchronized with the planning files
- avoid improvising new design decisions during execution unless they are recorded and re-approved

## Execution Rules

1. Re-read the approved implementation plan before starting the next phase.
2. Execute tasks in the documented order unless a recorded dependency change justifies a change.
3. Update `progress.md` after each meaningful action or verification step.
4. Update `findings.md` when execution reveals new constraints, caveats, or follow-up work.
5. If execution requires a design change, pause and route back to the appropriate earlier workflow before continuing.

## Delegated Execution

- Give delegated agents the approved implementation plan, scoped files, and verification expectations.
- Keep each delegated task aligned to one clear execution unit when possible.
- Review delegated output against the plan, not just against the final diff.

## Completion Handoff

When the plan has been executed, move to `verify.md` for evidence gathering and `finish.md` for closure.
