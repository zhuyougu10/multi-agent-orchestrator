import fs from "node:fs";
import path from "node:path";

export function exists(file) {
  return fs.existsSync(file);
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeJsonAtomic(file, data) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });

  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

export function appendJsonLine(file, data) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(data)}\n`, "utf8");
}

export function safeUnlink(file) {
  try {
    fs.unlinkSync(file);
  } catch {}
}
