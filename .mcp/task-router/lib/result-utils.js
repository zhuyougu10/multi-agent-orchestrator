export function extractJsonObject(text) {
  const source = typeof text === "string" ? text.trim() : "";
  if (!source) {
    return { ok: false, value: null };
  }

  try {
    return { ok: true, value: JSON.parse(source) };
  } catch {
    // Fall through to more forgiving extraction.
  }

  const fencedBlocks = [...source.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (let i = fencedBlocks.length - 1; i >= 0; i -= 1) {
    const candidate = fencedBlocks[i][1]?.trim();
    if (!candidate) continue;
    try {
      return { ok: true, value: JSON.parse(candidate) };
    } catch {
      // Keep trying earlier blocks.
    }
  }

  const objectStart = source.indexOf("{");
  const objectEnd = source.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
    const candidate = source.slice(objectStart, objectEnd + 1);
    try {
      return { ok: true, value: JSON.parse(candidate) };
    } catch {
      // No parseable JSON object found.
    }
  }

  return { ok: false, value: null };
}

export function normalizeStructuredStdout(text) {
  const raw = typeof text === "string" ? text : "";
  const parsed = extractJsonObject(raw);

  if (!parsed.ok) {
    return {
      parsed_json_ok: false,
      stdout: raw,
      raw_stdout: raw,
      parsed_value: null
    };
  }

  return {
    parsed_json_ok: true,
    stdout: JSON.stringify(parsed.value, null, 2),
    raw_stdout: raw,
    parsed_value: parsed.value
  };
}

export function detectEvidenceConflicts(parsedValue, tests) {
  if (!parsedValue || typeof parsedValue !== "object" || !tests?.attempted) {
    return [];
  }

  const failures = Array.isArray(parsedValue.failures) ? parsedValue.failures : [];
  const testResults = Array.isArray(parsedValue.test_results) ? parsedValue.test_results : [];
  const resultMentionsFailure = testResults.some((entry) => /(^|\b)fail/i.test(String(entry)));

  if (tests.exit_code === 0 && (failures.length > 0 || resultMentionsFailure)) {
    return ["parsed output reports failures but router-owned tests passed"];
  }

  if (tests.exit_code !== 0 && failures.length === 0 && !resultMentionsFailure) {
    return ["router-owned tests failed but parsed output does not report failures"];
  }

  return [];
}

export function shouldCommitWorktree(executionMode, artifacts) {
  if (executionMode !== "worktree") {
    return false;
  }

  return Boolean(artifacts?.git_status?.trim());
}

export function isRunSuccessful(run, parsedJsonOk = false) {
  return (!run.timed_out && run.code === 0) || (!run.timed_out && run.idle_terminated && parsedJsonOk);
}

export function isTaskSuccessful(run, tests, parsedJsonOk = false) {
  const runOk = isRunSuccessful(run, parsedJsonOk);
  if (!runOk) {
    return false;
  }

  if (tests?.attempted) {
    return tests.exit_code === 0 && !tests.timed_out;
  }

  return true;
}
