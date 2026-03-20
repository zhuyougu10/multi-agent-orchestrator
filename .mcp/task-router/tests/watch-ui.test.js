import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  connectWatchEventStream,
  loadBufferedEvents,
  onceWatchEvent,
  parseTaskRefs,
  readEventBatch,
  renderWatchScreen
} from "../lib/watch-ui.js";
import { createStatusSnapshot, didObservedStatusChange } from "../lib/watch-observer.js";

test("parseTaskRefs accepts task ids with optional agent suffix", () => {
  const refs = parseTaskRefs(["task-a", "task-b:gemini"]);

  assert.deepEqual(refs, [
    { task_id: "task-a", agent: null },
    { task_id: "task-b", agent: "gemini" }
  ]);
});

test("readEventBatch parses appended json lines from offset", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "watch-ui-events-"));
  const filePath = path.join(tempDir, "task.jsonl");
  fs.writeFileSync(filePath, "{\"task_id\":\"a\",\"event_type\":\"started\"}\n", "utf8");

  const first = readEventBatch(filePath, 0);
  const second = readEventBatch(filePath, first.next_offset);

  assert.equal(first.events.length, 1);
  assert.equal(first.events[0].event_type, "started");
  assert.equal(second.events.length, 0);
});

test("renderWatchScreen includes title and panel text", () => {
  const screen = renderWatchScreen({
    tasks: [{ task_id: "task-a", status: "running" }],
    summary: { total: 1, running: 1, completed: 0, failed: 0 },
    all_terminal: false,
    panel_text: "任务: 1 | 运行中: 1 | 测试中: 0 | 已完成: 0 | 失败: 0"
  });

  assert.match(screen, /任务路由面板/);
  assert.match(screen, /任务: 1 \| 运行中: 1 \| 测试中: 0 \| 已完成: 0 \| 失败: 0/);
});

test("onceWatchEvent reads one pushed event from socket", async () => {
  const event = await onceWatchEvent({ socketPath: "missing-socket" }).catch((error) => error);

  assert.match(String(event.message || event), /connect/i);
});

test("loadBufferedEvents reads initial events once for watched tasks", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "watch-ui-buffered-"));
  fs.writeFileSync(
    path.join(tempDir, "task-a.jsonl"),
    [
      JSON.stringify({ task_id: "task-a", agent: "codex", event_type: "started" }),
      JSON.stringify({ task_id: "task-a", agent: "gemini", event_type: "completed" })
    ].join("\n") + "\n",
    "utf8"
  );

  const events = loadBufferedEvents([
    { task_id: "task-a", agent: "codex" }
  ], {
    eventFileForTask(taskId) {
      return path.join(tempDir, `${taskId}.jsonl`);
    }
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].event.event_type, "started");
});

test("connectWatchEventStream yields pushed events from socket", async () => {
  const { createWatchEventBroadcaster } = await import("../lib/watch-events-socket.js");
  const broadcaster = createWatchEventBroadcaster({ socketPath: `watch-ui-stream-${process.pid}` });
  await broadcaster.listen();

  const stream = connectWatchEventStream({
    socketPath: broadcaster.socketPath,
    refs: [{ task_id: "task-stream", agent: null, cursor: 0 }]
  });
  await stream.ready;
  const nextEvent = stream.next();

  broadcaster.publish({
    task_id: "task-stream",
    agent: "codex",
    cursor: 1,
    event_type: "completed",
    timestamp: "2026-03-20T00:00:00.000Z"
  });

  const received = await nextEvent;
  assert.equal(received.done, false);
  assert.equal(received.value.event_type, "completed");

  await stream.return();
  await broadcaster.close();
});

test("shouldRenderPanelUpdate returns false when status does not change", () => {
  assert.equal(
    didObservedStatusChange(
      createStatusSnapshot([{ task_id: "task-a", agent: null, status: "running" }]),
      [{ task_id: "task-a", agent: null, status: "running" }]
    ),
    false
  );
});

test("shouldRenderPanelUpdate returns true when any task status changes", () => {
  assert.equal(
    didObservedStatusChange(
      createStatusSnapshot([{ task_id: "task-a", agent: null, status: "running" }]),
      [{ task_id: "task-a", agent: null, status: "testing" }]
    ),
    true
  );
});
