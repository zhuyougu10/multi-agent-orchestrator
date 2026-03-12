import test from "node:test";
import assert from "node:assert/strict";

import { resolveCollectedAgent, selectCollectedPayload } from "../lib/result-collection.js";

test("selectCollectedPayload prefers bundle data when present", () => {
  const selected = selectCollectedPayload({ ok: true, source: "bundle" }, { ok: false, source: "result" });

  assert.deepEqual(selected, { ok: true, source: "bundle" });
});

test("selectCollectedPayload falls back to result data when bundle is missing", () => {
  const selected = selectCollectedPayload(null, { ok: false, source: "result" });

  assert.deepEqual(selected, { ok: false, source: "result" });
});

test("selectCollectedPayload returns null when nothing exists", () => {
  const selected = selectCollectedPayload(null, null);

  assert.equal(selected, null);
});

test("selectCollectedPayload falls back to index data when no concrete result exists", () => {
  const selected = selectCollectedPayload(null, null, { status: "running", selected_agent: "codex" });

  assert.deepEqual(selected, { status: "running", selected_agent: "codex" });
});

test("resolveCollectedAgent prefers explicit agent", () => {
  assert.equal(resolveCollectedAgent("gemini", { selected_agent: "codex" }), "gemini");
});

test("resolveCollectedAgent falls back to selected agent from index", () => {
  assert.equal(resolveCollectedAgent(undefined, { selected_agent: "codex" }), "codex");
});
