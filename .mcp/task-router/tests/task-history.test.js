import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { buildTaskHistory } from "../lib/task-history.js";

function makeTempDirs() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "task-history-test-"));
  const jobsDir = path.join(base, "jobs");
  const scoresDir = path.join(base, "scores");
  const resultsDir = path.join(base, "results");
  fs.mkdirSync(jobsDir, { recursive: true });
  fs.mkdirSync(scoresDir, { recursive: true });
  fs.mkdirSync(resultsDir, { recursive: true });
  return { base, jobsDir, scoresDir, resultsDir };
}

test("buildTaskHistory returns empty history for empty directories", () => {
  const { jobsDir, scoresDir, resultsDir } = makeTempDirs();
  const history = buildTaskHistory(jobsDir, scoresDir, resultsDir);

  assert.equal(history.total_tasks, 0);
  assert.deepEqual(history.tasks, []);
  assert.equal(history.average_score, null);
});

test("buildTaskHistory aggregates jobs with scores and results", () => {
  const { jobsDir, scoresDir, resultsDir } = makeTempDirs();

  // 创建 job
  fs.writeFileSync(
    path.join(jobsDir, "task-a.json"),
    JSON.stringify({
      task_id: "task-a",
      task_type: "implementation",
      mode: "single",
      selected_agent: "codex",
      retry_count: 1,
      created_at: "2024-01-01T00:00:00Z"
    })
  );

  // 创建 result index
  fs.writeFileSync(
    path.join(resultsDir, "task-a.json"),
    JSON.stringify({ ok: true, status: "completed", selected_agent: "codex" })
  );

  // 创建 score
  fs.writeFileSync(
    path.join(scoresDir, "task-a.codex.json"),
    JSON.stringify({ task_id: "task-a", agent: "codex", score: 85 })
  );

  const history = buildTaskHistory(jobsDir, scoresDir, resultsDir);

  assert.equal(history.total_tasks, 1);
  assert.equal(history.status_counts.completed, 1);
  assert.equal(history.average_score, 85);
  assert.equal(history.total_retries, 1);
  assert.equal(history.agent_stats.codex.runs, 1);
  assert.equal(history.agent_stats.codex.wins, 1);
  assert.equal(history.tasks[0].task_id, "task-a");
  assert.equal(history.tasks[0].scores.codex, 85);
});

test("buildTaskHistory counts failed tasks correctly", () => {
  const { jobsDir, scoresDir, resultsDir } = makeTempDirs();

  fs.writeFileSync(
    path.join(jobsDir, "task-b.json"),
    JSON.stringify({
      task_id: "task-b",
      task_type: "bugfix",
      mode: "fallback",
      selected_agent: "codex",
      created_at: "2024-01-02T00:00:00Z"
    })
  );

  fs.writeFileSync(
    path.join(resultsDir, "task-b.json"),
    JSON.stringify({ ok: false, status: "failed", selected_agent: "codex" })
  );

  fs.writeFileSync(
    path.join(scoresDir, "task-b.codex.json"),
    JSON.stringify({ task_id: "task-b", agent: "codex", score: 30 })
  );

  const history = buildTaskHistory(jobsDir, scoresDir, resultsDir);

  assert.equal(history.status_counts.failed, 1);
  assert.equal(history.average_score, 30);
  assert.equal(history.agent_stats.codex.wins, 0);
});

test("buildTaskHistory counts cancelled tasks correctly", () => {
  const { jobsDir, scoresDir, resultsDir } = makeTempDirs();

  fs.writeFileSync(
    path.join(jobsDir, "task-c.json"),
    JSON.stringify({
      task_id: "task-c",
      task_type: "docs",
      mode: "single",
      selected_agent: "gemini",
      created_at: "2024-01-03T00:00:00Z"
    })
  );

  fs.writeFileSync(
    path.join(resultsDir, "task-c.json"),
    JSON.stringify({ ok: false, status: "cancelled", selected_agent: "gemini", cancelled_at: "2024-01-03T00:01:00Z" })
  );

  const history = buildTaskHistory(jobsDir, scoresDir, resultsDir);

  assert.equal(history.status_counts.cancelled, 1);
  assert.equal(history.tasks[0].status, "cancelled");
});

test("buildTaskHistory handles non-existent directories", () => {
  const history = buildTaskHistory("/nonexistent/jobs", "/nonexistent/scores", "/nonexistent/results");

  assert.equal(history.total_tasks, 0);
});
