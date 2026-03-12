# Repository Skills

This repository ships with its own skill layer. It keeps the source of truth for orchestration and execution inside this repo.

## Purpose

- Keep orchestration behavior self-contained
- Make the expected process readable from repository files alone
- Let the `orchestrator` agent and command docs depend on local repository skills instead of external skill packages

## Skill Packages

- `intake/SKILL.md` - request intake, complexity checks, and next-skill selection
- `brainstorm/SKILL.md` - design-first collaboration for non-trivial work
- `plan/SKILL.md` - planning files, decomposition, and persistent task tracking
- `implementation-plans/SKILL.md` - turn approved designs into detailed implementation plans
- `execute-plan/SKILL.md` - execute approved implementation plans and keep progress synchronized
- `verify/SKILL.md` - evidence required before claiming success or merge readiness
- `finish/SKILL.md` - final cleanup, reporting, and task closure
- `delegation-rules/SKILL.md` - task routing, split rules, and execution-mode policy

These are repository skill packages consulted by the orchestrator. They are not user-invoked commands.

## Lifecycle

- `intake` decides whether the work is trivial or needs the full repository skill layer.
- `brainstorm` produces an approved design for non-trivial behavior, architecture, or repository-process changes.
- `plan` creates and maintains `task_plan.md`, `findings.md`, and `progress.md`, and keeps the work decomposed into trackable units.
- `implementation-plans` turns the approved design into a file-level execution plan with ordering and verification.
- `execute-plan` governs carrying out that approved plan, whether locally or through delegated tasks.
- `verify` checks observed evidence before success claims, review, or merge.
- `finish` closes the loop with cleanup, planning-file updates, and final reporting.

## How Commands Use Them

- `/resume` is the memory-restore entry point; it reads the planning files plus repository-skill references and returns a structured status summary without changing files
- `/orchestrate` uses `intake/SKILL.md`, `brainstorm/SKILL.md`, `plan/SKILL.md`, and the skill packages that match the current phase
- `/delegate` follows `delegation-rules/SKILL.md`
- `/review` and `/merge` follow `verify/SKILL.md` plus `delegation-rules/SKILL.md`
- `/finalize` follows `finish/SKILL.md`

There are no separate command entry points yet for `implementation-plans/SKILL.md` or `execute-plan/SKILL.md`; existing commands should reference them when the task phase requires them.

## Planning Files

For multi-step work, maintain these files in the project root:

- `task_plan.md`
- `findings.md`
- `progress.md`

These files are part of the repository skill layer.

Use `/resume` when you need to recover the current state of an in-flight task before deciding whether to continue with `/delegate`, `/review`, or another manual step.
