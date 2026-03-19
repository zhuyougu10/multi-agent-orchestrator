import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { gitCommitAll } from "../lib/git.js";
import { execCmd } from "../lib/process.js";

test("gitCommitAll can commit messages with spaces and parentheses on Windows shell", async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "task-router-git-commit-"));

  await execCmd("git", ["init"], repoRoot, {}, { shell: false });
  await execCmd("git", ["config", "user.name", "OpenCode Test"], repoRoot, {}, { shell: false });
  await execCmd("git", ["config", "user.email", "opencode@example.com"], repoRoot, {}, { shell: false });

  fs.writeFileSync(path.join(repoRoot, "a.txt"), "hello\n", "utf8");

  const commit = await gitCommitAll(execCmd, repoRoot, "agent(task): codex result");

  assert.equal(commit.code, 0);
  assert.match(commit.stdout, /codex result|1 file changed/);
});
