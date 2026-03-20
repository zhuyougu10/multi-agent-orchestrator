import process from "node:process";

import { taskEventFile, watchEventSocketPath } from "./lib/paths.js";
import { createTaskPanelState } from "./lib/task-panel.js";
import { connectWatchEventStream, loadBufferedEvents, parseTaskRefs, renderWatchScreen } from "./lib/watch-ui.js";
import { applyObservedRecords, buildPanelSnapshot, createStatusSnapshot, didObservedStatusChange } from "./lib/watch-observer.js";

function subscriptionRefsFromState(state) {
  return state.tasks.map((task) => ({
    task_id: task.task_id,
    agent: task.agent,
    cursor: task.cursor || 0
  }));
}

function renderPanel(state) {
  const panel = buildPanelSnapshot(state);

  process.stdout.write(`\x1b[2J\x1b[H${renderWatchScreen(panel)}\n`);
  return panel;
}

async function main() {
  const refs = parseTaskRefs(process.argv.slice(2));
  if (refs.length === 0) {
    throw new Error("usage: node watch-ui.js <task_id[:agent]> [task_id[:agent] ...]");
  }

  const state = createTaskPanelState(refs);
  applyObservedRecords(state, loadBufferedEvents(refs, { eventFileForTask: taskEventFile }));

  let panel = renderPanel(state);
  if (panel.all_terminal) {
    return;
  }

  const stream = connectWatchEventStream({
    socketPath: watchEventSocketPath(),
    refs: subscriptionRefsFromState(state)
  });

  try {
    await stream.ready;

    for await (const event of stream) {
      const matchingRefs = refs.filter((ref) => ref.task_id === event.task_id && (!ref.agent || ref.agent === event.agent));
      if (matchingRefs.length === 0) {
        continue;
      }

      const previousTasks = createStatusSnapshot(state.tasks);
      applyObservedRecords(state, matchingRefs.map((ref) => ({
        task_id: ref.task_id,
        agent: ref.agent,
        cursor: event.cursor,
        event
      })));

      if (!didObservedStatusChange(previousTasks, state.tasks)) {
        continue;
      }

      panel = renderPanel(state);
      if (panel.all_terminal) {
        await stream.return();
        return;
      }
    }
  } catch (error) {
    throw new Error(`watch event stream disconnected: ${error.message}`);
  }

  throw new Error("watch event stream disconnected before all tasks completed");
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
