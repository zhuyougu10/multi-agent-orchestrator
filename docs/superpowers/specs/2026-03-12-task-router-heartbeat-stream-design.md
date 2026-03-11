# Task Router Heartbeat Stream Design

## Goal

Allow OpenCode to dispatch a task and return immediately, then subscribe to a separate real-time event stream that reports agent liveness and completion while Codex or Gemini continues working.

## Proposed Design

- Keep `dispatch_task` asynchronous: it should still persist the job, schedule the background run, and return quickly with the `task_id`.
- Add an in-memory task event bus inside the task-router process so running jobs can publish structured events without changing the current result-file workflow.
- Add a new MCP tool, `subscribe_task_events`, that attaches to a task's event stream and emits incremental updates until a terminal event (`completed` or `failed`) is seen.
- Emit router-owned `heartbeat` events every 5 seconds while the child process is alive. Heartbeats come from the task-router, not from Codex/Gemini protocol changes.
- Preserve the current final result files (`result`, `score`, `bundle`) for review/merge flows. The new stream is for observability, not as a replacement for durable task state.

## Event Model

Each event should include at least:

- `task_id`
- `agent`
- `timestamp`
- `event_type`

Initial event types:

- `started`
- `heartbeat`
- `stdout`
- `stderr`
- `tests_started`
- `tests_completed`
- `completed`
- `failed`

The `stdout` and `stderr` events can be coarse-grained chunks, not token-by-token streaming. The goal is liveness and progress visibility, not perfect terminal replay.

## Architecture Changes

### 1. Process execution becomes event-aware

`execCmd()` in `.mcp/task-router/lib/process.js` currently buffers output and resolves only once at process exit. Extend it with optional callbacks:

- `onStdout(chunk)`
- `onStderr(chunk)`
- `onHeartbeat()` is not needed inside `execCmd`; heartbeat should be owned by the caller
- `onStart(processInfo)` optional if needed

The function should still return the same final result shape so existing callers remain compatible.

### 2. Add event streaming support in the router

Create a small event-stream helper module, for example `.mcp/task-router/lib/task-events.js`, responsible for:

- creating per-task subscription channels
- publishing events
- buffering a small recent history for late subscribers (recommended)
- closing streams on terminal events

This keeps event orchestration out of `server.js`, which is already large.

### 3. `runInWorktree()` publishes lifecycle events

Inside `.mcp/task-router/server.js`:

- publish `started` when execution begins
- start a 5-second interval timer while the child process is alive and publish `heartbeat`
- forward stdout/stderr chunks through the event bus
- publish `tests_started` and `tests_completed` around `runTests()`
- publish `completed` or `failed` before returning the final result

### 4. MCP surface change

Add `subscribe_task_events` to the task-router MCP server.

Expected behavior:

- input: `task_id`, optional `agent`
- output: a stream of events for that running task
- if the task already completed, either:
  - replay buffered terminal history and end, or
  - return a small completed payload immediately

Replaying a small backlog is preferred so short-lived tasks are still visible to subscribers that attach slightly late.

## Key Decisions

- Heartbeats are router-generated every 5 seconds, not agent-generated.
- `dispatch_task` remains non-blocking.
- Durable task state remains file-based; real-time visibility is additive.
- Full protocol changes to Codex/Gemini CLIs are out of scope.
- Keep the first version single-process and in-memory. If the task-router restarts, in-flight subscriptions are lost; durable results still survive.

## Risks

- MCP support for long-lived streaming responses may be constrained by the runtime. If so, the design may need a compatibility fallback such as short-lived incremental subscriptions.
- An in-memory event bus means subscribers depend on the same live task-router process.
- `server.js` could become harder to maintain if event logic is not extracted early.
- Streaming stdout/stderr too aggressively could create noisy output; chunking should stay moderate.

## Verification Plan

- Add tests for event bus subscribe/publish behavior.
- Add tests showing `execCmd()` can surface stdout/stderr chunks without breaking final buffered output.
- Add task-router tests for dispatch + event subscription behavior, including heartbeat emission and terminal completion.
- Run the focused task-router test suite after implementation.
