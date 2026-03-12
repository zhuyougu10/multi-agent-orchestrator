import test from "node:test";
import assert from "node:assert/strict";

import { listScopedFiles, matchesFilesScope } from "../lib/files-scope.js";

test("matchesFilesScope supports glob patterns", () => {
  assert.equal(matchesFilesScope(["src/**/*.js"], "src/lib/util.js"), true);
  assert.equal(matchesFilesScope(["src/**/*.js"], "src/lib/util.ts"), false);
  assert.equal(matchesFilesScope(["docs/*.md"], "docs/readme.md"), true);
  assert.equal(matchesFilesScope(["docs/*.md"], "docs/nested/readme.md"), false);
});

test("listScopedFiles expands glob patterns to matching files", () => {
  const files = [
    "README.md",
    "src/index.js",
    "src/lib/util.js",
    "src/lib/util.ts",
    "docs/guide.md"
  ];

  const scoped = listScopedFiles(["src/**/*.js", "README.md"], files);

  assert.deepEqual(scoped, ["README.md", "src/index.js", "src/lib/util.js"]);
});
