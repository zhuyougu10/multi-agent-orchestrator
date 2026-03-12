import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { parseTaskRefs, readEventBatch, renderWatchScreen } from "../lib/watch-ui.js";

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
    panel_text: "Tasks: 1 total"
  });

  assert.match(screen, /Task Router Watch/);
  assert.match(screen, /Tasks: 1 total/);
});
