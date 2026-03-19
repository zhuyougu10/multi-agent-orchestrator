import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPrepareMergePayload,
  buildCherryPickMergePayload,
  buildPatchMergePayload
} from "../lib/merge-flow.js";

test("buildPrepareMergePayload returns worktree-path error for patch without worktree", () => {
  const payload = buildPrepareMergePayload({
    taskId: "task-1",
    agent: "codex",
    strategy: "patch",
    bundle: { result: { worktree_path: "" } }
  });

  assert.deepEqual(payload, {
    ok: false,
    error: "worktree path missing",
    task_id: "task-1",
    agent: "codex"
  });
});

test("buildPrepareMergePayload returns commit sha for cherry-pick strategy", () => {
  const payload = buildPrepareMergePayload({
    taskId: "task-1",
    agent: "gemini",
    strategy: "cherry-pick",
    bundle: { result: { commit: { head_sha: "abc123" }, artifacts: { git_diff_stat: "1 file changed", git_diff_names: ["src/app.js"] } } }
  });

  assert.deepEqual(payload, {
    ok: true,
    task_id: "task-1",
    agent: "gemini",
    strategy: "cherry-pick",
    commit_sha: "abc123",
    diff_stat: "1 file changed",
    files_changed: ["src/app.js"]
  });
});

test("buildCherryPickMergePayload reports missing commit sha", () => {
  const payload = buildCherryPickMergePayload({
    taskId: "task-2",
    agent: "codex",
    bundle: { result: { commit: { head_sha: "" } } }
  });

  assert.deepEqual(payload, {
    ok: false,
    error: "missing commit sha",
    task_id: "task-2",
    agent: "codex"
  });
});

test("buildPatchMergePayload reports three-way fallback success", () => {
  const payload = buildPatchMergePayload({
    taskId: "task-3",
    agent: "gemini",
    patchFile: "task-3.patch",
    check: { code: 1, stdout: "", stderr: "check failed" },
    apply3: { code: 0, stdout: "applied", stderr: "" }
  });

  assert.deepEqual(payload, {
    ok: true,
    strategy: "patch",
    task_id: "task-3",
    agent: "gemini",
    patch_file: "task-3.patch",
    mode: "three-way-fallback",
    stdout: "applied",
    stderr: "",
    initial_apply_check_stderr: "check failed"
  });
});

test("buildPatchMergePayload reports apply-check failure when fallback also fails", () => {
  const payload = buildPatchMergePayload({
    taskId: "task-3",
    agent: "gemini",
    patchFile: "task-3.patch",
    check: { code: 1, stdout: "check out", stderr: "check failed" },
    apply3: { code: 1, stdout: "fallback out", stderr: "fallback failed" }
  });

  assert.deepEqual(payload, {
    ok: false,
    strategy: "patch",
    task_id: "task-3",
    agent: "gemini",
    stage: "apply-check",
    stdout: "check out",
    stderr: "check failed",
    fallback_stdout: "fallback out",
    fallback_stderr: "fallback failed"
  });
});
