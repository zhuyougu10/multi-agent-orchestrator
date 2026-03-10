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
