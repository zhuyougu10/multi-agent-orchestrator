import { extractJsonObject, scoreRunStatus, validateOutputShape } from "./result-utils.js";
import { matchesFilesScope } from "./files-scope.js";
import { validateConstraints } from "./constraints.js";

export function scopeSignals(filesScope, diffNames = []) {
  if (!Array.isArray(filesScope) || filesScope.length === 0) {
    return { ok: true, out_of_scope_files: [] };
  }
  const out = diffNames.filter((file) => !matchesFilesScope(filesScope, file));
  return {
    ok: out.length === 0,
    out_of_scope_files: out
  };
}

export function computeScore({ result, outputSchema, filesScope, constraints }) {
  let score = 100;
  const notes = [];
  const parsed = extractJsonObject(result.stdout || "");
  const runStatus = scoreRunStatus(result, parsed.ok);

  score -= runStatus.penalty;
  notes.push(...runStatus.notes);
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

  const constraintResult = validateConstraints(constraints, {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    diffNames: result.artifacts?.git_diff_names || []
  });
  if (!constraintResult.ok) {
    score -= 10;
    notes.push(`constraints violated: ${constraintResult.violated.join("; ")}`);
  }

  return {
    score: Math.max(0, score),
    notes,
    parsed_json_ok: parsed.ok,
    schema_ok: shape.ok,
    scope_ok: scope.ok,
    out_of_scope_files: scope.out_of_scope_files || [],
    constraints_ok: constraintResult.ok,
    constraints_violated: constraintResult.violated
  };
}

export function buildEarlyFailureResult({ taskId, agent, cwd, executionContext, stderrMessage, nowIso }) {
  const timestamp = typeof nowIso === "function" ? nowIso() : new Date().toISOString();
  return {
    ok: false,
    task_id: taskId,
    agent,
    cwd,
    execution_mode: executionContext.mode || "unknown",
    worktree_path: executionContext.path || "",
    worktree_branch: executionContext.branch || "",
    exit_code: 1,
    timed_out: false,
    idle_terminated: false,
    started_at: timestamp,
    finished_at: timestamp,
    stdout: "",
    stderr: stderrMessage,
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
}
