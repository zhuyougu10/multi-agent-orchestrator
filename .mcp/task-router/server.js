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
  resultFile,
  scoreFile,
  bundleFile,
  worktreePath,
  worktreeBranch,
  patchDir
} from "./lib/paths.js";
import { exists, readJson, writeJsonAtomic } from "./lib/storage.js";
import { execCmd } from "./lib/process.js";
import {
  detectEvidenceConflicts,
  extractJsonObject,
  isRunSuccessful,
  isTaskSuccessful,
  normalizeStructuredStdout,
  scoreRunStatus,
  shouldCommitWorktree
} from "./lib/result-utils.js";
import { sanitizeTaskId } from "./lib/validation.js";
import { createTaskEventHub } from "./lib/task-events.js";

ensureDirs();

const HEARTBEAT_INTERVAL_MS = 5000;
const taskEventHub = createTaskEventHub();

function nowIso() {
  return new Date().toISOString();
}

function publishTaskEvent(taskId, agent, eventType, details = {}) {
  taskEventHub.publish({
    task_id: taskId,
    agent,
    event_type: eventType,
    timestamp: nowIso(),
    ...details
  });
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

function chooseAgent(taskType, preferredAgent) {
  if (preferredAgent && preferredAgent !== "auto") return preferredAgent;
  const codexTypes = ["implementation", "refactor", "tests", "bugfix", "script"];
  const geminiTypes = ["docs", "summarization", "comparison", "ux-copy"];
  if (codexTypes.includes(taskType)) return "codex";
  if (geminiTypes.includes(taskType)) return "gemini";
  return "codex";
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

async function gitCommitAll(cwd, message) {
  await execCmd("git", ["add", "-A"], cwd, {}, { shell: true });
  return execCmd("git", ["commit", "-m", message], cwd, {}, { shell: true });
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

function validateOutputShape(parsed, outputSchema) {
  if (!outputSchema || typeof outputSchema !== "object") {
    return { ok: true, notes: [] };
  }
  const notes = [];
  for (const key of Object.keys(outputSchema)) {
    if (!(key in parsed)) {
      notes.push(`missing field: ${key}`);
    }
  }
  return {
    ok: notes.length === 0,
    notes
  };
}

function scopeSignals(filesScope, diffNames = []) {
  if (!Array.isArray(filesScope) || filesScope.length === 0) {
    return { ok: true, out_of_scope_files: [] };
  }
  const out = diffNames.filter((file) => !filesScope.some((prefix) => file.startsWith(prefix)));
  return {
    ok: out.length === 0,
    out_of_scope_files: out
  };
}

function computeScore({ result, outputSchema, filesScope }) {
  let score = 100;
  const notes = [];
  const parsed = tryParseJson(result.stdout || "");
  const runStatus = scoreRunStatus(result, parsed.ok);

  score -= runStatus.penalty;
  notes.push(...runStatus.notes);
  if (result.timed_out) {
    score -= 40;
    notes.push("command timed out");
  }
  if (result.tests?.attempted && result.tests.exit_code !== 0) {
    score -= 20;
    notes.push("tests failed");
  }
  if (result.stderr?.trim()) {
    score -= 10;
    notes.push("stderr not empty");
  }

  if (!parsed.ok) {
    score -= 20;
    notes.push("stdout is not valid JSON");
  }

  const shape = parsed.ok
    ? validateOutputShape(parsed.value, outputSchema)
    : { ok: false, notes: [] };
  if (!shape.ok) {
    score -= 20;
    notes.push(...shape.notes);
  }

  const scope = scopeSignals(filesScope, result.artifacts?.git_diff_names || []);
  if (!scope.ok) {
    score -= 15;
    notes.push(`out of scope files: ${scope.out_of_scope_files.join(", ")}`);
  }

  return {
    score: Math.max(0, score),
    notes,
    parsed_json_ok: parsed.ok,
    schema_ok: shape.ok,
    scope_ok: scope.ok,
    out_of_scope_files: scope.out_of_scope_files || []
  };
}

async function makePatch(wtPath, taskId, agent) {
  const outDir = patchDir(taskId, agent);
  fs.mkdirSync(outDir, { recursive: true });
  const patchFile = path.join(outDir, `${taskId}.${agent}.patch`);
  const diff = await execCmd("git", ["diff", "--binary"], wtPath, {}, { shell: true });
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
    const failed = {
      ok: false,
      task_id: safeTaskId,
      agent,
      cwd: job.cwd,
      execution_mode: executionContext.mode || "unknown",
      worktree_path: executionContext.path || "",
      worktree_branch: executionContext.branch || "",
      exit_code: 1,
      timed_out: false,
      started_at: nowIso(),
      finished_at: nowIso(),
      stdout: "",
      stderr: `worktree creation failed\n${executionContext.stderr || ""}`,
      tests: {
        attempted: false,
        exit_code: null,
        stdout: "",
        stderr: ""
      },
      artifacts: {
        git_status: "",
        git_diff_stat: "",
        git_diff: "",
        git_diff_names: []
      },
      commit: {
        attempted: false,
        exit_code: null,
        stdout: "",
        stderr: "",
        head_sha: ""
      }
    };
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
    const failed = {
      ok: false,
      task_id: safeTaskId,
      agent,
      cwd: job.cwd,
      execution_mode: executionContext.mode || "unknown",
      worktree_path: executionContext.path || "",
      worktree_branch: executionContext.branch || "",
      exit_code: 1,
      timed_out: false,
      started_at: nowIso(),
      finished_at: nowIso(),
      stdout: "",
      stderr: `buildArgs failed: ${err.message}`,
      tests: {
        attempted: false,
        exit_code: null,
        stdout: "",
        stderr: ""
      },
      artifacts: {
        git_status: "",
        git_diff_stat: "",
        git_diff: "",
        git_diff_names: []
      },
      commit: {
        attempted: false,
        exit_code: null,
        stdout: "",
        stderr: "",
        head_sha: ""
      }
    };
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
  const run = await execCmd(
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
      idleTimeoutMs: 3000
    }
  );
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
    ? await gitCommitAll(executionContext.path, commitMessage)
    : { code: null, stdout: "", stderr: "", timed_out: false };

  const head = shouldCommit
    ? await getHeadSha(executionContext.path)
    : { ok: false, sha: "", stderr: "" };

  const result = {
    ok: isTaskSuccessful(run, tests, normalizedOutput.parsed_json_ok),
    task_id: safeTaskId,
    agent,
    cwd: job.cwd,
    execution_mode: executionContext.mode,
    worktree_path: executionContext.mode === "worktree" ? executionContext.path : "",
    worktree_branch: executionContext.mode === "worktree" ? executionContext.branch : "",
    exit_code: run.code,
    timed_out: run.timed_out,
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
    filesScope: job.files_scope
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
  if (first.ok) {
    return {
      ok: true,
      selected_agent: primaryAgent,
      results: [first]
    };
  }
  const secondary = alternateAgent(primaryAgent);
  const second = await runSingle(job, secondary);
  return {
    ok: [first, second].some((r) => r.ok),
    selected_agent: second.ok ? secondary : primaryAgent,
    results: [first, second]
  };
}

async function runRace(job) {
  const agents = ["codex", "gemini"];
  const results = await Promise.all(agents.map((agent) => runSingle(job, agent)));

  const scored = results.map((r) => {
    const s = computeScore({
      result: r,
      outputSchema: job.output_schema,
      filesScope: job.files_scope
    });
    const payload = {
      task_id: job.task_id,
      agent: r.agent,
      score: s.score,
      notes: s.notes,
      parsed_json_ok: s.parsed_json_ok,
      schema_ok: s.schema_ok,
      scope_ok: s.scope_ok,
      out_of_scope_files: s.out_of_scope_files
    };
    writeJsonAtomic(scoreFile(job.task_id, r.agent), payload);
    return payload;
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
    preferred_agent: z.string().default("auto"),
    mode: z.enum(["single", "fallback", "race"]).default("fallback"),
    test_command: z.string().default(""),
    output_schema: z.record(z.string()).optional()
  },
  async ({ task_id, task_type, cwd, prompt, files_scope, constraints, preferred_agent, mode, test_command, output_schema }) => {
    const safeTaskId = sanitizeTaskId(task_id);
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
  { task_id: z.string(), agent: z.string().optional() },
  async ({ task_id, agent }) => {
    const safeTaskId = sanitizeTaskId(task_id);
    const file = agent ? bundleFile(safeTaskId, agent) : resultFile(safeTaskId);
    if (!exists(file)) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ ok: false, error: "result not found", task_id: safeTaskId, agent }, null, 2)
        }]
      };
    }
    return { content: [{ type: "text", text: JSON.stringify(readJson(file), null, 2) }] };
  }
);

server.tool(
  "subscribe_task_events",
  {
    task_id: z.string(),
    agent: z.string().optional(),
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
  "score_result",
  {
    task_id: z.string(),
    agent: z.string(),
    output_schema: z.record(z.string()).optional(),
    files_scope: z.array(z.string()).default([])
  },
  async ({ task_id, agent, output_schema, files_scope }) => {
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
      filesScope: files_scope
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
  { task_id: z.string(), issue: z.string(), preferred_agent: z.string().default("auto") },
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
    const agent = chooseAgent(job.task_type, preferred_agent);
    const retryPrompt =
      `${job.prompt}\n\nRepair instructions:\n${issue}\n\nReturn valid JSON only and stay within declared scope.`;
    const result = await runInWorktree(
      { ...job, prompt: retryPrompt },
      agent
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  }
);

server.tool(
  "list_jobs",
  {},
  async () => {
    const jobsDir = path.dirname(jobFile("placeholder")).replace(/[\\/]placeholder\.json$/, "");
    const files = fs.existsSync(jobsDir)
      ? fs.readdirSync(jobsDir).filter((f) => f.endsWith(".json"))
      : [];
    const jobs = files.map((file) => {
      const full = path.join(jobsDir, file);
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
  "prepare_merge",
  {
    task_id: z.string(),
    agent: z.string(),
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
            text: JSON.stringify({ ok: false, error: "worktree path missing", task_id: safeTaskId, agent }, null, 2)
          }]
        };
      }
      const patch = await makePatch(bundle.result.worktree_path, safeTaskId, agent);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: patch.ok,
            task_id: safeTaskId,
            agent,
            strategy,
            patch_file: patch.patch_file,
            stdout: patch.stdout,
            stderr: patch.stderr
          }, null, 2)
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ok: true,
          task_id: safeTaskId,
          agent,
          strategy,
          commit_sha: bundle?.result?.commit?.head_sha || ""
        }, null, 2)
      }]
    };
  }
);

server.tool(
  "merge_winner",
  {
    cwd: z.string(),
    task_id: z.string(),
    agent: z.string(),
    strategy: z.enum(["patch", "cherry-pick"]).default("patch")
  },
  async ({ cwd, task_id, agent, strategy }) => {
    const safeTaskId = sanitizeTaskId(task_id);
    const bundle = readJson(bundleFile(safeTaskId, agent));

    if (strategy === "cherry-pick") {
      const sha = bundle?.result?.commit?.head_sha;
      if (!sha) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ ok: false, error: "missing commit sha", task_id: safeTaskId, agent }, null, 2)
          }]
        };
      }
      const picked = await execCmd("git", ["cherry-pick", sha], cwd, {}, { shell: true });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: picked.code === 0 && !picked.timed_out,
            strategy,
            task_id: safeTaskId,
            agent,
            commit_sha: sha,
            timed_out: picked.timed_out,
            stdout: picked.stdout,
            stderr: picked.stderr
          }, null, 2)
        }]
      };
    }

    const prep = await makePatch(bundle.result.worktree_path, safeTaskId, agent);
    const firstPatch = prep.patch_file;

    const check = await applyPatchCheck(cwd, firstPatch);
    if (check.code !== 0) {
      const apply3 = await applyPatchThreeWay(cwd, firstPatch);
      if (apply3.code === 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: true,
              strategy,
              task_id: safeTaskId,
              agent,
              patch_file: firstPatch,
              mode: "three-way-fallback",
              stdout: apply3.stdout,
              stderr: apply3.stderr,
              initial_apply_check_stderr: check.stderr
            }, null, 2)
          }]
        };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: false,
            strategy,
            task_id: safeTaskId,
            agent,
            stage: "apply-check",
            stdout: check.stdout,
            stderr: check.stderr,
            fallback_stdout: apply3.stdout,
            fallback_stderr: apply3.stderr
          }, null, 2)
        }]
      };
    }

    const apply = await applyPatch(cwd, firstPatch);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ok: apply.code === 0 && !apply.timed_out,
          strategy,
          task_id: safeTaskId,
          agent,
          patch_file: firstPatch,
          timed_out: apply.timed_out,
          stdout: apply.stdout,
          stderr: apply.stderr
        }, null, 2)
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
    }
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, task_id: safeTaskId, cleaned }, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
