import fs from "node:fs";
import net from "node:net";

import { resolveWatchSocketPath, taskEventFile } from "./paths.js";

function safeWrite(socket, payload) {
  if (socket.destroyed) {
    return;
  }

  try {
    socket.write(`${JSON.stringify(payload)}\n`);
  } catch {}
}

function readBufferedEvents(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function matchesSubscription(subscription, event) {
  if (subscription.task_id !== event.task_id) {
    return false;
  }

  if (subscription.agent && subscription.agent !== event.agent) {
    return false;
  }

  return (event.cursor || 0) > (subscription.cursor || 0);
}

function replayBufferedEvents(socket, subscriptions, eventFileForTask) {
  for (const subscription of subscriptions) {
    const events = readBufferedEvents(eventFileForTask(subscription.task_id));
    for (const event of events) {
      if (matchesSubscription(subscription, event)) {
        safeWrite(socket, event);
      }
    }
  }
}

async function canConnect(socketPath) {
  return new Promise((resolve) => {
    const client = net.createConnection(socketPath);
    client.once("connect", () => {
      client.destroy();
      resolve(true);
    });
    client.once("error", () => {
      resolve(false);
    });
  });
}

async function prepareSocketPath(socketPath) {
  if (process.platform === "win32" || !fs.existsSync(socketPath)) {
    return;
  }

  if (await canConnect(socketPath)) {
    throw new Error(`watch event socket already in use: ${socketPath}`);
  }

  fs.unlinkSync(socketPath);
}

export function createWatchEventBroadcaster({ socketPath, eventFileForTask = taskEventFile } = {}) {
  const resolvedSocketPath = resolveWatchSocketPath(socketPath);
  const clients = new Map();
  const server = net.createServer((socket) => {
    clients.set(socket, []);
    let buffer = "";

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
        if (message.type !== "subscribe") {
          continue;
        }

        const subscriptions = Array.isArray(message.tasks) ? message.tasks : [];
        clients.set(socket, subscriptions);
        replayBufferedEvents(socket, subscriptions, eventFileForTask);
        safeWrite(socket, { type: "subscribed" });
      }
    });

    socket.on("error", () => {});
    socket.on("close", () => {
      clients.delete(socket);
    });
  });

  return {
    socketPath: resolvedSocketPath,

    async listen() {
      await prepareSocketPath(resolvedSocketPath);

      await new Promise((resolve, reject) => {
        const onError = (error) => {
          server.off("listening", onListening);
          reject(error);
        };
        const onListening = () => {
          server.off("error", onError);
          resolve();
        };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(resolvedSocketPath);
      });
    },

    publish(event) {
      for (const [client, subscriptions] of clients) {
        if (subscriptions.some((subscription) => matchesSubscription(subscription, event))) {
          safeWrite(client, event);
        }
      }
    },

    async close() {
      for (const client of clients.keys()) {
        client.destroy();
      }
      clients.clear();

      await new Promise((resolve) => {
        server.close(() => resolve());
      });

      if (process.platform !== "win32" && fs.existsSync(resolvedSocketPath)) {
        fs.unlinkSync(resolvedSocketPath);
      }
    }
  };
}
