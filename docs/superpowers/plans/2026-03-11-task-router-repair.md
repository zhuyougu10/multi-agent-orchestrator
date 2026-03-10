# Task Router Repair Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix task-router result handling so read-only tasks do not generate bogus commit errors, structured JSON scoring is resilient to agent preamble text, and task success prefers router-owned test evidence.

**Architecture:** Introduce a small result utility module with pure functions for stdout normalization, change detection, and success evaluation, then consume those helpers from `server.js`. Cover the behavior with focused node tests before changing the implementation.

**Tech Stack:** Node.js, native `node:test`, ES modules, MCP task-router.

---

## Chunk 1: Result Utility Extraction

### Task 1: Add failing tests for result utilities

**Files:**
- Create: `.mcp/task-router/tests/result-utils.test.js`
- Modify: none

- [ ] **Step 1: Write failing tests**
- [ ] **Step 2: Run `node --test .mcp/task-router/tests/result-utils.test.js` and verify failure**
- [ ] **Step 3: Add minimal utility module for JSON extraction, change detection, and success evaluation**
- [ ] **Step 4: Re-run `node --test .mcp/task-router/tests/result-utils.test.js` and verify pass**

## Chunk 2: Server Integration

### Task 2: Wire utility functions into task execution

**Files:**
- Create: `.mcp/task-router/lib/result-utils.js`
- Modify: `.mcp/task-router/server.js`
- Test: `.mcp/task-router/tests/result-utils.test.js`

- [ ] **Step 1: Update `server.js` to use normalized stdout parsing for scoring**
- [ ] **Step 2: Update `server.js` to skip commits when no worktree changes exist**
- [ ] **Step 3: Update `server.js` success evaluation to require passing router-run tests when present**
- [ ] **Step 4: Run explicit task-router tests and verify all pass**

## Chunk 3: Regression Verification

### Task 3: Verify repaired behavior with full suite

**Files:**
- Modify: `task_plan.md`, `findings.md`, `progress.md`

- [ ] **Step 1: Run `node --test .mcp/task-router/tests/dispatch.test.js .mcp/task-router/tests/runtime.test.js .mcp/task-router/tests/result-utils.test.js`**
- [ ] **Step 2: Record results and any remaining gaps in planning files**
- [ ] **Step 3: Prepare final handoff summary**
