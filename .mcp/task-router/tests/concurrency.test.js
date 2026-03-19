import test from "node:test";
import assert from "node:assert/strict";

import {
  acquireSlot,
  releaseSlot,
  getConcurrencyStatus,
  setMaxConcurrent,
  getActiveTasks,
  getQueueLength
} from "../lib/concurrency.js";

test("acquireSlot increments active count within limit", async () => {
  setMaxConcurrent(4);
  await acquireSlot();
  const status = getConcurrencyStatus();
  assert.equal(status.active, 1);
  releaseSlot();
});

test("acquireSlot queues when at capacity", async () => {
  setMaxConcurrent(1);
  // 先释放之前的
  while (getActiveTasks() > 0) releaseSlot();

  await acquireSlot();
  assert.equal(getActiveTasks(), 1);

  let acquired = false;
  const pending = acquireSlot().then(() => {
    acquired = true;
  });

  // 还未获取到
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(acquired, false);
  assert.equal(getQueueLength(), 1);

  // 释放后应获取
  releaseSlot();
  await pending;
  assert.equal(acquired, true);

  releaseSlot();
  setMaxConcurrent(4);
});

test("getConcurrencyStatus reports correct state", () => {
  setMaxConcurrent(4);
  // 清理
  while (getActiveTasks() > 0) releaseSlot();

  const status = getConcurrencyStatus();
  assert.equal(status.max, 4);
  assert.equal(status.active, 0);
  assert.equal(status.queued, 0);
  assert.equal(status.available, 4);
});

test("releaseSlot does not go below zero", () => {
  setMaxConcurrent(4);
  while (getActiveTasks() > 0) releaseSlot();

  releaseSlot();
  assert.equal(getActiveTasks(), 0);
});
