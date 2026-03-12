---
name: verify
description: Gather fresh evidence before claiming success, approving delegated work, or merging changes. Use whenever completion, review, or merge decisions depend on observed results.
---

# Verify

Do not claim success without evidence.

## Checklist

1. Run the most relevant tests or checks for the changed area.
2. Confirm the output matches the intended result.
3. Inspect changed files for scope, consistency, and obvious regressions.
4. If delegated work is involved, review exit status, structured output, scope compliance, and test evidence.
5. Record the verification result in `progress.md`.

## Minimum Evidence

- docs-only changes: read-through plus scope review
- config or repository-skill changes: command/doc consistency review and any targeted checks that still apply
- code changes: targeted tests first, broader suite when risk justifies it

If verification fails, do not present the task as complete. Record the failure, fix or re-dispatch, then verify again.
