import fs from "node:fs";
import path from "node:path";

export function isGitRepository(repoRoot) {
  return fs.existsSync(path.join(repoRoot, ".git"));
}

export async function resolveExecutionContext(repoRoot, taskId, agent, createWorktree) {
  if (!isGitRepository(repoRoot)) {
    return {
      mode: "direct",
      path: repoRoot,
      branch: "",
      created_ok: true,
      stdout: "",
      stderr: ""
    };
  }

  const worktree = await createWorktree(repoRoot, taskId, agent);
  return {
    mode: "worktree",
    ...worktree
  };
}
