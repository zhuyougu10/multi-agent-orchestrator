# Intake Workflow

Use this workflow at the start of any orchestrated task.

## Goals

- Understand what the user wants
- Decide whether the work is trivial, moderate, or complex
- Choose the next local workflow to apply
- Avoid jumping into implementation before scope is clear

## Process

1. Read the current request and relevant repository context.
2. Identify the goal, constraints, affected files, and verification expectations.
3. Classify the work:
   - Small, single-file, low-risk work can proceed directly.
   - Multi-step, cross-file, or ambiguous work must enter planning.
4. If the request changes behavior, architecture, workflow, or user experience, do design-first thinking before implementation.
5. For any task larger than a single-file edit, create or update:
   - `task_plan.md`
   - `findings.md`
   - `progress.md`
6. Before starting implementation, make sure the current task has a clear goal, explicit boundaries, and at least one verification path.

## Routing To Other Workflows

- Use `brainstorm.md` when requirements are ambiguous, creative, or change system behavior.
- Use `plan.md` when the work is multi-step or needs persistent execution tracking.
- Use `delegation-rules.md` when the task will be split or dispatched.
- Use `verify.md` before claiming the task is complete.
- Use `finish.md` when merging and cleanup are the next steps.
