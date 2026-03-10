import test from "node:test";
import assert from "node:assert/strict";

import {
  detectEvidenceConflicts,
  extractJsonObject,
  isRunSuccessful,
  scoreRunStatus,
  normalizeStructuredStdout,
  shouldCommitWorktree,
  isTaskSuccessful
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
