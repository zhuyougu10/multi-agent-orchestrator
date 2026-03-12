# multi-agent-orchestrator

**OpenCode + MCP task-router** — dispatch tasks directly to Codex and Gemini, run them concurrently, and collect results — all from inside OpenCode.

---

## 项目定位

This project lets you control **Codex** and **Gemini** directly through [OpenCode](https://opencode.ai) via a local MCP server (`task-router`). You dispatch tasks, watch them execute in real time, repair failures, and merge winning results — no workflow framework, no planning files, just direct MCP tool calls.

---

## 快速开始

### 前置条件

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 18 |
| Git | any recent |
| OpenCode | latest |
| Codex CLI | latest |
| Gemini CLI | latest |

### 安装

```bash
cd .mcp/task-router
npm install
```

### 配置

`.opencode/opencode.json` is already configured to connect OpenCode to the MCP server — no changes needed.

### 启动 MCP 服务器

```bash
node .mcp/task-router/server.js
```

Then open OpenCode in this directory; the `task-router` MCP tools will be available automatically.

### 启动本地 watcher 面板

```bash
cd .mcp/task-router
npm run watch-ui -- watch-smoke-20260313
```

如果你是在 OpenCode 的 `/watch` 流程里使用，推荐等价命令就是：

```bash
node .mcp/task-router/watch-ui.js <task_id[:agent]> [...task_id[:agent]]
```

也可以直接运行：

```bash
node .mcp/task-router/watch-ui.js watch-smoke-20260313
```

多任务示例：

```bash
node .mcp/task-router/watch-ui.js task-001 task-002:gemini task-003
```

watcher 会在当前终端中维护一个固定面板，并在同一块区域里显示多任务状态。

---

## MCP 工具速查

| Tool | Description |
|------|-------------|
| `dispatch_task` | Dispatch a task to Codex or Gemini |
| `collect_result` | Collect the output of a completed task |
| `subscribe_task_events` | Subscribe to a real-time event stream for a task |
| `watch_task_group_blocking` | Block until all tasks in a group reach a terminal state, showing a live panel |
| `score_result` | Score/evaluate a task result |
| `list_jobs` | List all current jobs and their statuses |
| `prepare_merge` | Preview changes before merging a task result |
| `merge_winner` | Apply a task result to the main workspace |
| `abort_merge` | Abort an in-progress merge |
| `retry_task` | Retry a failed task with updated instructions |
| `cleanup_task` | Release resources associated with a completed task |

---

## OpenCode 命令

Use these slash-commands inside OpenCode:

| Command | Description |
|---------|-------------|
| `/delegate` | Dispatch a task to Codex or Gemini via `dispatch_task` |
| `/watch` | Run `watch-ui.js` in the current terminal and show a fixed multi-task panel |
| `/repair` | Retry a failed task via `retry_task` |
| `/merge` | Merge a result via `prepare_merge` + `merge_winner` |

---

## Agent 路由规则

| Task type | Default agent |
|-----------|---------------|
| `implementation`, `refactor`, `tests`, `bugfix`, `script` | **Codex** |
| `docs`, `summarization`, `comparison`, `ux-copy` | **Gemini** |

- Override toward **Gemini** for frontend / UI / UX-heavy tasks.
- Override toward **Codex** for backend / API / data / test-heavy tasks.

---

## 执行模式

| Mode | Behavior |
|------|----------|
| `single` | One agent only |
| `fallback` | Try primary agent; switch to secondary on failure (default) |
| `race` | Dispatch to both agents in parallel; take the winner |

---

## 项目结构

```
multi-agent-orchestrator/
├── .gitignore
├── LICENSE
├── README.md
├── .opencode/
│   ├── opencode.json          # MCP connection config (do not edit)
│   └── commands/
│       ├── delegate.md        # /delegate command
│       ├── watch.md           # /watch command
│       ├── repair.md          # /repair command
│       └── merge.md           # /merge command
└── .mcp/
    └── task-router/           # MCP server (do not edit)
        ├── server.js
        ├── dispatch.js
        ├── runtime.js
        ├── runner.js
        ├── package.json
        └── lib/
            ├── paths.js
            ├── process.js
            ├── storage.js
            ├── validation.js
            ├── result-utils.js
            ├── result-collection.js
            ├── task-events.js
            └── task-panel.js
```
