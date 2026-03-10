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

export function syncScopedFilesIntoExecutionPath(repoRoot, executionPath, filesScope = []) {
  for (const entry of filesScope) {
    const relative = String(entry || "").replace(/[\\/]+$/, "");
    if (!relative) continue;

    const source = path.join(repoRoot, relative);
    if (!fs.existsSync(source)) continue;

    const destination = path.join(executionPath, relative);
    const stat = fs.statSync(source);
    if (stat.isDirectory()) {
      fs.mkdirSync(destination, { recursive: true });
      for (const child of fs.readdirSync(source)) {
        const childSource = path.join(source, child);
        const childDestination = path.join(destination, child);
        fs.cpSync(childSource, childDestination, { recursive: true, force: true });
      }
      continue;
    }

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
}
