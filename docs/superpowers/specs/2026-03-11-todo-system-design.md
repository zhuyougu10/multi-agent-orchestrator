# Todo System Design

## Goal

Create a minimal example system that uses this repository's orchestration flow to validate a real multi-agent split: Codex builds the backend and Gemini builds the frontend.

## Chosen Approach

- Delivery shape: local Node API plus simple web frontend
- Persistence: local JSON file
- Agent split:
  - Codex: backend API, persistence, validation, backend tests
  - Gemini: frontend UI, interaction flow, API integration, user-facing states

This is the lightest option that still exercises realistic cross-agent collaboration.

## Architecture

The example system lives under `examples/todo-system/` with clear boundaries between backend and frontend work. The backend exposes a small REST API for CRUD operations on todos and stores data in a JSON file. The frontend consumes the API and renders a lightweight task-management interface with create, toggle, delete, loading, error, and empty states.

This design intentionally avoids advanced features such as auth, filtering, search, pagination, and database migration logic. The purpose is to validate orchestration, review, merge, and finalization behavior through a real but minimal end-to-end system.

## Project Structure

- `examples/todo-system/backend/`
- `examples/todo-system/frontend/`
- `examples/todo-system/README.md`

Optional shared files may be added later only if they clearly reduce duplication, but the default design keeps backend and frontend independent to simplify file scopes during delegation.

## Data Model

Each todo item uses this shape:

```json
{
  "id": "string",
  "title": "string",
  "completed": false,
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

Rules:

- `id` is a string
- `title` is required and cannot be empty after trimming
- `completed` is boolean
- timestamps are written by the backend

## Backend API

The backend exposes four endpoints:

- `GET /todos`
- `POST /todos`
- `PATCH /todos/:id`
- `DELETE /todos/:id`

Behavior:

- `GET /todos` returns all todos
- `POST /todos` creates a new todo from `title`
- `PATCH /todos/:id` updates `title` and/or `completed`
- `DELETE /todos/:id` removes a todo

Error handling:

- invalid input -> `400`
- missing todo -> `404`
- file I/O or unexpected failure -> `500`

Response style stays intentionally simple: return objects or arrays directly instead of adding a heavier response envelope.

## Persistence

The backend stores todos in a local JSON file.

Rules:

- initialize the file to an empty array if missing
- read the full file for each request that needs data
- overwrite the full file on write

This is intentionally simple and acceptable for a demo system.

## Frontend UX

The frontend provides:

- input field for a new todo title
- add button
- list of todos
- complete/incomplete toggle per item
- delete action per item
- loading state on initial fetch
- error state for failed requests
- empty state when no todos exist

The first version does not include inline editing, filtering, sorting, or bulk actions.

## Agent Responsibilities

### Codex backend scope

- backend folder contents
- JSON persistence file or seed handling
- backend validation and tests

### Gemini frontend scope

- frontend folder contents
- UI interaction behavior
- API integration against the documented backend contract

This split is deliberate so the repository can test realistic task routing:

- implementation/tests -> Codex
- docs/ux-copy/frontend presentation -> Gemini where appropriate

## Validation Plan

Functional validation:

1. start backend
2. start frontend
3. create a todo
4. toggle completion
5. delete a todo
6. refresh and confirm persistence still works

Orchestration validation:

1. dispatch backend task to Codex
2. dispatch frontend task to Gemini
3. review outputs independently
4. merge approved changes
5. run finalize and confirm cleanup

## Non-Goals

- authentication
- multi-user support
- database integration
- advanced todo features
- production deployment
- styling polish beyond a clean, usable demo

## Approval Notes

Approved by user with these final choices:

- Example system: `todo`
- Delivery shape: `Node API + simple web frontend`
- Persistence: `local JSON file`
- Frontend responsibility: `Gemini implements full frontend including API integration`
