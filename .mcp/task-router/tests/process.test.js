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
  assert.equal(chunks.join(""), "alphabeta");
  assert.ok(chunks.length >= 1);
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
  assert.equal(chunks.join(""), "warning");
  assert.ok(chunks.length >= 1);
});

test("execCmd reports hard timeout with timed_out flag", async () => {
  const res = await execCmd(
    "node",
    ["-e", "setInterval(() => process.stdout.write('.'), 50);"],
    process.cwd(),
    {},
    { shell: false, timeoutMs: 200 }
  );

  assert.equal(res.timed_out, true);
  assert.equal(res.code, null);
});

test("execCmd truncates output exceeding maxOutputBytes", async () => {
  const res = await execCmd(
    "node",
    ["-e", "process.stdout.write('A'.repeat(500));"],
    process.cwd(),
    {},
    { shell: false, maxOutputBytes: 100 }
  );

  assert.ok(res.stdout.length <= 120);
  assert.ok(res.stdout.includes("[truncated]"));
});

test("execCmd forwards stdin to child process", async () => {
  const res = await execCmd(
    "node",
    ["-e", "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>process.stdout.write(d));"],
    process.cwd(),
    {},
    { shell: false, stdin: "hello-stdin" }
  );

  assert.equal(res.stdout, "hello-stdin");
  assert.equal(res.code, 0);
});

test("execCmd returns non-zero exit code", async () => {
  const res = await execCmd(
    "node",
    ["-e", "process.exit(42);"],
    process.cwd(),
    {},
    { shell: false }
  );

  assert.equal(res.code, 42);
  assert.equal(res.timed_out, false);
});
