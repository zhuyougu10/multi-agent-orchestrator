function buildExpectedFiles(taskId, mode, selectedAgent, paths, alternateAgent) {
  if (mode === "single") {
    return {
      result_files: [paths.resultFile(taskId, selectedAgent)],
      bundle_files: [paths.bundleFile(taskId, selectedAgent)]
    };
  }

  if (mode === "fallback") {
    const backup = alternateAgent(selectedAgent);
    return {
      result_files: [paths.resultFile(taskId, selectedAgent), paths.resultFile(taskId, backup)],
      bundle_files: [paths.bundleFile(taskId, selectedAgent), paths.bundleFile(taskId, backup)]
    };
  }

  return {
    result_files: [paths.resultFile(taskId, "codex"), paths.resultFile(taskId, "gemini")],
    bundle_files: [paths.bundleFile(taskId, "codex"), paths.bundleFile(taskId, "gemini")]
  };
}

function preserveTerminalOverride(payload, readResultIndex) {
  if (typeof readResultIndex !== "function") {
    return payload;
  }

  const current = readResultIndex();
  if (current?.status === "cancelled") {
    return {
      ...payload,
      ok: false,
      status: "cancelled",
      cancelled_at: current.cancelled_at
    };
  }

  return payload;
}

export function launchDispatch({ job, selectedAgent, mode, runners, writeResultIndex, readResultIndex, paths, alternateAgent }) {
  const expectedFiles = buildExpectedFiles(job.task_id, mode, selectedAgent, paths, alternateAgent);
  const pending = {
    ok: true,
    task_id: job.task_id,
    selected_agent: selectedAgent,
    mode,
    status: "running",
    ...expectedFiles
  };

  writeResultIndex(pending);

  queueMicrotask(async () => {
    try {
      let payload;
      if (mode === "single") {
        const result = await runners.runSingle(job, selectedAgent);
        payload = {
          ok: result.ok,
          task_id: job.task_id,
          selected_agent: selectedAgent,
          mode,
          status: "completed",
          result_files: [paths.resultFile(job.task_id, selectedAgent)],
          bundle_files: [paths.bundleFile(job.task_id, selectedAgent)]
        };
      } else if (mode === "fallback") {
        const outcome = await runners.runFallback(job, selectedAgent);
        payload = {
          ok: outcome.ok,
          task_id: job.task_id,
          selected_agent: outcome.selected_agent,
          mode,
          status: "completed",
          result_files: outcome.results.map((r) => paths.resultFile(job.task_id, r.agent)),
          bundle_files: outcome.results.map((r) => paths.bundleFile(job.task_id, r.agent))
        };
      } else {
        const outcome = await runners.runRace(job);
        payload = {
          ok: outcome.ok,
          task_id: job.task_id,
          selected_agent: outcome.selected_agent,
          mode,
          status: "completed",
          scores: outcome.scores,
          result_files: [paths.resultFile(job.task_id, "codex"), paths.resultFile(job.task_id, "gemini")],
          bundle_files: [paths.bundleFile(job.task_id, "codex"), paths.bundleFile(job.task_id, "gemini")]
        };
      }

      writeResultIndex(preserveTerminalOverride(payload, readResultIndex));
    } catch (error) {
      try {
        writeResultIndex({
          ok: false,
          task_id: job.task_id,
          selected_agent: selectedAgent,
          mode,
          status: "failed",
          error: error?.message || String(error),
          ...expectedFiles
        });
      } catch {}
    }
  });

  return pending;
}
