import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import {
  registerProcess,
  unregisterProcess,
  killProcess,
  isProcessActive,
  listActiveProcesses,
  cancelAllForTask
} from "../lib/process-registry.js";

function makeFakeChild() {
  const child = new EventEmitter();
  child.killed = false;
  child.kill = function (signal) {
    this.killed = true;
    this.killSignal = signal;
  };
  return child;
}

test("registerProcess and isProcessActive track active processes", () => {
  const child = makeFakeChild();
  registerProcess("test-reg", "codex", child);

  assert.equal(isProcessActive("test-reg", "codex"), true);
  assert.equal(isProcessActive("test-reg", "gemini"), false);

  unregisterProcess("test-reg", "codex");
  assert.equal(isProcessActive("test-reg", "codex"), false);
});

test("killProcess kills the tracked child and removes entry", () => {
  const child = makeFakeChild();
  registerProcess("test-kill", "codex", child);

  const result = killProcess("test-kill", "codex");
  assert.equal(result.found, true);
  assert.equal(result.killed, true);
  assert.equal(child.killed, true);
  assert.equal(isProcessActive("test-kill", "codex"), false);
});

test("killProcess returns found false for unknown task", () => {
  const result = killProcess("nonexistent-task", "codex");
  assert.equal(result.found, false);
  assert.equal(result.killed, false);
});

test("cancelAllForTask kills all agents for a task", () => {
  const child1 = makeFakeChild();
  const child2 = makeFakeChild();
  registerProcess("test-cancel-all", "codex", child1);
  registerProcess("test-cancel-all", "gemini", child2);

  const killed = cancelAllForTask("test-cancel-all");
  assert.equal(killed.length, 2);
  assert.equal(child1.killed, true);
  assert.equal(child2.killed, true);
  assert.equal(isProcessActive("test-cancel-all", "codex"), false);
  assert.equal(isProcessActive("test-cancel-all", "gemini"), false);
});

test("cancelAllForTask returns empty array when no processes found", () => {
  const killed = cancelAllForTask("no-such-task");
  assert.deepEqual(killed, []);
});

test("listActiveProcesses returns all active entries", () => {
  const child = makeFakeChild();
  registerProcess("test-list", "codex", child);

  const list = listActiveProcesses();
  const entry = list.find((e) => e.task_id === "test-list");
  assert.ok(entry);
  assert.equal(entry.agent, "codex");

  unregisterProcess("test-list", "codex");
});
