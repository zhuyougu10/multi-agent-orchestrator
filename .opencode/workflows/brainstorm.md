# Brainstorm Workflow

Use this workflow before implementing non-trivial changes.

## Goals

- Understand intent before changing code or process
- Compare approaches instead of locking onto the first idea
- Present a recommended design before implementation begins

## Process

1. Inspect the current repository context first.
2. Clarify the request only when the answer materially changes the outcome.
3. Ask one focused question at a time when clarification is needed.
4. Propose two or three approaches with trade-offs and a recommendation.
5. Present the design in a form that matches the task size:
   - short and direct for small workflow changes
   - more structured for cross-cutting architecture changes
6. Wait for approval on the design before implementation.
7. Record the approved direction in `findings.md` and `task_plan.md`.

## Required Topics For Non-Trivial Work

- goal and success criteria
- affected files and interfaces
- routing or ownership boundaries
- error handling and failure modes
- verification strategy

## Exit Criteria

Do not start implementation until the design is specific enough that another engineer could follow it without guessing.
