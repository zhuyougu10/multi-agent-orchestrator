import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { rotateEventFile, rotateAllEventFiles } from "../lib/event-rotation.js";

test("rotateEventFile does nothing for nonexistent file", () => {
  const result = rotateEventFile("/nonexistent/file.jsonl");
  assert.equal(result.rotated, false);
  assert.equal(result.originalSize, 0);
});

test("rotateEventFile does nothing when file is under size limit", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "event-rot-"));
  const filePath = path.join(tmpDir, "events.jsonl");
  fs.writeFileSync(filePath, '{"event":"test"}\n', "utf8");

  const result = rotateEventFile(filePath, { maxSizeBytes: 1024 });
  assert.equal(result.rotated, false);
});

test("rotateEventFile truncates file keeping last N lines", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "event-rot-"));
  const filePath = path.join(tmpDir, "events.jsonl");

  // 写入 200 行
  const lines = [];
  for (let i = 0; i < 200; i++) {
    lines.push(JSON.stringify({ event: "test", index: i }));
  }
  fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf8");

  const result = rotateEventFile(filePath, { maxSizeBytes: 100, keepLines: 50 });
  assert.equal(result.rotated, true);
  assert.ok(result.linesRemoved > 0);

  // 验证保留了最后 50 行
  const remaining = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
  assert.equal(remaining.length, 50);

  const lastLine = JSON.parse(remaining.at(-1));
  assert.equal(lastLine.index, 199);
});

test("rotateAllEventFiles processes all .jsonl files in directory", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "event-rot-all-"));

  // 创建两个事件文件
  const bigLines = [];
  for (let i = 0; i < 100; i++) {
    bigLines.push(JSON.stringify({ event: "test", index: i }));
  }
  fs.writeFileSync(path.join(tmpDir, "task-a.jsonl"), bigLines.join("\n") + "\n", "utf8");
  fs.writeFileSync(path.join(tmpDir, "task-b.jsonl"), '{"event":"small"}\n', "utf8");

  const result = rotateAllEventFiles(tmpDir, { maxSizeBytes: 100, keepLines: 10 });
  assert.equal(result.checked, 2);
  assert.equal(result.rotated, 1); // 只有 task-a 需要轮转
});

test("rotateAllEventFiles handles nonexistent directory", () => {
  const result = rotateAllEventFiles("/nonexistent/dir");
  assert.equal(result.checked, 0);
  assert.equal(result.rotated, 0);
});
