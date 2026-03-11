function createTaskRecord(task) {
  return {
    task_id: task.task_id,
    agent: task.agent ?? null,
    cursor: task.cursor ?? 0,
    status: "running",
    last_heartbeat_at: "",
    last_event_type: "dispatched",
    started_at: "",
    finished_at: "",
    message: ""
  };
}

export function createTaskPanelState(tasks = []) {
  return {
    tasks: tasks.map(createTaskRecord)
  };
}

function findTask(state, taskId, agent) {
  let task = state.tasks.find((entry) => entry.task_id === taskId && entry.agent === (agent ?? null));
  if (!task) {
    task = createTaskRecord({ task_id: taskId, agent, cursor: 0 });
    state.tasks.push(task);
  }
  return task;
}

export function applyTaskEvents(state, taskId, agent, events = []) {
  const task = findTask(state, taskId, agent);
  for (const record of events) {
    task.cursor = Math.max(task.cursor, record.cursor ?? task.cursor);
    const event = record.event || {};
    task.last_event_type = event.event_type || task.last_event_type;
    if (event.timestamp && !task.started_at) {
      task.started_at = event.timestamp;
    }
    if (event.event_type === "heartbeat") {
      task.last_heartbeat_at = event.timestamp || task.last_heartbeat_at;
      task.status = task.status === "running" ? "running" : task.status;
    }
    if (event.event_type === "started") {
      task.started_at = event.timestamp || task.started_at;
      task.status = "running";
    }
    if (event.event_type === "completed" || event.event_type === "failed") {
      task.status = event.event_type;
      task.finished_at = event.timestamp || task.finished_at;
      task.message = event.message || task.message;
    }
    if (event.message && !task.message) {
      task.message = event.message;
    }
  }
  return task;
}

export function allTasksTerminal(state) {
  return state.tasks.every((task) => task.status === "completed" || task.status === "failed");
}

export function summarizeTaskPanel(state) {
  const summary = {
    total: state.tasks.length,
    running: 0,
    completed: 0,
    failed: 0
  };
  for (const task of state.tasks) {
    if (task.status === "completed") summary.completed += 1;
    else if (task.status === "failed") summary.failed += 1;
    else summary.running += 1;
  }
  return summary;
}

export function renderTaskPanel(state) {
  const summary = summarizeTaskPanel(state);
  const lines = [
    `Tasks: ${summary.total} total | running: ${summary.running} | completed: ${summary.completed} | failed: ${summary.failed}`,
    ""
  ];
  for (const task of state.tasks) {
    const heartbeat = task.last_heartbeat_at || task.finished_at || "-";
    lines.push(`${task.task_id} | ${task.agent || "-"} | ${task.status} | ${heartbeat} | ${task.last_event_type}`);
  }
  return lines.join("\n");
}

export async function collectPanelSnapshotsUntilTerminal(tasks, watcher, waitMs, options = {}) {
  const { maxRounds = 120, globalTimeoutMs = 0 } = options;
  let currentTasks = tasks.map((task) => ({ ...task }));
  const panelHistory = [];
  let latest = null;
  let rounds = 0;
  const startTime = Date.now();

  while (true) {
    rounds++;
    if (maxRounds > 0 && rounds > maxRounds) {
      return {
        all_terminal: latest?.all_terminal ?? false,
        tasks: latest?.tasks ?? currentTasks,
        panel_text: latest?.panel_text ?? "",
        panel_history: panelHistory,
        timeout_reason: "max_rounds_exceeded"
      };
    }
    if (globalTimeoutMs > 0 && Date.now() - startTime > globalTimeoutMs) {
      return {
        all_terminal: latest?.all_terminal ?? false,
        tasks: latest?.tasks ?? currentTasks,
        panel_text: latest?.panel_text ?? "",
        panel_history: panelHistory,
        timeout_reason: "global_timeout"
      };
    }
    latest = await watcher({ tasks: currentTasks, waitMs });
    panelHistory.push(latest.panel_text);
    if (latest.all_terminal) {
      return {
        ...latest,
        panel_history: panelHistory
      };
    }
    currentTasks = latest.tasks.map((task) => ({
      task_id: task.task_id,
      agent: task.agent,
      cursor: task.cursor
    }));
  }
}
