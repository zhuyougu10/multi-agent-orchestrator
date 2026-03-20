import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { connectWatchEventStream, onceWatchEvent } from "../lib/watch-ui.js";
import { createWatchEventBroadcaster } from "../lib/watch-events-socket.js";

test("watch event broadcaster delivers published events to connected watcher", async () => {
  const broadcaster = createWatchEventBroadcaster({ socketPath: `test-watch-events-${process.pid}` });
  await broadcaster.listen();

  const stream = connectWatchEventStream({
    socketPath: broadcaster.socketPath,
    refs: [{ task_id: "task-push", agent: null, cursor: 0 }]
  });
  await stream.ready;
  const pendingEvent = stream.next();
  const published = {
    task_id: "task-push",
    agent: "codex",
    cursor: 1,
    event_type: "completed",
    timestamp: "2026-03-20T00:00:00.000Z"
  };

  broadcaster.publish(published);

  const received = await pendingEvent;
  assert.deepEqual(received.value, published);

  await stream.return();
  await broadcaster.close();
});

test("watch event broadcaster removes disconnected watchers", async () => {
  const broadcaster = createWatchEventBroadcaster({ socketPath: `test-watch-events-drop-${process.pid}` });
  await broadcaster.listen();

  const first = await onceWatchEvent({
    socketPath: broadcaster.socketPath,
    refs: [{ task_id: "task-push-2", agent: null, cursor: 0 }],
    disconnectAfterConnect: true
  });
  assert.equal(first, null);

  const stream = connectWatchEventStream({
    socketPath: broadcaster.socketPath,
    refs: [{ task_id: "task-push-2", agent: null, cursor: 0 }]
  });
  await stream.ready;
  const pendingEvent = stream.next();
  broadcaster.publish({
    task_id: "task-push-2",
    agent: "gemini",
    cursor: 1,
    event_type: "failed",
    timestamp: "2026-03-20T00:00:01.000Z"
  });

  const received = await pendingEvent;
  assert.equal(received.value.event_type, "failed");

  await stream.return();
  await broadcaster.close();
});

test("watch event broadcaster replays only events newer than subscribed cursor", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "watch-event-replay-"));
  const eventFile = path.join(tempDir, "task-replay.jsonl");
  fs.writeFileSync(eventFile, [
    JSON.stringify({ task_id: "task-replay", agent: "codex", cursor: 1, event_type: "started" }),
    JSON.stringify({ task_id: "task-replay", agent: "codex", cursor: 2, event_type: "heartbeat" })
  ].join("\n") + "\n", "utf8");

  const broadcaster = createWatchEventBroadcaster({
    socketPath: `test-watch-events-replay-${process.pid}`,
    eventFileForTask(taskId) {
      return path.join(tempDir, `${taskId}.jsonl`);
    }
  });
  await broadcaster.listen();

  const received = await onceWatchEvent({
    socketPath: broadcaster.socketPath,
    refs: [{ task_id: "task-replay", agent: "codex", cursor: 1 }]
  });

  assert.equal(received.cursor, 2);
  assert.equal(received.event_type, "heartbeat");

  await broadcaster.close();
});
