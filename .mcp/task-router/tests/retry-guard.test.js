import test from "node:test";
import assert from "node:assert/strict";

import { getRetryCount, canRetry, incrementRetryCount, assertCanRetry } from "../lib/retry-guard.js";

test("getRetryCount returns 0 for new jobs without retry_count", () => {
  assert.equal(getRetryCount({}), 0);
  assert.equal(getRetryCount({ retry_count: undefined }), 0);
  assert.equal(getRetryCount(null), 0);
});

test("getRetryCount returns existing count", () => {
  assert.equal(getRetryCount({ retry_count: 1 }), 1);
  assert.equal(getRetryCount({ retry_count: 2 }), 2);
});

test("canRetry returns true when under limit", () => {
  assert.equal(canRetry({ retry_count: 0 }), true);
  assert.equal(canRetry({ retry_count: 1 }), true);
});

test("canRetry returns false when at or over limit", () => {
  assert.equal(canRetry({ retry_count: 2 }), false);
  assert.equal(canRetry({ retry_count: 3 }), false);
});

test("canRetry respects custom maxRetries", () => {
  assert.equal(canRetry({ retry_count: 0 }, 1), true);
  assert.equal(canRetry({ retry_count: 1 }, 1), false);
});

test("incrementRetryCount returns new job with incremented count", () => {
  const job = { task_id: "test", retry_count: 0 };
  const updated = incrementRetryCount(job);
  assert.equal(updated.retry_count, 1);
  assert.equal(updated.task_id, "test");
  // 原始 job 不应被修改
  assert.equal(job.retry_count, 0);
});

test("incrementRetryCount works on jobs without retry_count", () => {
  const updated = incrementRetryCount({ task_id: "test" });
  assert.equal(updated.retry_count, 1);
});

test("assertCanRetry throws when limit exceeded", () => {
  assert.throws(
    () => assertCanRetry("my-task", { retry_count: 2 }),
    /retry limit exceeded for my-task: 2\/2/
  );
});

test("assertCanRetry does not throw when under limit", () => {
  assert.doesNotThrow(() => assertCanRetry("my-task", { retry_count: 1 }));
  assert.doesNotThrow(() => assertCanRetry("my-task", { retry_count: 0 }));
});
