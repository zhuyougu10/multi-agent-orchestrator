# Todo System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal todo example system that validates real multi-agent collaboration by assigning a JSON-backed Node backend to Codex and a web frontend with API integration to Gemini.

**Architecture:** The system lives under `examples/todo-system/` with a clear backend/frontend split. The backend exposes a small REST API with JSON-file persistence, while the frontend consumes that API to create, list, toggle, and delete todos. The design intentionally optimizes for orchestration clarity over production complexity.

**Tech Stack:** Node.js, Express, local JSON file persistence, lightweight web frontend, native fetch, native or lightweight test tooling.

---

## File Map

- `examples/todo-system/backend/package.json` — backend scripts and dependencies
- `examples/todo-system/backend/src/server.js` — HTTP server bootstrap
- `examples/todo-system/backend/src/todo-store.js` — JSON file persistence and CRUD helpers
- `examples/todo-system/backend/src/todo-routes.js` — REST API handlers and validation
- `examples/todo-system/backend/data/todos.json` — persisted demo data file
- `examples/todo-system/backend/tests/*.test.js` — backend tests
- `examples/todo-system/frontend/index.html` — app shell
- `examples/todo-system/frontend/styles.css` — simple UI styling
- `examples/todo-system/frontend/app.js` — frontend state, rendering, and API integration
- `examples/todo-system/README.md` — usage and verification instructions

## Chunk 1: Backend Foundation

### Task 1: Create backend package and failing persistence/API tests

**Files:**
- Create: `examples/todo-system/backend/package.json`
- Create: `examples/todo-system/backend/tests/todo-store.test.js`
- Create: `examples/todo-system/backend/tests/todo-routes.test.js`

- [ ] **Step 1: Write failing tests for todo storage behavior**
- [ ] **Step 2: Write failing tests for `GET /todos`, `POST /todos`, `PATCH /todos/:id`, and `DELETE /todos/:id`**
- [ ] **Step 3: Run the backend tests and verify they fail for the expected missing-module reasons**

### Task 2: Implement backend storage and routes minimally

**Files:**
- Create: `examples/todo-system/backend/src/todo-store.js`
- Create: `examples/todo-system/backend/src/todo-routes.js`
- Create: `examples/todo-system/backend/src/server.js`
- Create: `examples/todo-system/backend/data/todos.json`

- [ ] **Step 1: Implement JSON-file initialization and read/write helpers**
- [ ] **Step 2: Implement todo CRUD operations and validation rules**
- [ ] **Step 3: Wire Express routes to the store**
- [ ] **Step 4: Re-run backend tests and verify they pass**

## Chunk 2: Frontend Implementation

### Task 3: Create frontend shell and failing interaction checklist

**Files:**
- Create: `examples/todo-system/frontend/index.html`
- Create: `examples/todo-system/frontend/styles.css`
- Create: `examples/todo-system/frontend/app.js`
- Create: `examples/todo-system/README.md`

- [ ] **Step 1: Define frontend responsibilities and API contract references in the example README**
- [ ] **Step 2: Write a manual verification checklist for loading, add, toggle, delete, error, and empty states**
- [ ] **Step 3: Confirm the frontend files are scaffolded to match the backend contract**

### Task 4: Implement frontend UI and API integration

**Files:**
- Modify: `examples/todo-system/frontend/index.html`
- Modify: `examples/todo-system/frontend/styles.css`
- Modify: `examples/todo-system/frontend/app.js`

- [ ] **Step 1: Render input, add button, and todo list container**
- [ ] **Step 2: Implement initial fetch and loading state**
- [ ] **Step 3: Implement add, toggle, and delete interactions against the backend API**
- [ ] **Step 4: Implement empty and error states**
- [ ] **Step 5: Run manual verification against a live backend**

## Chunk 3: End-to-End Example Validation

### Task 5: Validate the example system end to end

**Files:**
- Modify: `examples/todo-system/README.md`

- [ ] **Step 1: Start the backend and confirm the API is reachable**
- [ ] **Step 2: Open the frontend and create a todo**
- [ ] **Step 3: Toggle a todo to completed and back if needed**
- [ ] **Step 4: Delete a todo**
- [ ] **Step 5: Refresh and verify JSON-backed persistence**
- [ ] **Step 6: Record exact startup and test commands in the example README**

## Chunk 4: Orchestration Validation

### Task 6: Validate Codex/Gemini split through this repository workflow

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

- [ ] **Step 1: Create backend task scope for Codex under `examples/todo-system/backend/**`**
- [ ] **Step 2: Create frontend task scope for Gemini under `examples/todo-system/frontend/**` and `examples/todo-system/README.md`**
- [ ] **Step 3: Dispatch, review, and merge both tasks using task-router workflow**
- [ ] **Step 4: Run finalize and record evidence of successful multi-agent collaboration**

Plan complete and saved to `docs/superpowers/plans/2026-03-11-todo-system.md`. Ready to execute?
