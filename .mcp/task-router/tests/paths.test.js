import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  jobFile,
  jobsDir,
  resultFile,
  scoreFile,
  bundleFile,
  worktreeBranch,
  worktreePath,
  patchDir,
  taskEventFile,
  JOB_ROOT,
  RESULT_ROOT,
  SCORE_ROOT,
  BUNDLE_ROOT,
  WT_ROOT,
  PATCH_ROOT,
  EVENT_ROOT
} from "../lib/paths.js";

test("jobFile returns correct path for valid task id", () => {
  const result = jobFile("my-task");
  assert.equal(result, path.join(JOB_ROOT, "my-task.json"));
});

test("jobsDir returns the JOB_ROOT directory", () => {
  assert.equal(jobsDir(), JOB_ROOT);
});

test("resultFile without agent returns index path", () => {
  const result = resultFile("task-1");
  assert.equal(result, path.join(RESULT_ROOT, "task-1.json"));
});

test("resultFile with agent returns agent-specific path", () => {
  const result = resultFile("task-1", "codex");
  assert.equal(result, path.join(RESULT_ROOT, "task-1.codex.json"));
});

test("scoreFile returns agent-specific score path", () => {
  const result = scoreFile("task-1", "gemini");
  assert.equal(result, path.join(SCORE_ROOT, "task-1.gemini.json"));
});

test("bundleFile returns agent-specific bundle path", () => {
  const result = bundleFile("task-1", "codex");
  assert.equal(result, path.join(BUNDLE_ROOT, "task-1.codex.json"));
});

test("worktreeBranch returns branch name format", () => {
  const result = worktreeBranch("task-1", "codex");
  assert.equal(result, "agent/task-1-codex");
});

test("worktreePath returns worktree directory path", () => {
  const result = worktreePath("task-1", "codex");
  assert.equal(result, path.join(WT_ROOT, "task-1-codex"));
});

test("patchDir returns patch directory path", () => {
  const result = patchDir("task-1", "gemini");
  assert.equal(result, path.join(PATCH_ROOT, "task-1-gemini"));
});

test("taskEventFile returns event file path", () => {
  const result = taskEventFile("task-1");
  assert.equal(result, path.join(EVENT_ROOT, "task-1.jsonl"));
});

test("path builders reject invalid task ids", () => {
  assert.throws(() => jobFile("bad/id"), /invalid task_id/);
  assert.throws(() => resultFile("bad id"), /invalid task_id/);
  assert.throws(() => scoreFile("@invalid", "codex"), /invalid task_id/);
  assert.throws(() => bundleFile("has space", "gemini"), /invalid task_id/);
  assert.throws(() => worktreeBranch("a/b", "codex"), /invalid task_id/);
  assert.throws(() => worktreePath("x y", "codex"), /invalid task_id/);
  assert.throws(() => patchDir("!", "codex"), /invalid task_id/);
  assert.throws(() => taskEventFile("../escape"), /invalid task_id/);
});
