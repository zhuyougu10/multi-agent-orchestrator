import test from "node:test";
import assert from "node:assert/strict";

import {
  createTaskEventHub,
  isTerminalEvent
} from "../lib/task-events.js";

test("subscriber receives events published after subscription", async () => {
  const hub = createTaskEventHub();
  const stream = hub.subscribe("task-1", "codex");

  hub.publish({ task_id: "task-1", agent: "codex", event_type: "started", timestamp: "2026-03-12T00:00:00.000Z" });

  const first = await stream.next();
  assert.equal(first.done, false);
  assert.equal(first.value.event_type, "started");
});

test("late subscriber receives buffered history", async () => {
  const hub = createTaskEventHub({ historyLimit: 5 });

  hub.publish({ task_id: "task-2", agent: "gemini", event_type: "started", timestamp: "2026-03-12T00:00:00.000Z" });
  hub.publish({ task_id: "task-2", agent: "gemini", event_type: "heartbeat", timestamp: "2026-03-12T00:00:05.000Z" });

  const stream = hub.subscribe("task-2", "gemini");
  const first = await stream.next();
  const second = await stream.next();

  assert.equal(first.value.event_type, "started");
  assert.equal(second.value.event_type, "heartbeat");
});

test("terminal event closes the stream after buffered items are consumed", async () => {
  const hub = createTaskEventHub();
  const stream = hub.subscribe("task-3", "codex");

  hub.publish({ task_id: "task-3", agent: "codex", event_type: "completed", timestamp: "2026-03-12T00:00:10.000Z" });

  const first = await stream.next();
  const second = await stream.next();

  assert.equal(first.value.event_type, "completed");
  assert.equal(second.done, true);
});

test("isTerminalEvent identifies completed and failed events", () => {
  assert.equal(isTerminalEvent("completed"), true);
  assert.equal(isTerminalEvent("failed"), true);
  assert.equal(isTerminalEvent("heartbeat"), false);
});

test("waitForEvents returns published events newer than the cursor", async () => {
  const hub = createTaskEventHub();

  hub.publish({ task_id: "task-4", agent: "codex", event_type: "started", timestamp: "2026-03-12T00:00:00.000Z" });
  hub.publish({ task_id: "task-4", agent: "codex", event_type: "heartbeat", timestamp: "2026-03-12T00:00:05.000Z" });

  const first = await hub.waitForEvents("task-4", "codex", { cursor: 0, timeoutMs: 10 });
  const second = await hub.waitForEvents("task-4", "codex", { cursor: first.next_cursor, timeoutMs: 10 });

  assert.equal(first.events.length, 2);
  assert.equal(first.events[0].cursor, 1);
  assert.equal(first.events[1].cursor, 2);
  assert.equal(second.events.length, 0);
});

test("waitForEvents waits for future events until timeout expires", async () => {
  const hub = createTaskEventHub();

  setTimeout(() => {
    hub.publish({ task_id: "task-5", agent: "gemini", event_type: "started", timestamp: "2026-03-12T00:00:00.000Z" });
  }, 20);

  const result = await hub.waitForEvents("task-5", "gemini", { cursor: 0, timeoutMs: 100 });

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].event.event_type, "started");
});
