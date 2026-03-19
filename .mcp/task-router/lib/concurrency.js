// 并发任务数限制：基于信号量的背压控制
const DEFAULT_MAX_CONCURRENT = 4;

let maxConcurrent = DEFAULT_MAX_CONCURRENT;
let activeTasks = 0;
const waitQueue = [];

export function setMaxConcurrent(max) {
  maxConcurrent = max > 0 ? max : DEFAULT_MAX_CONCURRENT;
}

export function getMaxConcurrent() {
  return maxConcurrent;
}

export function getActiveTasks() {
  return activeTasks;
}

export function getQueueLength() {
  return waitQueue.length;
}

export async function acquireSlot() {
  if (activeTasks < maxConcurrent) {
    activeTasks++;
    return;
  }
  return new Promise((resolve) => {
    waitQueue.push(resolve);
  });
}

export function releaseSlot() {
  if (waitQueue.length > 0) {
    const next = waitQueue.shift();
    next();
    return;
  }
  activeTasks = Math.max(0, activeTasks - 1);
}

export function getConcurrencyStatus() {
  return {
    active: activeTasks,
    max: maxConcurrent,
    queued: waitQueue.length,
    available: Math.max(0, maxConcurrent - activeTasks)
  };
}
