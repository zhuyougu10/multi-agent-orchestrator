import test from "node:test";
import assert from "node:assert/strict";

import {
  createTaskPanelState,
  applyTaskEvents,
  allTasksTerminal,
  renderTaskPanel
} from "../lib/task-panel.js";

test("applyTaskEvents marks a task as running after started", () => {
  const state = createTaskPanelState([
    { task_id: "task-a", agent: "codex", cursor: 0 }
  ]);

  applyTaskEvents(state, "task-a", "codex", [
    {
      cursor: 1,
      event: {
        task_id: "task-a",
        agent: "codex",
        event_type: "started",
        timestamp: "2026-03-12T00:00:00.000Z"
      }
    }
  ]);

  assert.equal(state.tasks[0].status, "running");
  assert.equal(state.tasks[0].last_event_type, "started");
  assert.equal(state.tasks[0].started_at, "2026-03-12T00:00:00.000Z");
});

test("applyTaskEvents records heartbeat timestamp", () => {
  const state = createTaskPanelState([
    { task_id: "task-b", agent: "gemini", cursor: 0 }
  ]);

  applyTaskEvents(state, "task-b", "gemini", [
    {
      cursor: 2,
      event: {
        task_id: "task-b",
        agent: "gemini",
        event_type: "heartbeat",
        timestamp: "2026-03-12T00:00:05.000Z"
      }
    }
  ]);

  assert.equal(state.tasks[0].last_heartbeat_at, "2026-03-12T00:00:05.000Z");
  assert.equal(state.tasks[0].last_event_type, "heartbeat");
});

test("completed and failed are treated as terminal", () => {
  const state = createTaskPanelState([
    { task_id: "task-c", agent: "codex", cursor: 0 },
    { task_id: "task-d", agent: "gemini", cursor: 0 }
  ]);

  applyTaskEvents(state, "task-c", "codex", [
    {
      cursor: 1,
      event: {
        task_id: "task-c",
        agent: "codex",
        event_type: "completed",
        timestamp: "2026-03-12T00:00:10.000Z"
      }
    }
  ]);
  applyTaskEvents(state, "task-d", "gemini", [
    {
      cursor: 1,
      event: {
        task_id: "task-d",
        agent: "gemini",
        event_type: "failed",
        timestamp: "2026-03-12T00:00:11.000Z",
        message: "boom"
      }
    }
  ]);

  assert.equal(state.tasks[0].status, "completed");
  assert.equal(state.tasks[1].status, "failed");
  assert.equal(state.tasks[1].message, "boom");
  assert.equal(allTasksTerminal(state), true);
});

test("renderTaskPanel prints summary counts and task rows", () => {
  const state = createTaskPanelState([
    { task_id: "task-e", agent: "codex", cursor: 1 },
    { task_id: "task-f", agent: "gemini", cursor: 2 }
  ]);
  state.tasks[0].status = "running";
  state.tasks[0].last_heartbeat_at = "2026-03-12T00:00:05.000Z";
  state.tasks[0].last_event_type = "heartbeat";
  state.tasks[1].status = "failed";
  state.tasks[1].finished_at = "2026-03-12T00:00:09.000Z";
  state.tasks[1].last_event_type = "failed";

  const panel = renderTaskPanel(state);

  assert.match(panel, /Tasks: 2 total \| running: 1 \| completed: 0 \| failed: 1/);
  assert.match(panel, /task-e \| codex \| running/);
  assert.match(panel, /task-f \| gemini \| failed/);
});
