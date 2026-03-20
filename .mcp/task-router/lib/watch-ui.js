import fs from "node:fs";
import net from "node:net";

import { AGENT_NAMES } from "./agents.js";
import { resolveWatchSocketPath } from "./paths.js";
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
    "任务路由面板",
    "============",
    "",
    panel.panel_text
  ].join("\n");
}

function writeSubscribeMessage(socket, refs = []) {
  socket.write(`${JSON.stringify({ type: "subscribe", tasks: refs })}\n`);
}

export function onceWatchEvent({ socketPath, refs = [], disconnectAfterConnect = false } = {}) {
  const resolvedSocketPath = resolveWatchSocketPath(socketPath);

  return new Promise((resolve, reject) => {
    let buffer = "";
    let settled = false;
    let subscribed = false;
    const socket = net.createConnection(resolvedSocketPath);

    function finish(handler, value) {
      if (settled) return;
      settled = true;
      socket.destroy();
      handler(value);
    }

    socket.on("connect", () => {
      writeSubscribeMessage(socket, refs);
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) {
        return;
      }

      const line = buffer.slice(0, newlineIndex);
      const message = JSON.parse(line);
      if (message.type === "subscribed") {
        subscribed = true;
        if (disconnectAfterConnect) {
          finish(resolve, null);
        }
        return;
      }
      finish(resolve, message);
    });

    socket.on("error", (error) => {
      finish(reject, error);
    });

    socket.on("close", () => {
      if (!settled && disconnectAfterConnect) {
        finish(resolve, null);
      }
    });
  });
}

export function loadBufferedEvents(refs = [], { eventFileForTask } = {}) {
  const records = [];

  for (const ref of refs) {
    const filePath = eventFileForTask(ref.task_id);
    const batch = readEventBatch(filePath, 0);
    const filteredEvents = ref.agent
      ? batch.events.filter((event) => event.agent === ref.agent)
      : batch.events;

    records.push(...filteredEvents.map((event, index) => ({
      task_id: ref.task_id,
      agent: ref.agent,
      cursor: event.cursor ?? index + 1,
      event
    })));
  }

  return records;
}

export function connectWatchEventStream({ socketPath, refs = [] } = {}) {
  const resolvedSocketPath = resolveWatchSocketPath(socketPath);
  const socket = net.createConnection(resolvedSocketPath);
  let done = false;
  let notify = null;
  const queue = [];
  let buffer = "";
  let resolveReady = null;
  let rejectReady = null;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  function flushRecord(record) {
    if (notify) {
      const resolve = notify;
      notify = null;
      resolve(record);
      return;
    }
    queue.push(record);
  }

  socket.on("connect", () => {
    writeSubscribeMessage(socket, refs);
  });

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");

    while (true) {
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) {
        break;
      }

      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;
      const message = JSON.parse(line);
      if (message.type === "subscribed") {
        resolveReady();
        continue;
      }
      flushRecord({ value: message, done: false });
    }
  });

  socket.on("error", (error) => {
    done = true;
    rejectReady(error);
    flushRecord(Promise.reject(error));
  });

  socket.on("close", () => {
    done = true;
    flushRecord({ value: undefined, done: true });
  });

  return {
    ready,
    next() {
      if (queue.length > 0) {
        return Promise.resolve(queue.shift());
      }
      if (done) {
        return Promise.resolve({ value: undefined, done: true });
      }
      return new Promise((resolve, reject) => {
        notify = (record) => {
          if (record instanceof Promise) {
            record.then(resolve, reject);
            return;
          }
          resolve(record);
        };
      });
    },
    return() {
      done = true;
      socket.destroy();
      return Promise.resolve({ value: undefined, done: true });
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}

function validateAgent(agent) {
  if (!AGENT_NAMES.includes(agent)) {
    throw new Error(`invalid agent: ${agent}`);
  }
  return agent;
}
