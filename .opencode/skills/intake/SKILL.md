---
name: intake
description: Assess incoming requests, decide whether work is trivial or needs the full repository skill flow, and route to the next local skill. Use at the start of any orchestrated task.
---

# Intake

Assess the request before planning or implementation.

## Goals

- understand the goal, constraints, and affected areas
- decide whether the work is trivial or multi-step
- choose which repository skill to apply next

## Process

1. Read the current request and relevant repository context.
2. Identify the goal, constraints, affected files, and verification expectations.
3. Classify the work:
   - small, single-file, low-risk work can proceed directly
   - multi-step, cross-file, or ambiguous work must enter planning
4. If the request changes behavior, architecture, repository process, or user experience, require design-first thinking before implementation.
5. For work larger than a single-file edit, create or update `task_plan.md`, `findings.md`, and `progress.md`.
6. Before implementation, make sure the task has clear boundaries and at least one verification path.

## Route To Other Skills

- Use `brainstorm` when requirements are ambiguous, creative, or change system behavior.
- Use `plan` when the work needs persistent decomposition or progress tracking.
- Use `delegation-rules` when the task will be split or dispatched.
- Use `verify` before claiming completion.
- Use `finish` when cleanup and closure are the next step.
