import fs from "node:fs";

import { AGENT_NAMES } from "./agents.js";
import { sanitizeTaskId } from "./validation.js";

export function parseTaskRefs(args = []) {
  return args.map((value) => {
    const [rawTaskId, rawAgent] = String(value || "").split(":");
    const task_id = sanitizeTaskId(rawTaskId);
    const agent = rawAgent ? validateAgent(rawAgent) : null;
    return { task_id, agent };
  });
}

export function readEventBatch(filePath, offset = 0) {
  if (!fs.existsSync(filePath)) {
    return { events: [], next_offset: offset };
  }

  const content = fs.readFileSync(filePath, "utf8");
  const nextOffset = Buffer.byteLength(content, "utf8");
  const chunk = Buffer.from(content, "utf8").subarray(offset).toString("utf8");
  const events = chunk
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  return {
    events,
    next_offset: nextOffset
  };
}

export function renderWatchScreen(panel) {
  return [
    "Task Router Watch",
    "=================",
    "",
    panel.panel_text
  ].join("\n");
}

function validateAgent(agent) {
  if (!AGENT_NAMES.includes(agent)) {
    throw new Error(`invalid agent: ${agent}`);
  }
  return agent;
}
