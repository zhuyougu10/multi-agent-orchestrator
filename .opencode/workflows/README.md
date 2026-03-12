# Repository Workflows

This repository ships with its own workflow layer. It keeps the source of truth for orchestration and execution inside this repo.

## Purpose

- Keep orchestration behavior self-contained
- Make the expected process readable from repository files alone
- Let the `orchestrator` agent and command docs depend on local workflow documents instead of external skill packages

## Workflow Files

- `intake.md` - request intake, complexity checks, workflow selection
- `brainstorm.md` - design-first collaboration for non-trivial work
- `plan.md` - planning files, decomposition, and persistent task tracking
- `implementation-plans.md` - turn approved designs into detailed implementation plans
- `execute-plan.md` - execute approved implementation plans and keep progress synchronized
- `verify.md` - evidence required before claiming success or merge readiness
- `finish.md` - final cleanup, reporting, and task closure
- `delegation-rules.md` - task routing, split rules, and execution-mode policy

These are workflow documents consulted by the orchestrator. They are not user-invoked commands.

## Lifecycle

- `intake.md` decides whether the work is trivial or needs the full repository workflow.
- `brainstorm.md` produces an approved design for non-trivial behavior, architecture, or workflow changes.
- `plan.md` creates and maintains `task_plan.md`, `findings.md`, and `progress.md`, and keeps the work decomposed into trackable units.
- `implementation-plans.md` turns the approved design into a file-level execution plan with ordering and verification.
- `execute-plan.md` governs carrying out that approved plan, whether locally or through delegated tasks.
- `verify.md` checks observed evidence before success claims, review, or merge.
- `finish.md` closes the loop with cleanup, planning-file updates, and final reporting.

## How Commands Use Them

- `/resume` is the memory-restore entry point; it reads the planning files plus workflow references and returns a structured status summary without changing files
- `/orchestrate` uses `intake.md`, `brainstorm.md`, `plan.md`, and the workflow documents that match the current phase
- `/delegate` follows `delegation-rules.md`
- `/review` and `/merge` follow `verify.md` plus `delegation-rules.md`
- `/finalize` follows `finish.md`

There are no separate command entry points yet for `implementation-plans.md` or `execute-plan.md`; existing commands should reference them when the task phase requires them.

## Planning Files

For multi-step work, maintain these files in the project root:

- `task_plan.md`
- `findings.md`
- `progress.md`

These files are part of the repository workflow.

Use `/resume` when you need to recover the current state of an in-flight task before deciding whether to continue with `/delegate`, `/review`, or another manual step.
