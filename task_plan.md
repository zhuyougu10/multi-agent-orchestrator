# Task Plan: Initial Project Setup and Verification

## Goal
Initialize the multi-agent orchestration project, verify the environment, and establish the planning foundation.

## Scope
- Project structure verification
- MCP server functionality check
- Planning files initialization
- Environment readiness check

## Task Breakdown

- [x] task-001: Project Initialization
  - type: implementation
  - mode: single
  - preferred_agent: codex
  - scope: ["."]
  - test_command: git status
  - depends_on: none

- [ ] task-002: Verify MCP Server
  - type: script
  - mode: single
  - preferred_agent: codex
  - scope: [".mcp/task-router/**"]
  - test_command: node .mcp/task-router/server.js --help
  - depends_on: task-001

- [ ] task-003: Document Current Findings
  - type: docs
  - mode: single
  - preferred_agent: gemini
  - scope: ["findings.md"]
  - test_command: ""
  - depends_on: task-002

- [ ] task-004: Setup Initial Progress Tracking
  - type: docs
  - mode: single
  - preferred_agent: gemini
  - scope: ["progress.md"]
  - test_command: ""
  - depends_on: task-003

## Delegation Map
- Codex: task-001, task-002
- Gemini: task-003, task-004

## Notes
- MCP server uses `@modelcontextprotocol/sdk`.
- Worktrees are used for agent isolation.
- Fallback/Race modes are preferred for critical tasks.

## 2026-03-10 Task: Repair task-router agent CLI invocation

### Goal
Fix `task-router` so delegated Codex/Gemini tasks can run successfully with arbitrary prompts (including Chinese text and spaces).

### Task Breakdown
- [complete] diagnose-failure
  - inspect router command builder and process spawning behavior
  - confirm root cause from observed stderr in result files
- [complete] implement-fix
  - harden CLI argument construction for both agents
  - avoid prompt splitting/flag conflicts
- [complete] verify-end-to-end
  - run direct `dispatch_task` smoke checks for codex and gemini
  - collect result bundles and confirm `ok: true`
- [complete] reload-mcp-runtime
  - restart MCP host/session so `task-router` loads latest `.mcp/task-router/server.js`
  - rerun `dispatch_task` smoke checks post-reload
- [complete] update-docs
  - write findings and progress updates

### Risks / Constraints
- Do not break existing `fallback` and `race` modes.
- Keep fix minimal and localized to `.mcp/task-router/server.js`.

## 2026-03-10 Task: Delegate quickstart creation + review via task-router

### Goal
Verify `task-router` can correctly orchestrate Codex and Gemini on a realistic docs workflow: Codex creates `docs/quickstart.md`, Gemini audits accuracy.

### Task Breakdown
- [complete] delegation-round-1-codex-doc
  - dispatch docs task to Codex for creating `docs/quickstart.md`
  - collect result and inspect output/diff evidence
- [complete] merge-codex-doc
  - prepare patch merge for docs change
  - apply winner patch to main workspace
- [complete] delegation-round-2-gemini-review
  - dispatch review task to Gemini to validate quickstart accuracy
  - collect and assess structured review output
- [complete] fix-if-needed
  - if Gemini reports issues, route fix task and re-review
- [complete] final-verification-and-log
  - verify final document exists and reflects project run steps
  - update findings/progress with evidence

### Constraints
- Keep review output structured JSON for traceability.
- Use docs merge strategy: `patch`.
- Do not revert unrelated existing changes.

## 2026-03-10 Task: Reverse test (Gemini create + Codex audit)

### Goal
Verify reverse routing flow where Gemini performs document creation and Codex performs accuracy audit.

### Task Breakdown
- [complete] gemini-create-attempt
  - dispatched Gemini docs creation task
  - collected delayed async result
- [complete] codex-audit-attempt
  - dispatched Codex read-only audit task
  - collected structured JSON audit output
- [in_progress] reverse-flow-bugfix
  - fix Gemini invocation policy mismatch discovered in creation task
  - requires MCP runtime reload to validate

### Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Gemini create dispatch timed out and no immediate result file | 1 | waited longer and collected delayed async result |
| Gemini create task could not modify files due tool/policy restrictions in delegated runtime | 2 | patched router Gemini args to include `-y` (pending MCP reload verification) |

### Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `dispatch_task` timed out on first long Codex prompt | 1 | waited and collected async result later |
| Codex delegated session reports `sandbox: read-only` and cannot write docs | 2 | patched router args to pass writable sandbox (`codex exec --sandbox workspace-write -`); pending MCP restart to apply |
| `merge_winner` patch failed with `docs/quickstart.md: No such file or directory` when target file absent in current workspace | 3 | added three-way apply fallback (`git apply --3way`) in router merge path |
