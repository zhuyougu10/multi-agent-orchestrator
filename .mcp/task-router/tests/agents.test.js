import test from "node:test";
import assert from "node:assert/strict";

import { AGENT_SCHEMA, PREFERRED_AGENT_SCHEMA, chooseAgent } from "../lib/agents.js";

test("chooseAgent rejects unsupported preferred agent", () => {
  assert.throws(() => chooseAgent("implementation", "claude"), /Invalid enum value/);
});

test("chooseAgent keeps explicit supported preferred agent", () => {
  assert.equal(chooseAgent("docs", "codex"), "codex");
});

test("chooseAgent falls back to task-type routing for auto", () => {
  assert.equal(chooseAgent("docs", "auto"), "gemini");
  assert.equal(chooseAgent("implementation", "auto"), "codex");
});

test("agent schemas only allow supported values", () => {
  assert.equal(AGENT_SCHEMA.parse("codex"), "codex");
  assert.equal(PREFERRED_AGENT_SCHEMA.parse("auto"), "auto");
  assert.throws(() => AGENT_SCHEMA.parse(""), /Invalid enum value/);
  assert.throws(() => PREFERRED_AGENT_SCHEMA.parse("claude"), /Invalid enum value/);
});
