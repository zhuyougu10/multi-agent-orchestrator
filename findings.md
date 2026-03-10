# Findings: Multi-Agent Orchestration Framework

## Project Discovery
- **Orchestrator**: OpenCode acts as the main controller.
- **Agents**: Codex (Code) and Gemini (Docs/UX) are secondary agents.
- **Isolation**: Uses `git worktree` to isolate agent tasks.
- **MCP Server**: `task-router` (node .mcp/task-router/server.js) provides tools for dispatching, collecting, and scoring tasks.
- **Planning**: `planning-with-files` skill is mandatory for multi-step tasks.
- **Environment**: Windows (Win32), Node.js, Git.

## Initial Status
- [x] Project files found.
- [x] Project initialized as a Git repository.
- [x] Initial `task_plan.md` created.
- [x] Initial `findings.md` created.
- [x] Project structure conforms to README specifications.

## Key Files
- `AGENTS.md`: Orchestration rules.
- `.opencode/opencode.json`: Orchestrator configuration.
- `.mcp/task-router/server.js`: Task router implementation.
- `setup.ps1`: Automated environment setup script.

## Identified Constraints
- No interactive shell commands (`git rebase -i`).
- All file paths must be absolute.
- Sub-agents must return JSON output for scoring.

## 2026-03-10 Debug Findings: task-router connectivity failure
- Direct CLI execution is healthy:
  - `codex exec "Return exactly CONNECT_OK"` returns `CONNECT_OK`.
  - `gemini -p "Return exactly CONNECT_OK" --output-format text` returns `CONNECT_OK`.
- Failure happens in `task-router` invocation path, not in agent availability.
- Observed errors:
  - Codex: `unexpected argument ...` indicates prompt tokenization/splitting.
  - Gemini: `Cannot use both a positional prompt and the --prompt (-p) flag together` indicates arg construction conflict.
- Suspected hot spots in `.mcp/task-router/server.js`:
  - `buildArgs()` argument style for codex/gemini.
  - `execCmd()` using `spawn(..., { shell: true })`, which can alter argument parsing/quoting.

## 2026-03-10 Fix Applied (not yet runtime-reloaded)
- Updated `.mcp/task-router/server.js`:
  - `buildArgs()` now uses stdin prompt delivery instead of passing prompt as CLI arg.
  - Agent invocation switched to stable PowerShell wrappers:
    - Codex: `codex exec -`
    - Gemini: `gemini -p _ --output-format text`
  - `execCmd()` now supports `stdin` injection and optional shell override.
  - Agent run path uses `shell: false` to avoid shell argument re-tokenization.
  - `gitCommitAll()` now commits with `shell: false` to avoid commit-message token splitting.
- Local command-path validation passed for both agents with Chinese+space prompt via stdin.
- `task-router` MCP tool still returns old failure signatures, indicating current MCP process is likely running stale code and needs reload/restart.

## 2026-03-10 Post-Restart Verification
- After MCP restart, `dispatch_task` succeeded for both agents:
  - `conn-test-codex-20260310-4` -> `ok: true`, `exit_code: 0`, `stdout: CONNECT_OK`
  - `conn-test-gemini-20260310-4` -> `ok: true`, `exit_code: 0`, `stdout: CONNECT_OK`
- This confirms both connectivity and execution paths are now healthy through `task-router`.
- Note: scoring remains moderate because connectivity smoke test output is plain text (not JSON), which is expected for this specific check.

## 2026-03-10 Docs delegation bug (new)
- Real docs task exposed a new execution bug:
  - `task-router` delegated Codex runs in `sandbox: read-only` (seen in result stderr), causing all file writes to fail.
  - Result JSON confirms no file changes despite successful command exit.
- Root cause:
  - Codex invocation did not explicitly request writable sandbox in `buildArgs()`.
- Fix implemented in source:
  - `.mcp/task-router/server.js` codex command changed to `codex exec --sandbox workspace-write -`.
- Current state:
  - Running MCP process still uses old loaded code until restart; verification run still shows `sandbox: read-only`.

## 2026-03-10 End-to-end task-router test (Codex write + Gemini audit)
- Delegation evidence:
  - Codex task `quickstart-codex-20260310-3` exited `0`, generated and committed `docs/quickstart.md` in delegated worktree.
  - Gemini audit task `quickstart-gemini-audit-20260310-2` exited `0`, returned audit verdict with actionable issues.
- Bug fixed during this round:
  - `merge_winner` with `patch` could fail when target file is missing in current workspace (`No such file or directory`).
  - Added fallback in `.mcp/task-router/server.js`: if `git apply --check` fails, try `git apply --3way` before reporting failure.
- Content fixes applied to `docs/quickstart.md` per Gemini audit:
  - Added missing `/repair` command section.
  - Added `manual-review` note in merge strategy.
  - Removed trailing JSON artifact appended by delegated output formatting.

## 2026-03-10 Reverse flow test (Gemini create + Codex audit)
- Gemini creation task (`quickstart-gemini-create-20260310-1`) exited `0` but failed to write files in practice:
  - stdout contained generated markdown text and tool-attempt logs.
  - commit result was `nothing to commit` and no diff artifacts.
  - stderr showed repeated policy/tool denial patterns.
- Codex audit task (`quickstart-codex-audit-20260310-1`) executed successfully and returned strict JSON output.
- New bug fix applied in source:
  - `.mcp/task-router/server.js` Gemini invocation now adds `-y` for non-interactive tool approval in delegated runs.
- Note:
  - This new Gemini invocation fix requires MCP process reload before effective verification.
