import fs from "node:fs";

const DEFAULT_MAX_SIZE_BYTES = 1024 * 1024; // 1MB
const DEFAULT_KEEP_LINES = 100;

/**
 * 检查事件文件大小并在超限时轮转
 * @param {string} filePath - JSONL 事件文件路径
 * @param {object} options
 * @param {number} options.maxSizeBytes - 触发轮转的最大文件大小
 * @param {number} options.keepLines - 轮转时保留的尾部行数
 * @returns {{ rotated: boolean, originalSize: number, newSize: number }}
 */
export function rotateEventFile(filePath, options = {}) {
  const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
  const keepLines = options.keepLines ?? DEFAULT_KEEP_LINES;

  if (!fs.existsSync(filePath)) {
    return { rotated: false, originalSize: 0, newSize: 0 };
  }

  const stat = fs.statSync(filePath);
  if (stat.size <= maxSizeBytes) {
    return { rotated: false, originalSize: stat.size, newSize: stat.size };
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter(Boolean);

  if (lines.length <= keepLines) {
    return { rotated: false, originalSize: stat.size, newSize: stat.size };
  }

  const kept = lines.slice(-keepLines);
  const newContent = kept.join("\n") + "\n";
  fs.writeFileSync(filePath, newContent, "utf8");

  const newStat = fs.statSync(filePath);
  return {
    rotated: true,
    originalSize: stat.size,
    newSize: newStat.size,
    linesRemoved: lines.length - keepLines
  };
}

/**
 * 批量检查所有事件文件并轮转超限文件
 * @param {string} eventDir - 事件目录
 * @param {object} options
 * @returns {{ checked: number, rotated: number, results: Array }}
 */
export function rotateAllEventFiles(eventDir, options = {}) {
  if (!fs.existsSync(eventDir)) {
    return { checked: 0, rotated: 0, results: [] };
  }

  const files = fs.readdirSync(eventDir).filter((f) => f.endsWith(".jsonl"));
  const results = [];

  for (const file of files) {
    const filePath = `${eventDir}/${file}`;
    const result = rotateEventFile(filePath, options);
    results.push({ file, ...result });
  }

  return {
    checked: files.length,
    rotated: results.filter((r) => r.rotated).length,
    results
  };
}
