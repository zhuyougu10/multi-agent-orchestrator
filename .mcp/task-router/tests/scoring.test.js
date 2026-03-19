import test from "node:test";
import assert from "node:assert/strict";

import { computeScore, scopeSignals, buildEarlyFailureResult } from "../lib/scoring.js";

// --- scopeSignals ---

test("scopeSignals returns ok for empty scope", () => {
  const result = scopeSignals([], ["src/app.js"]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.out_of_scope_files, []);
});

test("scopeSignals detects out-of-scope files", () => {
  const result = scopeSignals(["src/**"], ["src/app.js", "config/db.json"]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.out_of_scope_files, ["config/db.json"]);
});

test("scopeSignals passes when all files are in scope", () => {
  const result = scopeSignals(["src/**", "config/**"], ["src/app.js", "config/db.json"]);
  assert.equal(result.ok, true);
});

// --- computeScore ---

test("computeScore gives 100 for perfect result with valid JSON", () => {
  const scored = computeScore({
    result: {
      exit_code: 0,
      timed_out: false,
      idle_terminated: false,
      stdout: '{"summary":"ok"}',
      stderr: "",
      tests: { attempted: false, exit_code: null },
      artifacts: { git_diff_names: [] }
    },
    outputSchema: { summary: "string" },
    filesScope: [],
    constraints: []
  });
  assert.equal(scored.score, 100);
  assert.equal(scored.parsed_json_ok, true);
  assert.equal(scored.schema_ok, true);
  assert.equal(scored.scope_ok, true);
  assert.equal(scored.constraints_ok, true);
});

test("computeScore penalizes failed tests", () => {
  const scored = computeScore({
    result: {
      exit_code: 0,
      timed_out: false,
      stdout: '{"summary":"ok"}',
      stderr: "",
      tests: { attempted: true, exit_code: 1 },
      artifacts: { git_diff_names: [] }
    },
    outputSchema: undefined,
    filesScope: [],
    constraints: []
  });
  assert.ok(scored.score < 100);
  assert.ok(scored.notes.includes("tests failed"));
});

test("computeScore penalizes invalid JSON stdout", () => {
  const scored = computeScore({
    result: {
      exit_code: 0,
      timed_out: false,
      stdout: "not json",
      stderr: "",
      tests: { attempted: false, exit_code: null },
      artifacts: { git_diff_names: [] }
    },
    outputSchema: undefined,
    filesScope: [],
    constraints: []
  });
  assert.ok(scored.notes.includes("stdout is not valid JSON"));
  assert.equal(scored.parsed_json_ok, false);
});

test("computeScore penalizes out-of-scope files", () => {
  const scored = computeScore({
    result: {
      exit_code: 0,
      timed_out: false,
      stdout: '{"summary":"ok"}',
      stderr: "",
      tests: { attempted: false, exit_code: null },
      artifacts: { git_diff_names: ["outside/file.js"] }
    },
    outputSchema: undefined,
    filesScope: ["src/**"],
    constraints: []
  });
  assert.equal(scored.scope_ok, false);
  assert.deepEqual(scored.out_of_scope_files, ["outside/file.js"]);
});

test("computeScore penalizes violated constraints", () => {
  const scored = computeScore({
    result: {
      exit_code: 0,
      timed_out: false,
      stdout: '{"summary":"implemented caching"}',
      stderr: "",
      tests: { attempted: false, exit_code: null },
      artifacts: { git_diff_names: [] }
    },
    outputSchema: undefined,
    filesScope: [],
    constraints: ["add rate limiting middleware"]
  });
  assert.equal(scored.constraints_ok, false);
  assert.ok(scored.constraints_violated.length > 0);
});

test("computeScore accumulates multiple penalties", () => {
  const scored = computeScore({
    result: {
      exit_code: 1,
      timed_out: false,
      idle_terminated: false,
      stdout: "broken output",
      stderr: "error occurred",
      tests: { attempted: true, exit_code: 1 },
      artifacts: { git_diff_names: ["outside.js"] }
    },
    outputSchema: { summary: "string" },
    filesScope: ["src/**"],
    constraints: ["implement caching"]
  });
  assert.ok(scored.score < 50);
  assert.ok(scored.notes.length > 3);
});

// --- buildEarlyFailureResult ---

test("buildEarlyFailureResult produces well-formed failure result", () => {
  const result = buildEarlyFailureResult({
    taskId: "task-fail",
    agent: "codex",
    cwd: "/project",
    executionContext: { mode: "worktree", path: "/wt", branch: "agent/task-fail-codex" },
    stderrMessage: "creation failed"
  });

  assert.equal(result.ok, false);
  assert.equal(result.task_id, "task-fail");
  assert.equal(result.agent, "codex");
  assert.equal(result.exit_code, 1);
  assert.equal(result.stderr, "creation failed");
  assert.equal(result.execution_mode, "worktree");
  assert.equal(result.tests.attempted, false);
  assert.equal(result.commit.attempted, false);
  assert.ok(result.started_at);
  assert.ok(result.finished_at);
});

test("buildEarlyFailureResult uses custom nowIso function", () => {
  const result = buildEarlyFailureResult({
    taskId: "task-custom",
    agent: "gemini",
    cwd: "/project",
    executionContext: { mode: "direct", path: "/project", branch: "" },
    stderrMessage: "test error",
    nowIso: () => "2024-01-01T00:00:00Z"
  });

  assert.equal(result.started_at, "2024-01-01T00:00:00Z");
  assert.equal(result.finished_at, "2024-01-01T00:00:00Z");
});
