---
name: plan
description: Maintain repository planning files, decompose work into trackable units, and preserve execution context. Use for multi-step tasks or any work that needs persistent task tracking.
---

# Plan

Maintain the repository planning files and keep work decomposed.

## Planning Files

Maintain these files in the repository root:

- `task_plan.md` - active goal, phases, decisions, and errors
- `findings.md` - research notes, discoveries, and constraints
- `progress.md` - chronological execution log and verification notes

## Rules

1. Create or update the planning files before substantial implementation.
2. Re-read the planning files before major decisions if context has shifted.
3. Add meaningful discoveries to `findings.md`.
4. Add major actions and verification steps to `progress.md`.
5. Keep `task_plan.md` current with status, decisions, and errors.

## Decomposition

- Break work into the smallest verifiable units that still make sense independently.
- Use file scopes to avoid overlap between concurrent delegated tasks.
- Separate frontend-heavy and backend-heavy work when practical.
- Prefer one clear purpose per task.

## Handoff

- Use `implementation-plans` after design approval when the next step is turning the design into executable file-level work.
- Use `execute-plan` once the implementation plan is approved and execution begins.
