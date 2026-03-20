import {
  applyTaskEvents,
  allTasksTerminal,
  renderTaskPanel,
  summarizeTaskPanel
} from "./task-panel.js";

export function applyObservedRecords(state, records = []) {
  for (const record of records) {
    applyTaskEvents(state, record.task_id, record.agent, [{
      cursor: record.cursor,
      event: record.event
    }]);
  }

  return state;
}

export function buildPanelSnapshot(state) {
  return {
    tasks: state.tasks,
    summary: summarizeTaskPanel(state),
    all_terminal: allTasksTerminal(state),
    panel_text: renderTaskPanel(state)
  };
}

export function createStatusSnapshot(tasks = []) {
  return tasks.map((task) => ({
    task_id: task.task_id,
    agent: task.agent ?? null,
    status: task.status
  }));
}

export function didObservedStatusChange(previousTasks = [], nextTasks = []) {
  const previousByKey = new Map(previousTasks.map((task) => [`${task.task_id}::${task.agent || "*"}`, task.status]));

  for (const task of nextTasks) {
    const key = `${task.task_id}::${task.agent || "*"}`;
    if (previousByKey.get(key) !== task.status) {
      return true;
    }
  }

  return false;
}
