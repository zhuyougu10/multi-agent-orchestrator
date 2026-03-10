import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { resolveExecutionContext } from "../runtime.js";
import { buildArgs } from "../runner.js";

test("uses direct execution for non-git directories", async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "task-router-no-git-"));

  const context = await resolveExecutionContext(repoRoot, "task-1", "codex", async () => {
    throw new Error("createWorktree should not be called");
  });

  assert.equal(context.mode, "direct");
  assert.equal(context.path, repoRoot);
  assert.equal(context.created_ok, true);
});

test("uses worktree execution for git directories", async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "task-router-git-"));
  fs.mkdirSync(path.join(repoRoot, ".git"));

  const context = await resolveExecutionContext(repoRoot, "task-2", "codex", async () => ({
    mode: "worktree",
    path: path.join(repoRoot, "wt"),
    branch: "agent/task-2-codex",
    created_ok: true,
    stdout: "",
    stderr: ""
  }));

  assert.equal(context.mode, "worktree");
  assert.equal(context.path, path.join(repoRoot, "wt"));
  assert.equal(context.created_ok, true);
});

test("codex direct execution skips git trust check", () => {
  const built = buildArgs("codex", "hello");

  assert.equal(built.command, "powershell");
  assert.equal(built.args.at(-1).includes("--skip-git-repo-check"), true);
});
