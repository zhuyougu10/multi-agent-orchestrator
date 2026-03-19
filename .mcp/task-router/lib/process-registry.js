// 进程注册表：追踪运行中的子进程，支持任务取消
const activeProcesses = new Map();

export function registerProcess(taskId, agent, childProcess) {
  const key = `${taskId}::${agent}`;
  activeProcesses.set(key, { child: childProcess, taskId, agent });
}

export function unregisterProcess(taskId, agent) {
  const key = `${taskId}::${agent}`;
  activeProcesses.delete(key);
}

export function killProcess(taskId, agent) {
  const key = `${taskId}::${agent}`;
  const entry = activeProcesses.get(key);
  if (!entry) {
    return { found: false, killed: false };
  }
  try {
    entry.child.kill("SIGKILL");
    activeProcesses.delete(key);
    return { found: true, killed: true };
  } catch (err) {
    return { found: true, killed: false, error: err.message };
  }
}

export function isProcessActive(taskId, agent) {
  const key = `${taskId}::${agent}`;
  return activeProcesses.has(key);
}

export function listActiveProcesses() {
  const entries = [];
  for (const [, entry] of activeProcesses) {
    entries.push({ task_id: entry.taskId, agent: entry.agent });
  }
  return entries;
}

export function cancelAllForTask(taskId) {
  const killed = [];
  for (const [key, entry] of activeProcesses) {
    if (entry.taskId === taskId) {
      try {
        entry.child.kill("SIGKILL");
        killed.push({ agent: entry.agent, killed: true });
      } catch (err) {
        killed.push({ agent: entry.agent, killed: false, error: err.message });
      }
      activeProcesses.delete(key);
    }
  }
  return killed;
}
