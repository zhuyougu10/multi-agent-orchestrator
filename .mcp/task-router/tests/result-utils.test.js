import test from "node:test";
import assert from "node:assert/strict";

import {
  detectEvidenceConflicts,
  extractJsonObject,
  isRunSuccessful,
  scoreRunStatus,
  normalizeStructuredStdout,
  shouldCommitWorktree,
  isTaskSuccessful,
  validateOutputShape,
  isStructuredTaskSuccessful
} from "../lib/result-utils.js";

test("extractJsonObject parses direct JSON output", () => {
  const parsed = extractJsonObject('{"summary":"ok"}');

  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value, { summary: "ok" });
});

test("extractJsonObject parses fenced JSON after prose", () => {
  const parsed = extractJsonObject('I will now summarize.\n```json\n{"summary":"ok"}\n```');

  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value, { summary: "ok" });
});

test("normalizeStructuredStdout emits pure JSON when prose precedes payload", () => {
  const normalized = normalizeStructuredStdout('I will now summarize.\n```json\n{"summary":"ok"}\n```');

  assert.equal(normalized.parsed_json_ok, true);
  assert.equal(normalized.stdout, '{\n  "summary": "ok"\n}');
  assert.match(normalized.raw_stdout, /I will now summarize/);
});

test("shouldCommitWorktree is false for clean worktrees", () => {
  assert.equal(shouldCommitWorktree("worktree", { git_status: "" }), false);
});

test("shouldCommitWorktree is true when git status shows changes", () => {
  assert.equal(shouldCommitWorktree("worktree", { git_status: "?? report.json" }), true);
});

test("isTaskSuccessful requires both run and router tests to pass", () => {
  const ok = isTaskSuccessful(
    { code: 0, timed_out: false },
    { attempted: true, exit_code: 1, timed_out: false }
  );

  assert.equal(ok, false);
});

test("isTaskSuccessful passes when run succeeds and tests are absent", () => {
  const ok = isTaskSuccessful(
    { code: 0, timed_out: false },
    { attempted: false, exit_code: null, timed_out: false }
  );

  assert.equal(ok, true);
});

test("isTaskSuccessful accepts idle-terminated run with parsed json output", () => {
  const ok = isTaskSuccessful(
    { code: null, timed_out: false, idle_terminated: true },
    { attempted: false, exit_code: null, timed_out: false },
    true
  );

  assert.equal(ok, true);
});

test("isRunSuccessful accepts idle-terminated run with parsed json output", () => {
  const ok = isRunSuccessful(
    { code: null, timed_out: false, idle_terminated: true },
    true
  );

  assert.equal(ok, true);
});

test("scoreRunStatus does not penalize idle-terminated parsed-json success", () => {
  const scored = scoreRunStatus(
    { exit_code: null, timed_out: false, idle_terminated: true },
    true
  );

  assert.equal(scored.penalty, 0);
  assert.deepEqual(scored.notes, []);
});

test("scoreRunStatus infers idle_terminated when exit_code is null and not timed out", () => {
  // 旧版 result 没有 idle_terminated 字段，需要推断
  const scored = scoreRunStatus(
    { exit_code: null, timed_out: false },
    true
  );

  assert.equal(scored.penalty, 0);
  assert.deepEqual(scored.notes, []);
});

test("scoreRunStatus penalizes non-zero exit code without idle termination", () => {
  const scored = scoreRunStatus(
    { exit_code: 1, timed_out: false, idle_terminated: false },
    true
  );

  assert.equal(scored.penalty, 35);
  assert.deepEqual(scored.notes, ["command exit_code != 0"]);
});

test("scoreRunStatus penalizes timeout", () => {
  const scored = scoreRunStatus(
    { exit_code: null, timed_out: true },
    true
  );

  assert.equal(scored.penalty, 40);
  assert.deepEqual(scored.notes, ["command timed out"]);
});

test("isRunSuccessful handles Windows race where both timed_out and idle_terminated are true", () => {
  // Windows 上 idle_terminated 和 timed_out 可能同时为 true
  // idle_terminated 应优先
  const ok = isRunSuccessful(
    { code: null, timed_out: true, idle_terminated: true },
    true
  );

  assert.equal(ok, true);
});

test("isRunSuccessful rejects Windows race when parsed json is not ok", () => {
  const ok = isRunSuccessful(
    { code: null, timed_out: true, idle_terminated: true },
    false
  );

  assert.equal(ok, false);
});

test("scoreRunStatus handles Windows race with idle_terminated priority over timed_out", () => {
  // 当 idle_terminated 和 timed_out 同时为 true 且有合法 JSON 输出时，
  // 不应扣分（idle 终止是正常完成）
  const scored = scoreRunStatus(
    { exit_code: null, timed_out: true, idle_terminated: true },
    true
  );

  assert.equal(scored.penalty, 0);
  assert.deepEqual(scored.notes, []);
});

test("scoreRunStatus penalizes Windows race idle_terminated without valid output", () => {
  // idle_terminated 但没有有效输出 → 35 分罚分（非硬超时的 40 分）
  const scored = scoreRunStatus(
    { exit_code: null, timed_out: true, idle_terminated: true },
    false
  );

  assert.equal(scored.penalty, 35);
  assert.deepEqual(scored.notes, ["idle terminated without valid structured output"]);
});

test("detectEvidenceConflicts flags mismatch between parsed failures and passing router tests", () => {
  const conflicts = detectEvidenceConflicts(
    {
      failures: ["Node test command failed"],
      test_results: ["FAIL: command exited with code 1"]
    },
    { attempted: true, exit_code: 0, timed_out: false }
  );

  assert.deepEqual(conflicts, [
    "parsed output reports failures but router-owned tests passed"
  ]);
});

test("validateOutputShape reports missing schema fields", () => {
  const shape = validateOutputShape({ summary: "ok" }, {
    summary: "string",
    files_changed: "array"
  });

  assert.equal(shape.ok, false);
  assert.deepEqual(shape.notes, ["missing field: files_changed"]);
});

test("isStructuredTaskSuccessful fails when structured output is invalid", () => {
  const ok = isStructuredTaskSuccessful(
    { code: 0, timed_out: false },
    { attempted: false, exit_code: null, timed_out: false },
    false,
    { summary: "string" }
  );

  assert.equal(ok, false);
});

test("isStructuredTaskSuccessful fails when schema validation fails", () => {
  const ok = isStructuredTaskSuccessful(
    { code: 0, timed_out: false },
    { attempted: false, exit_code: null, timed_out: false },
    true,
    { summary: "string", files_changed: "array" },
    { summary: "ok" }
  );

  assert.equal(ok, false);
});
