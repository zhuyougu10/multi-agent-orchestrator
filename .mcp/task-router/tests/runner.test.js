import test from "node:test";
import assert from "node:assert/strict";

import { buildArgs } from "../runner.js";

const isWindows = process.platform === "win32";

test("buildArgs returns correct platform-specific command for codex", () => {
  const result = buildArgs("codex", "test prompt");

  assert.equal(result.command, isWindows ? "powershell" : "/bin/sh");
  assert.equal(result.stdin, "test prompt");
  assert.ok(result.args.at(-1).includes("codex exec"));
  assert.ok(result.args.at(-1).includes("--skip-git-repo-check"));
});

test("buildArgs returns correct platform-specific command for gemini", () => {
  const result = buildArgs("gemini", "test prompt");

  assert.equal(result.command, isWindows ? "powershell" : "/bin/sh");
  assert.equal(result.stdin, "test prompt");
  assert.ok(result.args.at(-1).includes("gemini"));
  assert.ok(result.args.at(-1).includes("--output-format text"));
});

test("buildArgs throws for unsupported agent", () => {
  assert.throws(
    () => buildArgs("unknown", "test"),
    /Unsupported agent: unknown/
  );
});

test("buildArgs uses powershell on Windows and sh on Unix", () => {
  const result = buildArgs("codex", "test");

  if (isWindows) {
    assert.equal(result.command, "powershell");
    assert.ok(result.args.includes("-NoProfile"));
    assert.ok(result.args.includes("-Command"));
  } else {
    assert.equal(result.command, "/bin/sh");
    assert.ok(result.args.includes("-c"));
  }
});
