# Implementation Plan Workflow

Use this workflow after a design is approved and before execution begins.

## Goals

- turn an approved design into a concrete implementation plan
- make file ownership, sequencing, and verification explicit
- produce a plan another engineer or delegated agent can execute without guesswork

## When To Use It

- after `brainstorm.md` produces an approved design
- before dispatching execution work to another agent
- before starting any multi-step implementation that depends on ordered changes

## Plan Contents

The implementation plan should include:

- the exact files to create, modify, or leave untouched
- the reason each file changes
- the ordered task list or phases
- dependencies and sequencing constraints between tasks
- verification commands or read-through checks for each phase
- expected outcomes or pass conditions
- explicit out-of-scope items when helpful

## Process

1. Re-read the approved design and current planning files.
2. Map the design to concrete repository surfaces.
3. Split the work into the smallest useful execution units.
4. Assign verification to each unit, not only to the final result.
5. Record the implementation plan in `task_plan.md` or a referenced planning artifact.
6. Confirm the plan is specific enough to execute directly.

## Exit Criteria

Do not begin execution until the implementation plan names the affected files, ordering, and verification path clearly enough that the next step is mechanical rather than interpretive.
