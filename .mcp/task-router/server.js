import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { launchDispatch } from "./dispatch.js";
import { resolveExecutionContext, syncScopedFilesIntoExecutionPath } from "./runtime.js";
import { buildArgs } from "./runner.js";
import {
  ensureDirs,
  jobFile,
  jobsDir,
  resultFile,
  scoreFile,
  bundleFile,
  worktreePath,
  worktreeBranch,
  patchDir,
  taskEventFile,
  SCORE_ROOT,
  RESULT_ROOT
} from "./lib/paths.js";
import { appendJsonLine, exists, readJson, safeUnlink, writeJsonAtomic } from "./lib/storage.js";
import { execCmd } from "./lib/process.js";
import {
  detectEvidenceConflicts,
  extractJsonObject,
  isStructuredTaskSuccessful,
  normalizeStructuredStdout,
  shouldCommitWorktree
} from "./lib/result-utils.js";
import { sanitizeTaskId } from "./lib/validation.js";
import { AGENT_SCHEMA, OPTIONAL_AGENT_SCHEMA, PREFERRED_AGENT_SCHEMA, chooseAgent } from "./lib/agents.js";
import { gitCommitAll } from "./lib/git.js";
import { assertTaskNotActive } from "./lib/job-state.js";
import { createTaskEventHub } from "./lib/task-events.js";
import { buildCherryPickMergePayload, buildPatchMergePayload, buildPrepareMergePayload } from "./lib/merge-flow.js";
import { resolveCollectedAgent, selectCollectedPayload } from "./lib/result-collection.js";
import { buildPatchCommandArgs } from "./lib/merge-utils.js";
import { collectPanelSnapshotsUntilTerminal, createTaskPanelState, updateTaskPanelState } from "./lib/task-panel.js";
import { registerProcess, unregisterProcess, cancelAllForTask, listActiveProcesses } from "./lib/process-registry.js";
import { assertCanRetry, incrementRetryCount } from "./lib/retry-guard.js";
import { buildTaskHistory } from "./lib/task-history.js";
import { acquireSlot, releaseSlot, getConcurrencyStatus, setMaxConcurrent } from "./lib/concurrency.js";
import { rotateEventFile } from "./lib/event-rotation.js";
import { computeScore, scopeSignals, buildEarlyFailureResult } from "./lib/scoring.js";

ensureDirs();

const HEARTBEAT_INTERVAL_MS = 5000;
const DEFAULT_IDLE_TIMEOUT_MS = 3000;
const taskEventHub = createTaskEventHub();

function nowIso() {
  return new Date().toISOString();
}

let publishCounter = 0;
const EVENT_ROTATION_INTERVAL = 50; // 每 50 次发布检查一次事件文件大小

function publishTaskEvent(taskId, agent, eventType, details = {}) {
  const event = {
    task_id: taskId,
    agent,
    event_type: eventType,
    timestamp: nowIso(),
    ...details
  };
  const eventFile = taskEventFile(taskId);
  appendJsonLine(eventFile, event);
  taskEventHub.publish(event);

  publishCounter++;
  if (publishCounter % EVENT_ROTATION_INTERVAL === 0) {
    rotateEventFile(eventFile);
  }
}

function storedTerminalEvents(taskId, agent) {
  const safeTaskId = sanitizeTaskId(taskId);
  const agents = agent ? [agent] : ["codex", "gemini"];
  const events = [];

  for (const candidate of agents) {
    const file = resultFile(safeTaskId, candidate);
    if (!exists(file)) continue;
    const result = readJson(file);
    events.push({
      cursor: 0,
      event: {
        task_id: safeTaskId,
        agent: candidate,
        event_type: result.ok ? "completed" : "failed",
        timestamp: result.finished_at || nowIso(),
        exit_code: result.exit_code,
        timed_out: result.timed_out,
        status_basis: result.status_basis
      }
    });
  }

  return events;
}

function alternateAgent(agent) {
  return agent === "codex" ? "gemini" : "codex";
}

async function createWorktree(repoRoot, taskId, agent) {
  const branch = worktreeBranch(taskId, agent);
  const wtPath = worktreePath(taskId, agent);
  if (fs.existsSync(wtPath)) {
    await execCmd("git", ["worktree", "remove", "--force", wtPath], repoRoot, {}, { shell: true });
  }
  await execCmd("git", ["branch", "-D", branch], repoRoot, {}, { shell: true });
  const created = await execCmd(
    "git",
    ["worktree", "add", "-b", branch, wtPath],
    repoRoot,
    {},
    { shell: true }
  );
  return {
    mode: "worktree",
    created_ok: created.code === 0 && !created.timed_out,
    path: wtPath,
    branch,
    stdout: created.stdout,
    stderr: created.stderr
  };
}

async function removeWorktree(repoRoot, taskId, agent) {
  const branch = worktreeBranch(taskId, agent);
  const wtPath = worktreePath(taskId, agent);
  const removed = await execCmd(
    "git",
    ["worktree", "remove", "--force", wtPath],
    repoRoot,
    {},
    { shell: true }
  );
  await execCmd("git", ["branch", "-D", branch], repoRoot, {}, { shell: true });
  return {
    removed_ok: removed.code === 0,
    path: wtPath,
    branch,
    stdout: removed.stdout,
    stderr: removed.stderr
  };
}

async function captureGitArtifacts(cwd) {
  const status = await execCmd("git", ["status", "--short"], cwd, {}, { shell: true });
  const diffStat = await execCmd("git", ["diff", "--stat"], cwd, {}, { shell: true });
  const diff = await execCmd("git", ["diff"], cwd, {}, { shell: true });
  const diffNames = await execCmd("git", ["diff", "--name-only"], cwd, {}, { shell: true });
  return {
    git_status: status.stdout,
    git_diff_stat: diffStat.stdout,
    git_diff: diff.stdout,
    git_diff_names: diffNames.stdout.split(/\r?\n/).filter(Boolean)
  };
}

async function runTests(cwd, command) {
  if (!command?.trim()) {
    return {
      attempted: false,
      exit_code: null,
      stdout: "",
      stderr: ""
    };
  }
  const res = await execCmd(command, [], cwd, {}, { shell: true });
  return {
    attempted: true,
    exit_code: res.code,
    timed_out: res.timed_out,
    stdout: res.stdout,
    stderr: res.stderr
  };
}

async function getHeadSha(cwd) {
  const res = await execCmd("git", ["rev-parse", "HEAD"], cwd, {}, { shell: true });
  return {
    ok: res.code === 0 && !res.timed_out,
    sha: res.stdout.trim(),
    stderr: res.stderr
  };
}

function tryParseJson(text) {
  return extractJsonObject(text);
}

async function makePatch(wtPath, taskId, agent, result = null) {
  const outDir = patchDir(taskId, agent);
  fs.mkdirSync(outDir, { recursive: true });
  const patchFile = path.join(outDir, `${taskId}.${agent}.patch`);
  const diff = await execCmd("git", buildPatchCommandArgs(result), wtPath, {}, { shell: true });
  fs.writeFileSync(patchFile, diff.stdout, "utf8");
  return {
    ok: diff.code === 0 && !diff.timed_out,
    patch_file: patchFile,
    stdout: diff.stdout,
    stderr: diff.stderr
  };
}

async function applyPatchCheck(repoRoot, patchFile) {
  return execCmd("git", ["apply", "--check", patchFile], repoRoot, {}, { shell: true });
}

async function applyPatch(repoRoot, patchFile) {
  return execCmd("git", ["apply", patchFile], repoRoot, {}, { shell: true });
}

async function applyPatchThreeWay(repoRoot, patchFile) {
  return execCmd("git", ["apply", "--3way", patchFile], repoRoot, {}, { shell: true });
}

async function abortCherryPick(cwd) {
  return execCmd("git", ["cherry-pick", "--abort"], cwd, {}, { shell: true });
}

async function runInWorktree(job, agent) {
  await acquireSlot();
  try {
    return await runInWorktreeInner(job, agent);
  } finally {
    releaseSlot();
  }
}

async function runInWorktreeInner(job, agent) {
  const safeTaskId = sanitizeTaskId(job.task_id);
  const executionContext = await resolveExecutionContext(
    job.cwd,
    safeTaskId,
    agent,
    createWorktree
  );

  if (!executionContext.created_ok) {
    publishTaskEvent(safeTaskId, agent, "failed", {
      phase: "setup",
      message: executionContext.stderr || "worktree creation failed"
    });
    const failed = buildEarlyFailureResult({
      taskId: safeTaskId,
      agent,
      cwd: job.cwd,
      executionContext,
      stderrMessage: `worktree creation failed\n${executionContext.stderr || ""}`,
      nowIso
    });
    writeJsonAtomic(resultFile(safeTaskId, agent), failed);
    return failed;
  }

  if (executionContext.mode === "worktree") {
    syncScopedFilesIntoExecutionPath(job.cwd, executionContext.path, job.files_scope || []);
  }

  let built;
  try {
    built = buildArgs(agent, job.prompt);
  } catch (err) {
    publishTaskEvent(safeTaskId, agent, "failed", {
      phase: "build_args",
      message: err.message
    });
    const failed = buildEarlyFailureResult({
      taskId: safeTaskId,
      agent,
      cwd: job.cwd,
      executionContext,
      stderrMessage: `buildArgs failed: ${err.message}`,
      nowIso
    });
    writeJsonAtomic(resultFile(safeTaskId, agent), failed);
    return failed;
  }

  const startedAt = nowIso();
  publishTaskEvent(safeTaskId, agent, "started", {
    execution_mode: executionContext.mode,
    worktree_path: executionContext.mode === "worktree" ? executionContext.path : ""
  });
  const heartbeat = setInterval(() => {
    publishTaskEvent(safeTaskId, agent, "heartbeat", {
      phase: "agent_run"
    });
  }, HEARTBEAT_INTERVAL_MS);
  const runPromise = execCmd(
    built.command,
    built.args,
    executionContext.path,
    built.env || {},
    {
      shell: false,
      stdin: built.stdin,
      onStdout: (buf) => {
        publishTaskEvent(safeTaskId, agent, "stdout", {
          chunk: buf.toString()
        });
      },
      onStderr: (buf) => {
        publishTaskEvent(safeTaskId, agent, "stderr", {
          chunk: buf.toString()
        });
      },
      timeoutMs: job.timeout_ms,
      idleTimeoutMs: job.idle_timeout_ms ?? DEFAULT_IDLE_TIMEOUT_MS
    }
  );
  if (runPromise._child) {
    registerProcess(safeTaskId, agent, runPromise._child);
  }
  const run = await runPromise;
  unregisterProcess(safeTaskId, agent);
  clearInterval(heartbeat);

  publishTaskEvent(safeTaskId, agent, "tests_started", {
    command: job.test_command || ""
  });
  const tests = await runTests(executionContext.path, job.test_command || "");
  publishTaskEvent(safeTaskId, agent, "tests_completed", {
    attempted: tests.attempted,
    exit_code: tests.exit_code,
    timed_out: tests.timed_out || false
  });
  const normalizedOutput = normalizeStructuredStdout(run.stdout);
  const evidenceConflicts = detectEvidenceConflicts(normalizedOutput.parsed_value, tests);
  const artifacts =
    executionContext.mode === "worktree"
      ? await captureGitArtifacts(executionContext.path)
      : {
          git_status: "",
          git_diff_stat: "",
          git_diff: "",
          git_diff_names: []
        };

  const commitMessage = `agent(${safeTaskId}): ${agent} result`;
  const shouldCommit = shouldCommitWorktree(executionContext.mode, artifacts);
  const commit = shouldCommit
    ? await gitCommitAll(execCmd, executionContext.path, commitMessage)
    : { code: null, stdout: "", stderr: "", timed_out: false };

  const head = shouldCommit
    ? await getHeadSha(executionContext.path)
    : { ok: false, sha: "", stderr: "" };

  const result = {
    ok: isStructuredTaskSuccessful(
      run,
      tests,
      normalizedOutput.parsed_json_ok,
      job.output_schema,
      normalizedOutput.parsed_value
    ),
    task_id: safeTaskId,
    agent,
    cwd: job.cwd,
    execution_mode: executionContext.mode,
    worktree_path: executionContext.mode === "worktree" ? executionContext.path : "",
    worktree_branch: executionContext.mode === "worktree" ? executionContext.branch : "",
    exit_code: run.code,
    timed_out: run.timed_out,
    idle_terminated: run.idle_terminated || false,
    started_at: startedAt,
    finished_at: nowIso(),
    stdout: normalizedOutput.stdout,
    raw_stdout: normalizedOutput.raw_stdout,
    stderr: run.stderr,
    status_basis: tests.attempted ? "router-tests" : "agent-run",
    output_analysis: {
      parsed_json_ok: normalizedOutput.parsed_json_ok,
      evidence_conflicts: evidenceConflicts
    },
    tests,
    artifacts,
    commit: {
      attempted: shouldCommit,
      exit_code: commit.code,
      stdout: commit.stdout,
      stderr: commit.stderr,
      timed_out: commit.timed_out || false,
      head_sha: head.ok ? head.sha : "",
      skipped_reason: executionContext.mode === "worktree" && !shouldCommit ? "no changes to commit" : ""
    }
  };

  publishTaskEvent(safeTaskId, agent, result.ok ? "completed" : "failed", {
    exit_code: result.exit_code,
    timed_out: result.timed_out,
    status_basis: result.status_basis
  });

  writeJsonAtomic(resultFile(safeTaskId, agent), result);

  const scored = computeScore({
    result,
    outputSchema: job.output_schema,
    filesScope: job.files_scope,
    constraints: job.constraints
  });

  const scorePayload = {
    task_id: safeTaskId,
    agent,
    score: scored.score,
    notes: scored.notes,
    parsed_json_ok: scored.parsed_json_ok,
    schema_ok: scored.schema_ok,
    scope_ok: scored.scope_ok,
    out_of_scope_files: scored.out_of_scope_files
  };
  writeJsonAtomic(scoreFile(safeTaskId, agent), scorePayload);

  const bundle = {
    task_id: safeTaskId,
    agent,
    selected: false,
    score: scorePayload,
    result
  };
  writeJsonAtomic(bundleFile(safeTaskId, agent), bundle);

  return result;
}

async function runSingle(job, agent) {
  return runInWorktree(job, agent);
}

async function runFallback(job, primaryAgent) {
  const first = await runSingle(job, primaryAgent);
  const scoreThreshold = job.score_threshold || 0;

  // 检查是否需要 fallback：执行失败 或 分数低于阈值
  let needsFallback = !first.ok;
  if (!needsFallback && scoreThreshold > 0) {
    const sf = scoreFile(job.task_id, primaryAgent);
    if (exists(sf)) {
      const scored = readJson(sf);
      if (scored.score < scoreThreshold) {
        needsFallback = true;
      }
    }
  }

  if (!needsFallback) {
    return {
      ok: true,
      selected_agent: primaryAgent,
      results: [first]
    };
  }
  const secondary = alternateAgent(primaryAgent);
  const second = await runSingle(job, secondary);

  // 从两个结果中选择分数更高的
  let selectedAgent = primaryAgent;
  const sf1 = scoreFile(job.task_id, primaryAgent);
  const sf2 = scoreFile(job.task_id, secondary);
  if (exists(sf1) && exists(sf2)) {
    const score1 = readJson(sf1).score;
    const score2 = readJson(sf2).score;
    selectedAgent = score2 > score1 ? secondary : primaryAgent;
  } else if (second.ok && !first.ok) {
    selectedAgent = secondary;
  }

  return {
    ok: [first, second].some((r) => r.ok),
    selected_agent: selectedAgent,
    results: [first, second]
  };
}

async function runRace(job) {
  const agents = ["codex", "gemini"];
  const results = await Promise.all(agents.map((agent) => runSingle(job, agent)));

  const scored = results.map((r) => {
    const file = scoreFile(job.task_id, r.agent);
    if (exists(file)) {
      return readJson(file);
    }
    // 回退：如果分数文件不存在（不应发生），重新计算
    const s = computeScore({
      result: r,
      outputSchema: job.output_schema,
      filesScope: job.files_scope
    });
    return {
      task_id: job.task_id,
      agent: r.agent,
      score: s.score,
      notes: s.notes,
      parsed_json_ok: s.parsed_json_ok,
      schema_ok: s.schema_ok,
      scope_ok: s.scope_ok,
      out_of_scope_files: s.out_of_scope_files
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    ok: results.some((r) => r.ok),
    selected_agent: scored[0]?.agent || null,
    scores: scored,
    results
  };
}

const server = new McpServer({
  name: "task-router",
  version: "0.4.0"
});

server.tool(
  "dispatch_task",
  {
    task_id: z.string(),
    task_type: z.string(),
    cwd: z.string(),
    prompt: z.string(),
    files_scope: z.array(z.string()).default([]),
    constraints: z.array(z.string()).default([]),
    preferred_agent: PREFERRED_AGENT_SCHEMA,
    mode: z.enum(["single", "fallback", "race"]).default("fallback"),
    test_command: z.string().default(""),
    output_schema: z.record(z.string()).optional(),
    timeout_ms: z.number().int().min(1000).max(600000).default(300000),
    idle_timeout_ms: z.number().int().min(500).max(60000).default(3000),
    score_threshold: z.number().int().min(0).max(100).default(0)
  },
  async ({ task_id, task_type, cwd, prompt, files_scope, constraints, preferred_agent, mode, test_command, output_schema, timeout_ms, idle_timeout_ms, score_threshold }) => {
    const safeTaskId = sanitizeTaskId(task_id);
    const existingIndex = exists(resultFile(safeTaskId)) ? readJson(resultFile(safeTaskId)) : null;
    assertTaskNotActive(safeTaskId, existingIndex);
    const chosen = chooseAgent(task_type, preferred_agent);
    const job = {
      task_id: safeTaskId,
      task_type,
      cwd,
      prompt,
      files_scope,
      constraints,
      preferred_agent,
      selected_agent: chosen,
      mode,
      test_command,
      output_schema,
      timeout_ms,
      idle_timeout_ms,
      score_threshold,
      created_at: nowIso()
    };
    writeJsonAtomic(jobFile(safeTaskId), job);

    const payload = launchDispatch({
      job,
      selectedAgent: chosen,
      mode,
      runners: {
        runSingle,
        runFallback,
        runRace
      },
      writeResultIndex: (resultPayload) => writeJsonAtomic(resultFile(safeTaskId), resultPayload),
      paths: {
        resultFile,
        bundleFile
      },
      alternateAgent
    });

    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
  }
);

server.tool(
  "collect_result",
  { task_id: z.string(), agent: OPTIONAL_AGENT_SCHEMA },
  async ({ task_id, agent }) => {
    const safeTaskId = sanitizeTaskId(task_id);
    const indexPath = resultFile(safeTaskId);
    const indexData = exists(indexPath) ? readJson(indexPath) : null;
    const selectedAgent = resolveCollectedAgent(agent, indexData);
    const bundlePath = selectedAgent ? bundleFile(safeTaskId, selectedAgent) : null;
    const resultPath = selectedAgent ? resultFile(safeTaskId, selectedAgent) : null;
    const selected = selectCollectedPayload(
      bundlePath && exists(bundlePath) ? readJson(bundlePath) : null,
      resultPath && exists(resultPath) ? readJson(resultPath) : null,
      agent ? null : indexData
    );
    if (!selected) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ ok: false, error: "result not found", task_id: safeTaskId, agent: selectedAgent || agent }, null, 2)
        }]
      };
    }
    return { content: [{ type: "text", text: JSON.stringify(selected, null, 2) }] };
  }
);

server.tool(
  "subscribe_task_events",
  {
    task_id: z.string(),
    agent: OPTIONAL_AGENT_SCHEMA,
    cursor: z.number().int().min(0).default(0),
    wait_ms: z.number().int().min(0).max(30000).default(5500)
  },
  async ({ task_id, agent, cursor, wait_ms }) => {
    const safeTaskId = sanitizeTaskId(task_id);
    const payload = await taskEventHub.waitForEvents(safeTaskId, agent ?? null, {
      cursor,
      timeoutMs: wait_ms
    });

    if (payload.events.length === 0) {
      const fallbackEvents = storedTerminalEvents(safeTaskId, agent).map((entry, index) => ({
        ...entry,
        cursor: cursor + index + 1
      }));
      if (fallbackEvents.length > 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              task_id: safeTaskId,
              agent: agent || null,
              events: fallbackEvents,
              next_cursor: fallbackEvents.at(-1).cursor,
              done: true,
              source: "stored-result"
            }, null, 2)
          }]
        };
      }
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          task_id: safeTaskId,
          agent: agent || null,
          events: payload.events,
          next_cursor: payload.next_cursor,
          done: payload.done,
          source: "live-stream"
        }, null, 2)
      }]
    };
  }
);

server.tool(
  "watch_task_group",
  {
    tasks: z.array(z.object({
      task_id: z.string(),
      agent: OPTIONAL_AGENT_SCHEMA,
      cursor: z.number().int().min(0).default(0)
    })),
    wait_ms: z.number().int().min(0).max(30000).default(5500)
  },
  async ({ tasks, wait_ms }) => {
    const state = createTaskPanelState(tasks.map((task) => ({
      task_id: sanitizeTaskId(task.task_id),
      agent: task.agent ?? null,
      cursor: task.cursor ?? 0
    })));
    const panel = await updateTaskPanelState(state, async (task) => {
      const payload = await taskEventHub.waitForEvents(task.task_id, task.agent, {
        cursor: task.cursor,
        timeoutMs: wait_ms
      });

      if (payload.events.length === 0) {
        const fallbackEvents = storedTerminalEvents(task.task_id, task.agent).map((entry, index) => ({
          ...entry,
          cursor: task.cursor + index + 1
        }));
        if (fallbackEvents.length > 0) {
          return { events: fallbackEvents };
        }
      }

      return { events: payload.events };
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify(panel, null, 2)
      }]
    };
  }
);

server.tool(
  "watch_task_group_blocking",
  {
    tasks: z.array(z.object({
      task_id: z.string(),
      agent: OPTIONAL_AGENT_SCHEMA,
      cursor: z.number().int().min(0).default(0)
    })),
    wait_ms: z.number().int().min(0).max(30000).default(5500)
  },
  async ({ tasks, wait_ms }) => {
    const result = await collectPanelSnapshotsUntilTerminal(
      tasks.map((task) => ({
        task_id: sanitizeTaskId(task.task_id),
        agent: task.agent ?? null,
        cursor: task.cursor ?? 0
      })),
      ({ tasks: nextTasks, waitMs }) => {
        const state = createTaskPanelState(nextTasks.map((task) => ({
          task_id: sanitizeTaskId(task.task_id),
          agent: task.agent ?? null,
          cursor: task.cursor ?? 0
        })));

        return updateTaskPanelState(state, async (task) => {
          const payload = await taskEventHub.waitForEvents(task.task_id, task.agent, {
            cursor: task.cursor,
            timeoutMs: waitMs
          });

          if (payload.events.length === 0) {
            const fallbackEvents = storedTerminalEvents(task.task_id, task.agent).map((entry, index) => ({
              ...entry,
              cursor: task.cursor + index + 1
            }));
            if (fallbackEvents.length > 0) {
              return { events: fallbackEvents };
            }
          }

          return { events: payload.events };
        });
      },
      wait_ms
    );

    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
);

server.tool(
  "score_result",
  {
    task_id: z.string(),
    agent: AGENT_SCHEMA,
    output_schema: z.record(z.string()).optional(),
    files_scope: z.array(z.string()).default([]),
    constraints: z.array(z.string()).default([])
  },
  async ({ task_id, agent, output_schema, files_scope, constraints }) => {
    const safeTaskId = sanitizeTaskId(task_id);
    const file = resultFile(safeTaskId, agent);
    if (!exists(file)) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ ok: false, error: "result not found", task_id: safeTaskId, agent }, null, 2)
        }]
      };
    }
    const result = readJson(file);
    const scored = computeScore({
      result,
      outputSchema: output_schema,
      filesScope: files_scope,
      constraints
    });
    const payload = {
      task_id: safeTaskId,
      agent,
      score: scored.score,
      notes: scored.notes,
      parsed_json_ok: scored.parsed_json_ok,
      schema_ok: scored.schema_ok,
      scope_ok: scored.scope_ok,
      out_of_scope_files: scored.out_of_scope_files
    };
    writeJsonAtomic(scoreFile(safeTaskId, agent), payload);
    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
  }
);

server.tool(
  "retry_task",
  { task_id: z.string(), issue: z.string(), preferred_agent: PREFERRED_AGENT_SCHEMA },
  async ({ task_id, issue, preferred_agent }) => {
    const safeTaskId = sanitizeTaskId(task_id);
    const jf = jobFile(safeTaskId);
    if (!exists(jf)) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ ok: false, error: "job not found", task_id: safeTaskId }, null, 2)
        }]
      };
    }
    const job = readJson(jf);
    const existingIndex = exists(resultFile(safeTaskId)) ? readJson(resultFile(safeTaskId)) : null;
    assertTaskNotActive(safeTaskId, existingIndex);
    assertCanRetry(safeTaskId, job);
    const updatedJob = incrementRetryCount(job);
    writeJsonAtomic(jf, updatedJob);
    const agent = chooseAgent(updatedJob.task_type, preferred_agent);
    const retryPrompt =
      `${updatedJob.prompt}\n\nRepair instructions:\n${issue}\n\nReturn valid JSON only and stay within declared scope.`;
    const result = await runInWorktree(
      { ...updatedJob, prompt: retryPrompt },
      agent
    );
    return {
      content: [{ type: "text", text: JSON.stringify({ ...result, retry_count: updatedJob.retry_count }, null, 2) }]
    };
  }
);

server.tool(
  "list_jobs",
  {},
  async () => {
    const dir = jobsDir();
    const files = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => f.endsWith(".json"))
      : [];
    const jobs = files.map((file) => {
      const full = path.join(dir, file);
      try {
        return readJson(full);
      } catch {
        return { file, error: "invalid json" };
      }
    });
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, jobs }, null, 2) }] };
  }
);

server.tool(
  "task_history",
  {},
  async () => {
    const history = buildTaskHistory(jobsDir(), SCORE_ROOT, RESULT_ROOT);
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, ...history }, null, 2) }] };
  }
);

server.tool(
  "prepare_merge",
  {
    task_id: z.string(),
    agent: AGENT_SCHEMA,
    strategy: z.enum(["patch", "cherry-pick"]).default("patch")
  },
  async ({ task_id, agent, strategy }) => {
    const safeTaskId = sanitizeTaskId(task_id);
    const file = bundleFile(safeTaskId, agent);
    if (!exists(file)) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ ok: false, error: "bundle not found", task_id: safeTaskId, agent }, null, 2)
        }]
      };
    }
    const bundle = readJson(file);

    if (strategy === "patch") {
      if (!bundle?.result?.worktree_path) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(buildPrepareMergePayload({ taskId: safeTaskId, agent, strategy, bundle }), null, 2)
          }]
        };
      }
      const patch = await makePatch(bundle.result.worktree_path, safeTaskId, agent, bundle.result);
      const diffStatResult = await execCmd("git", ["diff", "--stat"], bundle.result.worktree_path, {}, { shell: true });
      const diffStat = diffStatResult.stdout || "";
      return {
        content: [{
          type: "text",
          text: JSON.stringify(buildPrepareMergePayload({ taskId: safeTaskId, agent, strategy, bundle, patch, diffStat }), null, 2)
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(buildPrepareMergePayload({ taskId: safeTaskId, agent, strategy, bundle }), null, 2)
      }]
    };
  }
);

server.tool(
  "merge_winner",
  {
    cwd: z.string(),
    task_id: z.string(),
    agent: AGENT_SCHEMA,
    strategy: z.enum(["patch", "cherry-pick"]).default("patch")
  },
  async ({ cwd, task_id, agent, strategy }) => {
    const safeTaskId = sanitizeTaskId(task_id);
    const bundlePath = bundleFile(safeTaskId, agent);
    if (!exists(bundlePath)) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ ok: false, error: "bundle not found", task_id: safeTaskId, agent }, null, 2)
        }]
      };
    }
    const bundle = readJson(bundlePath);

    if (strategy === "cherry-pick") {
      const sha = bundle?.result?.commit?.head_sha;
      if (!sha) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(buildCherryPickMergePayload({ taskId: safeTaskId, agent, bundle }), null, 2)
          }]
        };
      }
      const picked = await execCmd("git", ["cherry-pick", sha], cwd, {}, { shell: true });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(buildCherryPickMergePayload({ taskId: safeTaskId, agent, bundle, picked }), null, 2)
        }]
      };
    }

    const prep = await makePatch(bundle.result.worktree_path, safeTaskId, agent, bundle.result);
    const firstPatch = prep.patch_file;

    const check = await applyPatchCheck(cwd, firstPatch);
    if (check.code !== 0) {
      const apply3 = await applyPatchThreeWay(cwd, firstPatch);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(buildPatchMergePayload({ taskId: safeTaskId, agent, patchFile: firstPatch, check, apply3 }), null, 2)
        }]
      };
    }

    const apply = await applyPatch(cwd, firstPatch);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(buildPatchMergePayload({ taskId: safeTaskId, agent, patchFile: firstPatch, check, apply }), null, 2)
      }]
    };
  }
);

server.tool(
  "abort_merge",
  { cwd: z.string() },
  async ({ cwd }) => {
    const aborted = await abortCherryPick(cwd);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ok: aborted.code === 0 && !aborted.timed_out,
          timed_out: aborted.timed_out,
          stdout: aborted.stdout,
          stderr: aborted.stderr
        }, null, 2)
      }]
    };
  }
);

server.tool(
  "cancel_task",
  { task_id: z.string() },
  async ({ task_id }) => {
    const safeTaskId = sanitizeTaskId(task_id);
    const killed = cancelAllForTask(safeTaskId);
    if (killed.length === 0) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ ok: false, error: "no active processes found", task_id: safeTaskId }, null, 2)
        }]
      };
    }
    publishTaskEvent(safeTaskId, killed[0]?.agent || null, "failed", {
      phase: "cancelled",
      message: "task cancelled by user"
    });
    const indexPath = resultFile(safeTaskId);
    if (exists(indexPath)) {
      const indexData = readJson(indexPath);
      if (indexData.status === "running") {
        writeJsonAtomic(indexPath, {
          ...indexData,
          status: "cancelled",
          ok: false,
          cancelled_at: nowIso()
        });
      }
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ ok: true, task_id: safeTaskId, killed }, null, 2)
      }]
    };
  }
);

server.tool(
  "cleanup_task",
  { task_id: z.string() },
  async ({ task_id }) => {
    const safeTaskId = sanitizeTaskId(task_id);
    const jf = jobFile(safeTaskId);
    if (!exists(jf)) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ ok: false, error: "job not found", task_id: safeTaskId }, null, 2)
        }]
      };
    }
    const job = readJson(jf);
    const agents = ["codex", "gemini"];
    const cleaned = [];
    for (const agent of agents) {
      const wtPath = worktreePath(safeTaskId, agent);
      if (fs.existsSync(wtPath)) {
        cleaned.push(await removeWorktree(job.cwd, safeTaskId, agent));
      }
      safeUnlink(resultFile(safeTaskId, agent));
      safeUnlink(scoreFile(safeTaskId, agent));
      safeUnlink(bundleFile(safeTaskId, agent));
      const pd = patchDir(safeTaskId, agent);
      if (fs.existsSync(pd)) {
        fs.rmSync(pd, { recursive: true, force: true });
      }
    }
    safeUnlink(resultFile(safeTaskId));
    safeUnlink(taskEventFile(safeTaskId));
    safeUnlink(jf);
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, task_id: safeTaskId, cleaned, files_removed: true }, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

async function gracefulShutdown() {
  try {
    await server.close();
  } catch {}
  process.exit(0);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
