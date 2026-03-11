import test from "node:test";
import assert from "node:assert/strict";

import { execCmd } from "../lib/process.js";

test("execCmd can stop idle process after stdout", async () => {
  const res = await execCmd(
    "node",
    [
      "-e",
      "process.stdout.write('{\\\"ok\\\":true}'); setInterval(() => {}, 1000);"
    ],
    process.cwd(),
    {},
    { shell: false, idleTimeoutMs: 100 }
  );

  assert.equal(res.idle_terminated, true);
  assert.equal(res.stdout, '{"ok":true}');
  assert.equal(res.timed_out, false);
});

test("execCmd forwards stdout chunks to callback", async () => {
  const chunks = [];

  const res = await execCmd(
    "node",
    [
      "-e",
      "process.stdout.write('alpha'); process.stdout.write('beta');"
    ],
    process.cwd(),
    {},
    {
      shell: false,
      onStdout: (chunk) => chunks.push(chunk.toString())
    }
  );

  assert.equal(res.stdout, "alphabeta");
  assert.deepEqual(chunks, ["alpha", "beta"]);
});

test("execCmd forwards stderr chunks to callback", async () => {
  const chunks = [];

  const res = await execCmd(
    "node",
    [
      "-e",
      "process.stderr.write('warn'); process.stderr.write('ing');"
    ],
    process.cwd(),
    {},
    {
      shell: false,
      onStderr: (chunk) => chunks.push(chunk.toString())
    }
  );

  assert.equal(res.stderr, "warning");
  assert.deepEqual(chunks, ["warn", "ing"]);
});
