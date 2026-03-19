import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { exists, readJson, writeJsonAtomic, appendJsonLine, safeUnlink } from "../lib/storage.js";

function tmpFile(name) {
  return path.join(os.tmpdir(), `storage-test-${Date.now()}-${name}`);
}

test("writeJsonAtomic writes and readJson reads back correctly", () => {
  const file = tmpFile("roundtrip.json");
  const data = { hello: "world", count: 42 };
  writeJsonAtomic(file, data);
  const result = readJson(file);
  assert.deepEqual(result, data);
  safeUnlink(file);
});

test("writeJsonAtomic creates parent directories", () => {
  const file = path.join(os.tmpdir(), `storage-test-${Date.now()}`, "nested", "data.json");
  writeJsonAtomic(file, { nested: true });
  assert.equal(exists(file), true);
  assert.deepEqual(readJson(file), { nested: true });
  safeUnlink(file);
  fs.rmSync(path.dirname(path.dirname(file)), { recursive: true, force: true });
});

test("appendJsonLine appends multiple lines and they parse correctly", () => {
  const file = tmpFile("append.jsonl");
  appendJsonLine(file, { line: 1 });
  appendJsonLine(file, { line: 2 });
  appendJsonLine(file, { line: 3 });
  const content = fs.readFileSync(file, "utf8");
  const lines = content.trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(lines.length, 3);
  assert.deepEqual(lines[0], { line: 1 });
  assert.deepEqual(lines[2], { line: 3 });
  safeUnlink(file);
});

test("exists returns true for existing files and false otherwise", () => {
  const file = tmpFile("exists-check.json");
  assert.equal(exists(file), false);
  writeJsonAtomic(file, {});
  assert.equal(exists(file), true);
  safeUnlink(file);
});

test("safeUnlink silently handles nonexistent files", () => {
  assert.doesNotThrow(() => safeUnlink(tmpFile("does-not-exist.json")));
});

test("readJson throws on corrupt file", () => {
  const file = tmpFile("corrupt.json");
  fs.writeFileSync(file, "not valid json{{{", "utf8");
  assert.throws(() => readJson(file));
  safeUnlink(file);
});
