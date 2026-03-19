export function buildPrepareMergePayload({ taskId, agent, strategy, bundle, patch = null, diffStat = null }) {
  if (strategy === "patch") {
    if (!bundle?.result?.worktree_path) {
      return {
        ok: false,
        error: "worktree path missing",
        task_id: taskId,
        agent
      };
    }

    return {
      ok: patch?.ok ?? false,
      task_id: taskId,
      agent,
      strategy,
      patch_file: patch?.patch_file,
      diff_stat: diffStat || bundle?.result?.artifacts?.git_diff_stat || "",
      files_changed: bundle?.result?.artifacts?.git_diff_names || [],
      stdout: patch?.stdout || "",
      stderr: patch?.stderr || ""
    };
  }

  return {
    ok: true,
    task_id: taskId,
    agent,
    strategy,
    commit_sha: bundle?.result?.commit?.head_sha || "",
    diff_stat: diffStat || bundle?.result?.artifacts?.git_diff_stat || "",
    files_changed: bundle?.result?.artifacts?.git_diff_names || []
  };
}

export function buildCherryPickMergePayload({ taskId, agent, bundle, picked = null }) {
  const sha = bundle?.result?.commit?.head_sha;
  if (!sha) {
    return {
      ok: false,
      error: "missing commit sha",
      task_id: taskId,
      agent
    };
  }

  return {
    ok: picked.code === 0 && !picked.timed_out,
    strategy: "cherry-pick",
    task_id: taskId,
    agent,
    commit_sha: sha,
    timed_out: picked.timed_out,
    stdout: picked.stdout,
    stderr: picked.stderr
  };
}

export function buildPatchMergePayload({ taskId, agent, patchFile, check, apply3 = null, apply = null }) {
  if (check.code !== 0) {
    if (apply3?.code === 0) {
      return {
        ok: true,
        strategy: "patch",
        task_id: taskId,
        agent,
        patch_file: patchFile,
        mode: "three-way-fallback",
        stdout: apply3.stdout,
        stderr: apply3.stderr,
        initial_apply_check_stderr: check.stderr
      };
    }

    return {
      ok: false,
      strategy: "patch",
      task_id: taskId,
      agent,
      stage: "apply-check",
      stdout: check.stdout,
      stderr: check.stderr,
      fallback_stdout: apply3?.stdout || "",
      fallback_stderr: apply3?.stderr || ""
    };
  }

  return {
    ok: apply.code === 0 && !apply.timed_out,
    strategy: "patch",
    task_id: taskId,
    agent,
    patch_file: patchFile,
    timed_out: apply.timed_out,
    stdout: apply.stdout,
    stderr: apply.stderr
  };
}
