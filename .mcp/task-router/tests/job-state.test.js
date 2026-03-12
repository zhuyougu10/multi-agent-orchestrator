import test from "node:test";
import assert from "node:assert/strict";

import { assertTaskNotActive, isTaskIndexActive } from "../lib/job-state.js";

test("isTaskIndexActive detects running task index", () => {
  assert.equal(isTaskIndexActive({ status: "running" }), true);
  assert.equal(isTaskIndexActive({ status: "completed" }), false);
  assert.equal(isTaskIndexActive(null), false);
});

test("assertTaskNotActive throws for running task index", () => {
  assert.throws(() => assertTaskNotActive("task-1", { status: "running" }), /task already running: task-1/);
});

test("assertTaskNotActive allows completed task index", () => {
  assert.doesNotThrow(() => assertTaskNotActive("task-1", { status: "completed" }));
});
