import test from "node:test";
import assert from "node:assert/strict";

import { createTaskPanelState } from "../lib/task-panel.js";
import {
  applyObservedRecords,
  buildPanelSnapshot,
  createStatusSnapshot,
  didObservedStatusChange
} from "../lib/watch-observer.js";

test("buildPanelSnapshot returns summary and panel text from state", () => {
  const state = createTaskPanelState([
    { task_id: "task-a", agent: "codex", cursor: 0 }
  ]);
  state.tasks[0].status = "completed";
  state.tasks[0].finished_at = "2026-03-20T00:00:00.000Z";
  state.tasks[0].last_event_type = "completed";

  const panel = buildPanelSnapshot(state);

  assert.equal(panel.all_terminal, true);
  assert.equal(panel.summary.completed, 1);
  assert.match(panel.panel_text, /已完成/);
});

test("didObservedStatusChange detects status transition", () => {
  const previous = createStatusSnapshot([
    { task_id: "task-a", agent: null, status: "running" }
  ]);
  const next = [{ task_id: "task-a", agent: null, status: "testing" }];

  assert.equal(didObservedStatusChange(previous, next), true);
  assert.equal(didObservedStatusChange(previous, previous), false);
});

test("applyObservedRecords reuses task panel event application", () => {
  const state = createTaskPanelState([
    { task_id: "task-a", agent: "gemini", cursor: 0 }
  ]);

  applyObservedRecords(state, [{
    task_id: "task-a",
    agent: "gemini",
    cursor: 1,
    event: {
      task_id: "task-a",
      agent: "gemini",
      event_type: "failed",
      timestamp: "2026-03-20T00:00:00.000Z",
      message: "boom"
    }
  }]);

  assert.equal(state.tasks[0].status, "failed");
  assert.equal(state.tasks[0].message, "boom");
});
