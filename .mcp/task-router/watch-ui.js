import process from "node:process";

import { taskEventFile } from "./lib/paths.js";
import { createTaskPanelState, applyTaskEvents, allTasksTerminal, summarizeTaskPanel, renderTaskPanel } from "./lib/task-panel.js";
import { parseTaskRefs, readEventBatch, renderWatchScreen } from "./lib/watch-ui.js";

const POLL_INTERVAL_MS = 500;

async function main() {
  const refs = parseTaskRefs(process.argv.slice(2));
  if (refs.length === 0) {
    throw new Error("usage: node watch-ui.js <task_id[:agent]> [task_id[:agent] ...]");
  }

  const state = createTaskPanelState(refs);
  const offsets = new Map(refs.map((ref) => [ref.task_id, 0]));

  while (true) {
    for (const ref of refs) {
      const currentOffset = offsets.get(ref.task_id) || 0;
      const batch = readEventBatch(taskEventFile(ref.task_id), currentOffset);
      offsets.set(ref.task_id, batch.next_offset);
      const filteredEvents = ref.agent
        ? batch.events.filter((event) => event.agent === ref.agent)
        : batch.events;
      if (filteredEvents.length > 0) {
        applyTaskEvents(
          state,
          ref.task_id,
          ref.agent,
          filteredEvents.map((event, index) => ({
            cursor: currentOffset + index + 1,
            event
          }))
        );
      }
    }

    const panel = {
      tasks: state.tasks,
      summary: summarizeTaskPanel(state),
      all_terminal: allTasksTerminal(state),
      panel_text: renderTaskPanel(state)
    };

    process.stdout.write(`\x1b[2J\x1b[H${renderWatchScreen(panel)}\n`);

    if (panel.all_terminal) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
