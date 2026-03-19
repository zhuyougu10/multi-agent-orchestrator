import test from "node:test";
import assert from "node:assert/strict";

import { listScopedFiles, matchesFilesScope, matchesScopePattern } from "../lib/files-scope.js";

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

test("matchesScopePattern matches exact file paths", () => {
  assert.equal(matchesScopePattern("src/index.js", "src/index.js"), true);
  assert.equal(matchesScopePattern("src/index.js", "src/index.ts"), false);
});

test("matchesScopePattern matches directory prefix without glob", () => {
  assert.equal(matchesScopePattern("src", "src/index.js"), true);
  assert.equal(matchesScopePattern("src", "test/index.js"), false);
});

test("matchesScopePattern handles Windows backslashes", () => {
  assert.equal(matchesScopePattern("src\\lib", "src/lib/util.js"), true);
  assert.equal(matchesScopePattern("src/**/*.js", "src\\lib\\util.js"), true);
});

test("matchesScopePattern supports ? single-char wildcard", () => {
  assert.equal(matchesScopePattern("src/?.js", "src/a.js"), true);
  assert.equal(matchesScopePattern("src/?.js", "src/ab.js"), false);
});

test("matchesScopePattern handles deep ** patterns", () => {
  assert.equal(matchesScopePattern("src/**/test/**/*.js", "src/lib/test/foo/bar.js"), true);
  assert.equal(matchesScopePattern("src/**/test/**/*.js", "src/test/bar.js"), true);
  assert.equal(matchesScopePattern("src/**/test/**/*.js", "src/test/nested/deep/bar.js"), true);
  assert.equal(matchesScopePattern("src/**/test/**/*.js", "other/test/bar.js"), false);
});

test("matchesScopePattern handles trailing ** as match-all", () => {
  assert.equal(matchesScopePattern("src/**", "src/anything/here.js"), true);
  assert.equal(matchesScopePattern("src/**", "src/deep/nested/file.ts"), true);
});

test("matchesScopePattern returns false for empty pattern", () => {
  assert.equal(matchesScopePattern("", "src/index.js"), false);
});

test("matchesFilesScope returns false for empty scope array", () => {
  assert.equal(matchesFilesScope([], "src/index.js"), false);
});

test("matchesScopePattern handles trailing slashes in patterns", () => {
  assert.equal(matchesScopePattern("src/", "src/index.js"), true);
  assert.equal(matchesScopePattern("src///", "src/index.js"), true);
});

test("matchesScopePattern handles leading ./ in paths", () => {
  assert.equal(matchesScopePattern("./src/**/*.js", "src/lib/util.js"), true);
  assert.equal(matchesScopePattern("src/**/*.js", "./src/lib/util.js"), true);
});
