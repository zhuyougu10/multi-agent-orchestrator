import test from "node:test";
import assert from "node:assert/strict";

import { collectPanelSnapshotsUntilTerminal } from "../lib/task-panel.js";

test("collectPanelSnapshotsUntilTerminal loops until all tasks are terminal", async () => {
  const calls = [];
  const snapshots = [
    {
      tasks: [
        { task_id: "a", agent: "gemini", cursor: 1, status: "running", last_heartbeat_at: "t1", last_event_type: "heartbeat", started_at: "t0", finished_at: "", message: "" },
        { task_id: "b", agent: "codex", cursor: 1, status: "running", last_heartbeat_at: "t1", last_event_type: "heartbeat", started_at: "t0", finished_at: "", message: "" }
      ],
      summary: { total: 2, running: 2, completed: 0, failed: 0 },
      all_terminal: false,
      panel_text: "panel 1"
    },
    {
      tasks: [
        { task_id: "a", agent: "gemini", cursor: 2, status: "completed", last_heartbeat_at: "t2", last_event_type: "completed", started_at: "t0", finished_at: "t2", message: "" },
        { task_id: "b", agent: "codex", cursor: 2, status: "failed", last_heartbeat_at: "t1", last_event_type: "failed", started_at: "t0", finished_at: "t2", message: "boom" }
      ],
      summary: { total: 2, running: 0, completed: 1, failed: 1 },
      all_terminal: true,
      panel_text: "panel 2"
    }
  ];

  const result = await collectPanelSnapshotsUntilTerminal(
    [
      { task_id: "a", agent: "gemini", cursor: 0 },
      { task_id: "b", agent: "codex", cursor: 0 }
    ],
    async ({ tasks, waitMs }) => {
      calls.push({ tasks, waitMs });
      return snapshots.shift();
    },
    1000
  );

  assert.equal(calls.length, 2);
  assert.equal(result.all_terminal, true);
  assert.equal(result.panel_history.length, 2);
  assert.equal(result.panel_history[0], "panel 1");
  assert.equal(result.panel_text, "panel 2");
});
