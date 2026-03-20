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

function displayEventType(eventType, previousType) {
  if (!eventType) {
    return previousType;
  }

  if (eventType === "tests_started" || eventType === "tests_completed") {
    return "testing";
  }

  if (eventType === "stdout" || eventType === "stderr") {
    return previousType;
  }

  return eventType;
}

function displayStatus(status) {
  if (status === "completed") return "已完成";
  if (status === "failed") return "失败";
  if (status === "testing") return "测试中";
  return "运行中";
}

function displayStage(stage) {
  if (stage === "dispatched") return "已派发";
  if (stage === "started") return "已启动";
  if (stage === "heartbeat") return "执行中";
  if (stage === "testing") return "测试中";
  if (stage === "completed") return "已完成";
  if (stage === "failed") return "失败";
  return stage || "-";
}

function shortMessage(message = "") {
  const normalized = String(message || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= 40) {
    return normalized;
  }
  return `${normalized.slice(0, 37)}...`;
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
    task.last_event_type = displayEventType(event.event_type, task.last_event_type);
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
    if (event.event_type === "tests_started" || event.event_type === "tests_completed") {
      task.status = task.status === "running" || task.status === "testing"
        ? "testing"
        : task.status;
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
    testing: 0,
    completed: 0,
    failed: 0
  };
  for (const task of state.tasks) {
    if (task.status === "completed") summary.completed += 1;
    else if (task.status === "failed") summary.failed += 1;
    else if (task.status === "testing") summary.testing += 1;
    else summary.running += 1;
  }
  return summary;
}

export function renderTaskPanel(state) {
  const summary = summarizeTaskPanel(state);
  const lines = [
    `任务: ${summary.total} | 运行中: ${summary.running} | 测试中: ${summary.testing} | 已完成: ${summary.completed} | 失败: ${summary.failed}`,
    ""
  ];
  for (const task of state.tasks) {
    const heartbeat = task.last_heartbeat_at || task.finished_at || "-";
    const errorSummary = task.status === "failed" ? shortMessage(task.message) : "";
    const row = [
      task.task_id,
      task.agent || "-",
      displayStatus(task.status),
      heartbeat,
      displayStage(task.last_event_type)
    ];
    if (errorSummary) {
      row.push(errorSummary);
    }
    lines.push(row.join(" | "));
  }
  return lines.join("\n");
}
