---
description: Run watch-ui in the current terminal
---

Run `watch-ui.js` directly in the current terminal so one fixed panel can render multiple tasks in place without the model repeatedly printing panel snapshots.

## Steps

1. Ask the user (or accept as arguments) the list of `task_id` values to watch, and optionally the `agent` for each.

2. Build watcher arguments as `<task_id>` or `<task_id>:<agent>` for each task.
3. Run this command directly in the current terminal:
   ```bash
   node .mcp/task-router/watch-ui.js <task_id[:agent]> [...task_id[:agent]]
   ```
   Example:
   ```bash
   node .mcp/task-router/watch-ui.js task-001 task-002:gemini task-003
   ```
4. The watcher should own the terminal while it is running. Do not print extra progress text before it exits.
5. After the watcher exits, summarize terminal outcomes if needed.

## Manual fallback

```
cd .mcp/task-router
npm run watch-ui -- task-001 task-002:gemini
```

单任务也可以这样：

```bash
node .mcp/task-router/watch-ui.js task-001
```

这会在同一个固定面板里同时显示多个任务，而不是为每个任务分别打印新块。

## Constraints

- Do not write any files
- Do not fake task status; the watcher must use real task-router event data
- Prefer directly running `watch-ui.js` over printing repeated panel snapshots into chat
- One `/watch` invocation should correspond to one fixed panel, even for multiple tasks
