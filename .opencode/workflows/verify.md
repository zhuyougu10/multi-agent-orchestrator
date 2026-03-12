# Verification Workflow

Use this workflow before claiming success, before approving delegated work, and before merging.

## Core Rule

Do not claim a task is complete unless the relevant evidence has been observed.

## Verification Checklist

1. Run the most relevant tests or checks for the changed area.
2. Confirm the output matches the intended result.
3. Inspect changed files for scope, consistency, and obvious regressions.
4. If delegated work is involved, review:
   - exit status
   - structured output when required
   - file-scope compliance
   - test evidence
5. Record the verification result in `progress.md`.

## Minimum Evidence By Change Type

- docs-only changes: read-through plus scope review
- config/workflow changes: command/doc consistency review and any targeted tests that still apply
- code changes: targeted tests first, broader suite when risk justifies it

## Failure Handling

- If verification fails, do not present the task as complete.
- Record the failure, fix or re-dispatch as needed, then re-run verification.
- Keep conclusions tied to observed output, not assumptions.
