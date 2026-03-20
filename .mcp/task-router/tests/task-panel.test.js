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

  assert.match(panel, /任务: 2 \| 运行中: 1 \| 测试中: 0 \| 已完成: 0 \| 失败: 1/);
  assert.match(panel, /task-e \| codex \| 运行中/);
  assert.match(panel, /task-f \| gemini \| 失败/);
});

test("transient stdout and stderr events do not replace panel stage label", () => {
  const state = createTaskPanelState([
    { task_id: "task-noise", agent: "codex", cursor: 0 }
  ]);

  applyTaskEvents(state, "task-noise", "codex", [
    {
      cursor: 1,
      event: {
        task_id: "task-noise",
        agent: "codex",
        event_type: "started",
        timestamp: "2026-03-20T00:00:00.000Z"
      }
    },
    {
      cursor: 2,
      event: {
        task_id: "task-noise",
        agent: "codex",
        event_type: "stdout",
        timestamp: "2026-03-20T00:00:01.000Z"
      }
    },
    {
      cursor: 3,
      event: {
        task_id: "task-noise",
        agent: "codex",
        event_type: "stderr",
        timestamp: "2026-03-20T00:00:02.000Z"
      }
    }
  ]);

  const panel = renderTaskPanel(state);

  assert.match(panel, /task-noise \| codex \| 运行中 \| .* \| 已启动/);
});

test("tests_started and tests_completed are summarized as testing phase", () => {
  const state = createTaskPanelState([
    { task_id: "task-test-phase", agent: "gemini", cursor: 0 }
  ]);

  applyTaskEvents(state, "task-test-phase", "gemini", [
    {
      cursor: 1,
      event: {
        task_id: "task-test-phase",
        agent: "gemini",
        event_type: "tests_started",
        timestamp: "2026-03-20T00:00:03.000Z"
      }
    }
  ]);
  let panel = renderTaskPanel(state);
  assert.match(panel, /task-test-phase \| gemini \| 测试中 \| .* \| 测试中/);

  applyTaskEvents(state, "task-test-phase", "gemini", [
    {
      cursor: 2,
      event: {
        task_id: "task-test-phase",
        agent: "gemini",
        event_type: "tests_completed",
        timestamp: "2026-03-20T00:00:04.000Z"
      }
    }
  ]);
  panel = renderTaskPanel(state);
  assert.match(panel, /task-test-phase \| gemini \| 测试中 \| .* \| 测试中/);
});

test("summarizeTaskPanel counts testing tasks separately", () => {
  const state = createTaskPanelState([
    { task_id: "task-testing", agent: "gemini", cursor: 0 }
  ]);

  applyTaskEvents(state, "task-testing", "gemini", [
    {
      cursor: 1,
      event: {
        task_id: "task-testing",
        agent: "gemini",
        event_type: "tests_started",
        timestamp: "2026-03-20T00:00:03.000Z"
      }
    }
  ]);

  const panel = renderTaskPanel(state);

  assert.match(panel, /任务: 1 \| 运行中: 0 \| 测试中: 1 \| 已完成: 0 \| 失败: 0/);
});

test("failed tasks include a short error summary in the panel", () => {
  const state = createTaskPanelState([
    { task_id: "task-fail-summary", agent: "codex", cursor: 0 }
  ]);

  applyTaskEvents(state, "task-fail-summary", "codex", [
    {
      cursor: 1,
      event: {
        task_id: "task-fail-summary",
        agent: "codex",
        event_type: "failed",
        timestamp: "2026-03-20T00:00:05.000Z",
        message: "something went very wrong in the worker process and needs attention immediately"
      }
    }
  ]);

  const panel = renderTaskPanel(state);

  assert.match(panel, /task-fail-summary \| codex \| 失败 \| .* \| 失败 \| something went very wrong/);
});
