import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeTaskId } from "./validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

export const WORK_ROOT = path.join(ROOT, "work");
export const JOB_ROOT = path.join(WORK_ROOT, "jobs");
export const RESULT_ROOT = path.join(WORK_ROOT, "results");
export const SCORE_ROOT = path.join(WORK_ROOT, "scores");
export const BUNDLE_ROOT = path.join(WORK_ROOT, "bundles");
export const WT_ROOT = path.join(WORK_ROOT, "worktrees");
export const PATCH_ROOT = path.join(WORK_ROOT, "patches");

export function ensureDirs() {
  for (const dir of [
    WORK_ROOT,
    JOB_ROOT,
    RESULT_ROOT,
    SCORE_ROOT,
    BUNDLE_ROOT,
    WT_ROOT,
    PATCH_ROOT
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function jobFile(taskId) {
  const id = sanitizeTaskId(taskId);
  return path.join(JOB_ROOT, `${id}.json`);
}

export function resultFile(taskId, agent = null) {
  const id = sanitizeTaskId(taskId);
  return agent
    ? path.join(RESULT_ROOT, `${id}.${agent}.json`)
    : path.join(RESULT_ROOT, `${id}.json`);
}

export function scoreFile(taskId, agent) {
  const id = sanitizeTaskId(taskId);
  return path.join(SCORE_ROOT, `${id}.${agent}.json`);
}

export function bundleFile(taskId, agent) {
  const id = sanitizeTaskId(taskId);
  return path.join(BUNDLE_ROOT, `${id}.${agent}.json`);
}

export function worktreeBranch(taskId, agent) {
  const id = sanitizeTaskId(taskId);
  return `agent/${id}-${agent}`;
}

export function worktreePath(taskId, agent) {
  const id = sanitizeTaskId(taskId);
  return path.join(WT_ROOT, `${id}-${agent}`);
}

export function patchDir(taskId, agent) {
  const id = sanitizeTaskId(taskId);
  return path.join(PATCH_ROOT, `${id}-${agent}`);
}
