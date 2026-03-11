import test from "node:test";
import assert from "node:assert/strict";

import { selectCollectedPayload } from "../lib/result-collection.js";

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
