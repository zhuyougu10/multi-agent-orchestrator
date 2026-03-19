import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeTaskId } from "../lib/validation.js";

test("sanitizeTaskId returns trimmed valid task id", () => {
  assert.equal(sanitizeTaskId("my-task_01"), "my-task_01");
  assert.equal(sanitizeTaskId("  spaced  "), "spaced");
});

test("sanitizeTaskId accepts dots and hyphens", () => {
  assert.equal(sanitizeTaskId("task.v2-beta"), "task.v2-beta");
});

test("sanitizeTaskId throws on empty string", () => {
  assert.throws(() => sanitizeTaskId(""), /task_id is required/);
});

test("sanitizeTaskId throws on whitespace-only input", () => {
  assert.throws(() => sanitizeTaskId("   "), /task_id is required/);
});

test("sanitizeTaskId throws on null or undefined", () => {
  assert.throws(() => sanitizeTaskId(null), /task_id is required/);
  assert.throws(() => sanitizeTaskId(undefined), /task_id is required/);
});

test("sanitizeTaskId throws on strings with slashes", () => {
  assert.throws(() => sanitizeTaskId("path/to/task"), /invalid task_id/);
  assert.throws(() => sanitizeTaskId("path\\to\\task"), /invalid task_id/);
});

test("sanitizeTaskId throws on strings with spaces", () => {
  assert.throws(() => sanitizeTaskId("my task"), /invalid task_id/);
});

test("sanitizeTaskId throws on special characters", () => {
  assert.throws(() => sanitizeTaskId("task@home"), /invalid task_id/);
  assert.throws(() => sanitizeTaskId("task#1"), /invalid task_id/);
  assert.throws(() => sanitizeTaskId("task!"), /invalid task_id/);
});
