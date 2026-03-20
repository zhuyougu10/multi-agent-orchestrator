import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.join(__dirname, "..", "server.js");

test("server keeps subscribe_task_events but removes watch task group tools", () => {
  const source = fs.readFileSync(serverPath, "utf8");

  assert.match(source, /"subscribe_task_events"/);
  assert.doesNotMatch(source, /"watch_task_group"/);
  assert.doesNotMatch(source, /"watch_task_group_blocking"/);
});
