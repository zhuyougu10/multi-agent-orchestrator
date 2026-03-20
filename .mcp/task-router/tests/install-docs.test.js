import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, "..", "..", "..");

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("remote install scripts do not mention removed watch task group tools", () => {
  const installPs1 = readRepoFile("install.ps1");
  const installSh = readRepoFile("install.sh");

  assert.doesNotMatch(installPs1, /watch_task_group/);
  assert.doesNotMatch(installSh, /watch_task_group/);
  assert.match(installPs1, /watch-ui\.js/);
  assert.match(installSh, /watch-ui\.js/);
});

test("README install section describes watch-ui as the watch entry", () => {
  const readme = readRepoFile("README.md");

  assert.match(readme, /watch-ui\.js/);
  assert.doesNotMatch(readme, /watch_task_group\s*\|/);
  assert.doesNotMatch(readme, /watch_task_group_blocking\s*\|/);
});
