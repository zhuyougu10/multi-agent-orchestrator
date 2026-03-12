import fs from "node:fs";
import path from "node:path";

import { listScopedFiles } from "./lib/files-scope.js";

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
  const filesToCopy = listScopedFiles(filesScope, collectRepositoryFiles(repoRoot));

  if (filesToCopy.length > 0) {
    for (const relative of filesToCopy) {
      const source = path.join(repoRoot, relative);
      const destination = path.join(executionPath, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
    }
    return;
  }

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

function collectRepositoryFiles(rootPath, relativeBase = "") {
  const entries = fs.readdirSync(path.join(rootPath, relativeBase), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeBase, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRepositoryFiles(rootPath, relativePath));
      continue;
    }
    files.push(relativePath.replace(/\\/g, "/"));
  }

  return files;
}
