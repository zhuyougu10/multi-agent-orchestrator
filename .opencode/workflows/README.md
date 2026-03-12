# Repository Workflows

This repository ships with its own workflow layer. It preserves the disciplined process that previously depended on external `superpowers`, but keeps the source of truth inside this repo.

## Purpose

- Keep orchestration behavior self-contained
- Make the expected process readable from repository files alone
- Let the `orchestrator` agent and command docs depend on local workflow documents instead of external skill packages

## Workflow Files

- `intake.md` - request intake, complexity checks, workflow selection
- `brainstorm.md` - design-first collaboration for non-trivial work
- `plan.md` - planning files and implementation-plan discipline
- `verify.md` - evidence required before claiming success or merge readiness
- `finish.md` - final cleanup, reporting, and task closure
- `delegation-rules.md` - task routing, split rules, and execution-mode policy

## How Commands Use Them

- `/resume` is the memory-restore entry point; it reads the planning files plus workflow references and returns a structured status summary without changing files
- `/orchestrate` uses `intake.md`, `plan.md`, and `delegation-rules.md`
- `/delegate` follows `delegation-rules.md`
- `/review` and `/merge` follow `verify.md` plus `delegation-rules.md`
- `/finalize` follows `finish.md`

## Planning Files

For multi-step work, maintain these files in the project root:

- `task_plan.md`
- `findings.md`
- `progress.md`

These files are part of the repository workflow, not an external add-on.

Use `/resume` when you need to recover the current state of an in-flight task before deciding whether to continue with `/delegate`, `/review`, or another manual step.
