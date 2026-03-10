import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { launchDispatch } from "./dispatch.js";
import { resolveExecutionContext } from "./runtime.js";
import { buildArgs } from "./runner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORK_ROOT = path.join(__dirname, "work");
const JOB_ROOT = path.join(WORK_ROOT, "jobs");
const RESULT_ROOT = path.join(WORK_ROOT, "results");
const SCORE_ROOT = path.join(WORK_ROOT, "scores");
const BUNDLE_ROOT = path.join(WORK_ROOT, "bundles");
const WT_ROOT = path.join(WORK_ROOT, "worktrees");
const PATCH_ROOT = path.join(WORK_ROOT, "patches");

for (const dir of [WORK_ROOT, JOB_ROOT, RESULT_ROOT, SCORE_ROOT, BUNDLE_ROOT, WT_ROOT, PATCH_ROOT]) {
  fs.mkdirSync(dir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function exists(file) {
  return fs.existsSync(file);
}

function jobFile(taskId) {
  return path.join(JOB_ROOT, `${taskId}.json`);
}

function resultFile(taskId, agent = null) {
  return agent
    ? path.join(RESULT_ROOT, `${taskId}.${agent}.json`)
    : path.join(RESULT_ROOT, `${taskId}.json`);
}

function scoreFile(taskId, agent) {
  return path.join(SCORE_ROOT, `${taskId}.${agent}.json`);
}

function bundleFile(taskId, agent) {
  return path.join(BUNDLE_ROOT, `${taskId}.${agent}.json`);
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

function execCmd(command, args, cwd, extraEnv = {}, options = {}) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(command, args, {
      cwd,
      shell: options.shell ?? true,
      windowsHide: true,
      env: { ...process.env, ...extraEnv }
    });
    if (options.stdin) {
      child.stdin.write(options.stdin);
      child.stdin.end();
    }
    child.on("error", (err) => {
      stderr += `${err?.message || String(err)}\n`;
    });
    child.stdout.on("data", (buf) => (stdout += buf.toString()));
    child.stderr.on("data", (buf) => (stderr += buf.toString()));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function worktreeBranch(taskId, agent) {
  return `agent/${taskId}-${agent}`;
}

function worktreePath(taskId, agent) {
  return path.join(WT_ROOT, `${taskId}-${agent}`);
}

async function createWorktree(repoRoot, taskId, agent) {
  const branch = worktreeBranch(taskId, agent);
  const wtPath = worktreePath(taskId, agent);
  if (fs.existsSync(wtPath)) {
    await execCmd("git", ["worktree", "remove", "--force", wtPath], repoRoot);
  }
  await execCmd("git", ["branch", "-D", branch], repoRoot);
  const created = await execCmd("git", ["worktree", "add", "-b", branch, wtPath], repoRoot);
  return {
    branch,
    path: wtPath,
    created_ok: created.code === 0,
    stdout: created.stdout,
    stderr: created.stderr
  };
}

async function removeWorktree(repoRoot, taskId, agent) {
  const branch = worktreeBranch(taskId, agent);
  const wtPath = worktreePath(taskId, agent);
  const removed = await execCmd("git", ["worktree", "remove", "--force", wtPath], repoRoot);
  await execCmd("git", ["branch", "-D", branch], repoRoot);
  return {
    removed_ok: removed.code === 0,
    path: wtPath,
    branch
  };
}

async function captureGitArtifacts(wtPath) {
  const status = await execCmd("git", ["status", "--short"], wtPath);
  const diffStat = await execCmd("git", ["diff", "--stat"], wtPath);
  const diff = await execCmd("git", ["diff"], wtPath);
  return {
    git_status: status.stdout,
    git_diff_stat: diffStat.stdout,
    git_diff: diff.stdout
  };
}

async function runTests(wtPath, testCommand) {
  if (!testCommand || !testCommand.trim()) {
    return { skipped: true, exit_code: null, stdout: "", stderr: "" };
  }
  const run = await execCmd("powershell", ["-NoProfile", "-Command", testCommand], wtPath);
  return { skipped: false, exit_code: run.code, stdout: run.stdout, stderr: run.stderr };
}

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: null };
  }
}

function validateOutputShape(parsed, outputSchema) {
  if (!outputSchema || typeof outputSchema !== "object") {
    return { ok: true, missing: [] };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, missing: Object.keys(outputSchema) };
  }
  const missing = [];
  for (const key of Object.keys(outputSchema)) {
    if (!(key in parsed)) missing.push(key);
  }
  return { ok: missing.length === 0, missing };
}

function scopeSignals(stdout, filesScope) {
  if (!Array.isArray(filesScope) || filesScope.length === 0) {
    return { scopePenalty: 0, scopeNotes: [] };
  }
  const notes = [];
  let penalty = 0;
  if (/node_modules|\.git|package-lock\.json/i.test(stdout)) {
    penalty += 10;
    notes.push("possible unrelated file changes mentioned");
  }
  return { scopePenalty: penalty, scopeNotes: notes };
}

function computeScore({ exitCode, stdout, stderr, testExitCode, outputSchema, filesScope }) {
  let score = 100;
  const notes = [];
  if (exitCode !== 0) {
    score -= 50;
    notes.push("non-zero agent exit");
  }
  if (stderr && stderr.trim()) {
    score -= 10;
    notes.push("stderr not empty");
  }
  const parsed = safeJsonParse(stdout.trim());
  if (!parsed.ok) {
    score -= 25;
    notes.push("stdout not valid JSON");
  } else {
    const shape = validateOutputShape(parsed.value, outputSchema);
    if (!shape.ok) {
      score -= 20;
      notes.push(`missing schema keys: ${shape.missing.join(", ")}`);
    }
  }
  const scope = scopeSignals(stdout, filesScope);
  score -= scope.scopePenalty;
  notes.push(...scope.scopeNotes);
  if (testExitCode !== null && testExitCode !== 0) {
    score -= 20;
    notes.push("tests failed");
  }
  if (stdout.trim().length < 20) {
    score -= 10;
    notes.push("stdout too short");
  }
  if (score < 0) score = 0;
  return { score, notes, parsed_json_ok: parsed.ok };
}

async function gitCommitAll(wtPath, message) {
  await execCmd("git", ["add", "-A"], wtPath);
  const commit = await execCmd("git", ["commit", "-m", message], wtPath, {}, { shell: false });
  return commit;
}

async function getHeadSha(wtPath) {
  const res = await execCmd("git", ["rev-parse", "HEAD"], wtPath);
  return { ok: res.code === 0, sha: res.stdout.trim(), stderr: res.stderr };
}

async function makePatch(wtPath, outputDir, filePrefix) {
  fs.mkdirSync(outputDir, { recursive: true });
  const res = await execCmd("git", ["format-patch", "-1", "HEAD", "-o", outputDir], wtPath);
  const files = fs.readdirSync(outputDir)
    .filter((f) => f.endsWith(".patch") || f.endsWith(".eml"))
    .map((f) => path.join(outputDir, f));
  return { ok: res.code === 0, stdout: res.stdout, stderr: res.stderr, patch_files: files };
}

async function applyPatchCheck(repoRoot, patchFile) {
  return execCmd("git", ["apply", "--check", patchFile], repoRoot);
}

async function applyPatch(repoRoot, patchFile) {
  return execCmd("git", ["apply", patchFile], repoRoot);
}

async function applyPatchThreeWay(repoRoot, patchFile) {
  return execCmd("git", ["apply", "--3way", patchFile], repoRoot);
}

async function cherryPickCommit(repoRoot, sha) {
  return execCmd("git", ["cherry-pick", sha], repoRoot);
}

async function abortCherryPick(repoRoot) {
  return execCmd("git", ["cherry-pick", "--abort"], repoRoot);
}

async function runInWorktree(job, agent) {
  const repoRoot = job.cwd;
  const executionContext = await resolveExecutionContext(repoRoot, job.task_id, agent, createWorktree);
  if (!executionContext.created_ok) {
    return {
      ok: false,
      task_id: job.task_id,
      agent,
      cwd: repoRoot,
      worktree: executionContext,
      exit_code: 1,
      stdout: "",
      stderr: `worktree creation failed\n${executionContext.stderr}`
    };
  }

  let built;
  try {
    built = buildArgs(agent, job.prompt);
  } catch (err) {
    return {
      ok: false,
      task_id: job.task_id,
      agent,
      cwd: repoRoot,
      worktree: executionContext,
      exit_code: 1,
      stdout: "",
      stderr: `buildArgs failed: ${err.message}`
    };
  }
  const startedAt = nowIso();
  const run = await execCmd(built.command, built.args, executionContext.path, built.env || {}, { shell: false, stdin: built.stdin });
  const tests = await runTests(executionContext.path, job.test_command || "");
  const artifacts = executionContext.mode === "worktree"
    ? await captureGitArtifacts(executionContext.path)
    : { git_status: "", git_diff_stat: "", git_diff: "" };

  const commitMessage = `agent(${job.task_id}): ${agent} result`;
  const commit = executionContext.mode === "worktree"
    ? await gitCommitAll(executionContext.path, commitMessage)
    : { code: null, stdout: "", stderr: "" };
  const head = executionContext.mode === "worktree"
    ? await getHeadSha(executionContext.path)
    : { ok: false, sha: "", stderr: "" };

  const result = {
    ok: run.code === 0,
    task_id: job.task_id,
    agent,
    cwd: repoRoot,
    execution_mode: executionContext.mode,
    worktree_path: executionContext.mode === "worktree" ? executionContext.path : "",
    worktree_branch: executionContext.mode === "worktree" ? executionContext.branch : "",
    exit_code: run.code,
    started_at: startedAt,
    finished_at: nowIso(),
    stdout: run.stdout,
    stderr: run.stderr,
    tests,
    artifacts,
    commit: {
      attempted: executionContext.mode === "worktree",
      exit_code: commit.code,
      stdout: commit.stdout,
      stderr: commit.stderr,
      head_sha: head.ok ? head.sha : ""
    }
  };

  writeJson(resultFile(job.task_id, agent), result);

  const score = computeScore({
    exitCode: result.exit_code,
    stdout: result.stdout,
    stderr: result.stderr,
    testExitCode: tests.exit_code,
    outputSchema: job.output_schema,
    filesScope: job.files_scope
  });

  const scorePayload = {
    task_id: job.task_id,
    agent,
    score: score.score,
    notes: score.notes,
    parsed_json_ok: score.parsed_json_ok
  };
  writeJson(scoreFile(job.task_id, agent), scorePayload);

  const bundle = {
    task_id: job.task_id,
    agent,
    selected: false,
    score: scorePayload,
    result
  };
  writeJson(bundleFile(job.task_id, agent), bundle);

  return result;
}

async function runSingle(job, agent) {
  return runInWorktree(job, agent);
}

async function runFallback(job, primaryAgent) {
  const first = await runSingle(job, primaryAgent);
  if (first.ok) return { selected_agent: primaryAgent, results: [first] };
  const backupAgent = alternateAgent(primaryAgent);
  const second = await runSingle(job, backupAgent);
  return {
    selected_agent: second.ok ? backupAgent : primaryAgent,
    results: [first, second]
  };
}

async function runRace(job) {
  const agents = ["codex", "gemini"];
  const results = await Promise.all(agents.map((agent) => runSingle(job, agent)));
  const scored = results.map((r) => {
    const s = computeScore({
      exitCode: r.exit_code,
      stdout: r.stdout,
      stderr: r.stderr,
      testExitCode: r.tests?.exit_code,
      outputSchema: job.output_schema,
      filesScope: job.files_scope
    });
    const payload = {
      task_id: job.task_id,
      agent: r.agent,
      score: s.score,
      notes: s.notes,
      parsed_json_ok: s.parsed_json_ok
    };
    writeJson(scoreFile(job.task_id, r.agent), payload);
    return payload;
  });
  scored.sort((a, b) => b.score - a.score);
  return { selected_agent: scored[0].agent, scores: scored, results };
}

const server = new McpServer({
  name: "task-router",
  version: "0.3.0"
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
    const chosen = chooseAgent(task_type, preferred_agent);
    const job = {
      task_id,
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
    writeJson(jobFile(task_id), job);

    const payload = launchDispatch({
      job,
      selectedAgent: chosen,
      mode,
      runners: {
        runSingle,
        runFallback,
        runRace
      },
      writeResultIndex: (resultPayload) => writeJson(resultFile(task_id), resultPayload),
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
    const file = agent ? bundleFile(task_id, agent) : resultFile(task_id);
    if (!exists(file)) {
      return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "result not found", task_id, agent }, null, 2) }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(readJson(file), null, 2) }] };
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
    const file = resultFile(task_id, agent);
    if (!exists(file)) {
      return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "result not found", task_id, agent }, null, 2) }] };
    }
    const result = readJson(file);
    const score = computeScore({
      exitCode: result.exit_code,
      stdout: result.stdout,
      stderr: result.stderr,
      testExitCode: result.tests?.exit_code,
      outputSchema: output_schema,
      filesScope: files_scope
    });
    const payload = { task_id, agent, score: score.score, notes: score.notes, parsed_json_ok: score.parsed_json_ok };
    writeJson(scoreFile(task_id, agent), payload);
    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
  }
);

server.tool(
  "retry_task",
  { task_id: z.string(), issue: z.string(), preferred_agent: z.string().default("auto") },
  async ({ task_id, issue, preferred_agent }) => {
    const jf = jobFile(task_id);
    if (!exists(jf)) {
      return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "job not found", task_id }, null, 2) }] };
    }
    const job = readJson(jf);
    const agent = chooseAgent(job.task_type, preferred_agent);
    const retryPrompt = `${job.prompt}\n\nRepair instructions:\n${issue}\n\nReturn valid JSON only and stay within declared scope.`;
    const result = await runInWorktree({ ...job, prompt: retryPrompt }, agent);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ok: result.ok,
          task_id,
          selected_agent: agent,
          result_file: resultFile(task_id, agent)
        }, null, 2)
      }]
    };
  }
);

server.tool("list_jobs", {}, async () => {
  const jobs = exists(JOB_ROOT) ? fs.readdirSync(JOB_ROOT).filter((x) => x.endsWith(".json")) : [];
  return { content: [{ type: "text", text: JSON.stringify({ jobs }, null, 2) }] };
});

server.tool(
  "prepare_merge",
  {
    task_id: z.string(),
    agent: z.string(),
    strategy: z.enum(["patch", "cherry-pick", "manual-review"]).default("patch")
  },
  async ({ task_id, agent, strategy }) => {
    const bf = bundleFile(task_id, agent);
    if (!exists(bf)) {
      return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "bundle not found" }, null, 2) }] };
    }
    const bundle = readJson(bf);
    const sha = bundle.result?.commit?.head_sha || "";
    const repoRoot = bundle.result.cwd;
    const wtPath = bundle.result.worktree_path;
    let patch = null;
    if (strategy === "patch") {
      patch = await makePatch(wtPath, path.join(PATCH_ROOT, task_id, agent), `${task_id}-${agent}`);
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ok: true,
          task_id,
          agent,
          strategy,
          commit_sha: sha,
          diff_stat: bundle.result?.artifacts?.git_diff_stat || "",
          patch_files: patch?.patch_files || []
        }, null, 2)
      }]
    };
  }
);

server.tool(
  "merge_winner",
  {
    task_id: z.string(),
    agent: z.string(),
    strategy: z.enum(["patch", "cherry-pick"])
  },
  async ({ task_id, agent, strategy }) => {
    const bf = bundleFile(task_id, agent);
    if (!exists(bf)) {
      return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "bundle not found" }, null, 2) }] };
    }
    const bundle = readJson(bf);
    const repoRoot = bundle.result.cwd;
    const sha = bundle.result?.commit?.head_sha || "";

    if (strategy === "cherry-pick") {
      const cp = await cherryPickCommit(repoRoot, sha);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: cp.code === 0,
            strategy,
            task_id,
            agent,
            commit_sha: sha,
            stdout: cp.stdout,
            stderr: cp.stderr
          }, null, 2)
        }]
      };
    }

    const patchDir = path.join(PATCH_ROOT, task_id, agent);
    const patch = await makePatch(bundle.result.worktree_path, patchDir, `${task_id}-${agent}`);
    const firstPatch = patch.patch_files?.[0];
    if (!firstPatch) {
      return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "patch not created" }, null, 2) }] };
    }

    const check = await applyPatchCheck(repoRoot, firstPatch);
    if (check.code !== 0) {
      const apply3 = await applyPatchThreeWay(repoRoot, firstPatch);
      if (apply3.code === 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: true,
              strategy,
              task_id,
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
            task_id,
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

    const apply = await applyPatch(repoRoot, firstPatch);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ok: apply.code === 0,
          strategy,
          task_id,
          agent,
          patch_file: firstPatch,
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
          ok: aborted.code === 0,
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
    const jf = jobFile(task_id);
    if (!exists(jf)) {
      return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "job not found", task_id }, null, 2) }] };
    }
    const job = readJson(jf);
    const agents = ["codex", "gemini"];
    const cleaned = [];
    for (const agent of agents) {
      const wtPath = worktreePath(task_id, agent);
      if (fs.existsSync(wtPath)) {
        cleaned.push(await removeWorktree(job.cwd, task_id, agent));
      }
    }
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, task_id, cleaned }, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
