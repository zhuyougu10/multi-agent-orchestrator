---
name: brainstorm
description: Design non-trivial changes before implementation. Use when requirements, behavior, architecture, or repository process need clarification, options, and approval before execution.
---

# Brainstorm

Design first. Do not implement before approval.

## Goals

- understand intent before changing code or process
- compare approaches instead of locking onto the first idea
- present a recommended design before implementation begins

## Process

1. Inspect the current repository context first.
2. Ask focused clarification only when the answer materially changes the result.
3. Ask one question at a time when clarification is needed.
4. Propose two or three approaches with trade-offs and a recommendation.
5. Present the design at the right level of detail for the task size.
6. Wait for approval before implementation.
7. Record the approved direction in `findings.md` and `task_plan.md`.

## Required Topics

- goal and success criteria
- affected files and interfaces
- ownership or routing boundaries
- failure modes
- verification strategy

Do not start implementation until the design is specific enough that another engineer could follow it without guessing.
