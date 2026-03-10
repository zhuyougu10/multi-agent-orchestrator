import test from "node:test";
import assert from "node:assert/strict";

import { launchDispatch } from "../dispatch.js";

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("launchDispatch returns pending payload before async work completes", async () => {
  const writes = [];
  let resolveRun;

  const pending = launchDispatch({
    job: { task_id: "task-async", mode: "single" },
    selectedAgent: "codex",
    mode: "single",
    runners: {
      runSingle: () => new Promise((resolve) => {
        resolveRun = resolve;
      })
    },
    writeResultIndex: (payload) => writes.push(payload),
    paths: {
      resultFile: (taskId, agent = null) => agent ? `${taskId}.${agent}.json` : `${taskId}.json`,
      bundleFile: (taskId, agent) => `${taskId}.${agent}.bundle.json`
    },
    alternateAgent: () => "gemini"
  });

  assert.equal(pending.status, "running");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].status, "running");

  await flush();
  resolveRun({ ok: true, agent: "codex" });
  await flush();

  assert.equal(writes.at(-1).status, "completed");
  assert.equal(writes.at(-1).selected_agent, "codex");
});

test("launchDispatch records failure payload when runner throws", async () => {
  const writes = [];

  launchDispatch({
    job: { task_id: "task-fail", mode: "single" },
    selectedAgent: "codex",
    mode: "single",
    runners: {
      runSingle: async () => {
        throw new Error("boom");
      }
    },
    writeResultIndex: (payload) => writes.push(payload),
    paths: {
      resultFile: (taskId, agent = null) => agent ? `${taskId}.${agent}.json` : `${taskId}.json`,
      bundleFile: (taskId, agent) => `${taskId}.${agent}.bundle.json`
    },
    alternateAgent: () => "gemini"
  });

  await flush();

  assert.equal(writes.at(-1).status, "failed");
  assert.equal(writes.at(-1).ok, false);
  assert.match(writes.at(-1).error, /boom/);
});
