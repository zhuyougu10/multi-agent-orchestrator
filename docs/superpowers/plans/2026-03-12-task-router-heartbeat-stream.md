# Task Router Heartbeat Stream Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-time task event stream so OpenCode can dispatch work, subscribe separately, and receive 5-second heartbeats plus lifecycle events while Codex or Gemini continues running.

**Architecture:** Keep `dispatch_task` asynchronous and preserve existing result files. Add a small in-memory event bus for per-task streams, make process execution optionally emit stdout/stderr callbacks, and expose a new `subscribe_task_events` MCP tool that streams lifecycle events until completion.

**Tech Stack:** Node.js, native `node:test`, ES modules, MCP task-router.

---

## File Map

- Create: `.mcp/task-router/lib/task-events.js` — task event bus and subscriber management
- Modify: `.mcp/task-router/lib/process.js` — optional output callbacks during child execution
- Modify: `.mcp/task-router/server.js` — heartbeat lifecycle publishing and new MCP tool
- Create or Modify: `.mcp/task-router/tests/task-events.test.js` — event bus tests
- Modify: `.mcp/task-router/tests/process.test.js` — process callback tests
- Modify: `.mcp/task-router/tests/dispatch.test.js` — dispatch/event integration coverage
- Modify: `task_plan.md` — track implementation progress
- Modify: `findings.md` — record design and verification notes
- Modify: `progress.md` — record execution evidence

## Chunk 1: Event Bus Foundation

### Task 1: Add failing tests for task event bus behavior

**Files:**
- Create: `.mcp/task-router/tests/task-events.test.js`
- Modify: none

- [ ] **Step 1: Write a failing test for subscribing before events are published**
- [ ] **Step 2: Write a failing test for replaying buffered history to a late subscriber**
- [ ] **Step 3: Write a failing test for closing the stream after a terminal event**
- [ ] **Step 4: Run `node --test .mcp/task-router/tests/task-events.test.js` and verify failure**

### Task 2: Implement minimal event bus

**Files:**
- Create: `.mcp/task-router/lib/task-events.js`
- Test: `.mcp/task-router/tests/task-events.test.js`

- [ ] **Step 1: Create per-task channel storage with publish and subscribe helpers**
- [ ] **Step 2: Add small in-memory history buffering for each task stream**
- [ ] **Step 3: Add terminal close behavior for `completed` and `failed` events**
- [ ] **Step 4: Re-run `node --test .mcp/task-router/tests/task-events.test.js` and verify pass**

## Chunk 2: Process Streaming Hooks

### Task 3: Add failing tests for process output callbacks

**Files:**
- Modify: `.mcp/task-router/tests/process.test.js`
- Modify: none else yet

- [ ] **Step 1: Add a failing test proving `execCmd()` forwards stdout chunks through a callback**
- [ ] **Step 2: Add a failing test proving `execCmd()` forwards stderr chunks through a callback**
- [ ] **Step 3: Run `node --test .mcp/task-router/tests/process.test.js` and verify the new assertions fail for the expected reason**

### Task 4: Extend `execCmd()` without breaking existing callers

**Files:**
- Modify: `.mcp/task-router/lib/process.js`
- Test: `.mcp/task-router/tests/process.test.js`

- [ ] **Step 1: Add optional `onStdout` and `onStderr` callbacks to `execCmd()` options**
- [ ] **Step 2: Invoke those callbacks from the child process data handlers while keeping the existing buffered output behavior**
- [ ] **Step 3: Re-run `node --test .mcp/task-router/tests/process.test.js` and verify pass**

## Chunk 3: Router Lifecycle Streaming

### Task 5: Add failing router tests for event subscription

**Files:**
- Modify: `.mcp/task-router/tests/dispatch.test.js`
- Read: `.mcp/task-router/dispatch.js`
- Read: `.mcp/task-router/server.js`

- [ ] **Step 1: Add a failing test for publishing `started` and `completed` around a successful run**
- [ ] **Step 2: Add a failing test for heartbeat emission while a task remains active**
- [ ] **Step 3: Add a failing test for terminal failure events**
- [ ] **Step 4: Run `node --test .mcp/task-router/tests/dispatch.test.js` and verify failure**

### Task 6: Implement router event publishing and subscription tool

**Files:**
- Modify: `.mcp/task-router/server.js`
- Modify or Read: `.mcp/task-router/dispatch.js`
- Read: `.mcp/task-router/lib/storage.js`
- Create or Modify: `.mcp/task-router/lib/task-events.js`
- Test: `.mcp/task-router/tests/dispatch.test.js`

- [ ] **Step 1: Wire `runInWorktree()` to publish `started` before spawning work**
- [ ] **Step 2: Start a 5-second interval during child execution and publish `heartbeat` events until process exit**
- [ ] **Step 3: Forward stdout and stderr chunks through the event bus**
- [ ] **Step 4: Publish `tests_started` before `runTests()` and `tests_completed` afterward**
- [ ] **Step 5: Publish `completed` or `failed` before returning the final result**
- [ ] **Step 6: Add `subscribe_task_events` MCP tool and connect it to the event bus**
- [ ] **Step 7: Re-run `node --test .mcp/task-router/tests/dispatch.test.js` and verify pass**

## Chunk 4: Verification and Handoff

### Task 7: Run focused verification and document the change

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

- [ ] **Step 1: Run `node --test .mcp/task-router/tests/task-events.test.js .mcp/task-router/tests/process.test.js .mcp/task-router/tests/dispatch.test.js`**
- [ ] **Step 2: Run `npm test` inside `.mcp/task-router` and verify the full suite passes**
- [ ] **Step 3: Record heartbeat-stream design decisions and verification evidence in planning files**
- [ ] **Step 4: Prepare the final handoff summary with new MCP tool usage notes**

Plan complete and saved to `docs/superpowers/plans/2026-03-12-task-router-heartbeat-stream.md`. Ready to execute?
