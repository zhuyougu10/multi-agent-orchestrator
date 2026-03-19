import fs from "node:fs";
import path from "node:path";
import { readJson, exists } from "./storage.js";

/**
 * 汇总所有已完成任务的历史记录
 * @param {string} jobsDir - jobs 目录路径
 * @param {string} scoresDir - scores 目录路径
 * @param {string} resultsDir - results 目录路径
 * @returns {object} 历史汇总
 */
export function buildTaskHistory(jobsDir, scoresDir, resultsDir) {
  const jobFiles = fs.existsSync(jobsDir)
    ? fs.readdirSync(jobsDir).filter((f) => f.endsWith(".json"))
    : [];

  const tasks = [];
  let totalScore = 0;
  let scoredCount = 0;
  const agentStats = { codex: { runs: 0, wins: 0 }, gemini: { runs: 0, wins: 0 } };
  const statusCounts = { completed: 0, failed: 0, running: 0, cancelled: 0 };
  let totalRetries = 0;

  for (const file of jobFiles) {
    const jobPath = path.join(jobsDir, file);
    let job;
    try {
      job = readJson(jobPath);
    } catch {
      continue;
    }

    const taskId = job.task_id;
    const entry = {
      task_id: taskId,
      task_type: job.task_type,
      mode: job.mode,
      selected_agent: job.selected_agent,
      retry_count: job.retry_count || 0,
      created_at: job.created_at
    };

    totalRetries += entry.retry_count;

    // 读取结果索引
    const indexPath = path.join(resultsDir, `${taskId}.json`);
    if (exists(indexPath)) {
      try {
        const index = readJson(indexPath);
        entry.status = index.status || (index.ok ? "completed" : "failed");
        entry.selected_agent = index.selected_agent || entry.selected_agent;
      } catch {
        entry.status = "unknown";
      }
    } else {
      entry.status = "unknown";
    }

    if (entry.status in statusCounts) {
      statusCounts[entry.status]++;
    }

    // 读取分数
    const agents = ["codex", "gemini"];
    entry.scores = {};
    for (const agent of agents) {
      const scorePath = path.join(scoresDir, `${taskId}.${agent}.json`);
      if (exists(scorePath)) {
        try {
          const scoreData = readJson(scorePath);
          entry.scores[agent] = scoreData.score;
          totalScore += scoreData.score;
          scoredCount++;
          agentStats[agent].runs++;
          if (scoreData.score >= 60) {
            agentStats[agent].wins++;
          }
        } catch {
          // 跳过损坏的分数文件
        }
      }
    }

    tasks.push(entry);
  }

  // 按创建时间倒序排列
  tasks.sort((a, b) => {
    if (!a.created_at || !b.created_at) return 0;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return {
    total_tasks: tasks.length,
    status_counts: statusCounts,
    average_score: scoredCount > 0 ? Math.round(totalScore / scoredCount) : null,
    total_retries: totalRetries,
    agent_stats: agentStats,
    tasks
  };
}
