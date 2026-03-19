import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { resolveExecutionContext, syncScopedFilesIntoExecutionPath } from "../runtime.js";
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

  const isWindows = process.platform === "win32";
  assert.equal(built.command, isWindows ? "powershell" : "/bin/sh");
  assert.equal(built.args.at(-1).includes("--skip-git-repo-check"), true);
});

test("syncScopedFilesIntoExecutionPath copies scoped root files into worktree", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "task-router-sync-src-"));
  const execRoot = fs.mkdtempSync(path.join(os.tmpdir(), "task-router-sync-dst-"));

  fs.writeFileSync(path.join(repoRoot, "task_plan.md"), "plan\n", "utf8");
  fs.mkdirSync(path.join(repoRoot, "notes"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "notes", "finding.txt"), "finding\n", "utf8");

  syncScopedFilesIntoExecutionPath(repoRoot, execRoot, ["task_plan.md", "notes/"]);

  assert.equal(fs.readFileSync(path.join(execRoot, "task_plan.md"), "utf8"), "plan\n");
  assert.equal(fs.readFileSync(path.join(execRoot, "notes", "finding.txt"), "utf8"), "finding\n");
});

test("syncScopedFilesIntoExecutionPath copies files matched by glob scope", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "task-router-sync-glob-src-"));
  const execRoot = fs.mkdtempSync(path.join(os.tmpdir(), "task-router-sync-glob-dst-"));

  fs.mkdirSync(path.join(repoRoot, "src", "lib"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "src", "index.js"), "index\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "src", "lib", "util.js"), "util\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "src", "lib", "util.ts"), "ts\n", "utf8");

  syncScopedFilesIntoExecutionPath(repoRoot, execRoot, ["src/**/*.js"]);

  assert.equal(fs.readFileSync(path.join(execRoot, "src", "index.js"), "utf8"), "index\n");
  assert.equal(fs.readFileSync(path.join(execRoot, "src", "lib", "util.js"), "utf8"), "util\n");
  assert.equal(fs.existsSync(path.join(execRoot, "src", "lib", "util.ts")), false);
});
