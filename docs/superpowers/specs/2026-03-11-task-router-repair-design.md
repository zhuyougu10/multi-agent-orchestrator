# Task Router Repair Design

## Goal
Fix the task-router issues uncovered during test-plan execution: avoid bogus commits for read-only tasks, normalize agent JSON output before scoring, and prefer router-owned test evidence when determining task success.

## Proposed Design

- Add a small result utility module under `.mcp/task-router/lib/` to keep result parsing and success rules testable.
- Change task success evaluation so a task with a `test_command` is only considered successful when both the agent run and the router-run tests succeed.
- Change commit behavior so worktree tasks only commit when the worktree actually has changes.
- Change stdout parsing for scoring so the router accepts direct JSON, fenced JSON blocks, or JSON preceded by narrative text.

## Key Decisions

- Keep the changes localized to `.mcp/task-router/server.js` plus one helper module and focused tests.
- Do not change the task-router public MCP tool surface in this repair.
- Preserve raw stdout/stderr for debugging, but use normalized structured output for scoring.

## Risks

- Tightening success rules can change fallback behavior for tasks that previously looked successful despite failed router-run tests.
- JSON extraction must stay conservative enough to avoid accepting arbitrary prose as valid structured output.

## Verification Plan

- Add unit tests for commit gating, JSON extraction, and task-success rules.
- Run the task-router test suite with explicit test file paths.
