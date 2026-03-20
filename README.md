# multi-agent-orchestrator

一个基于 `OpenCode + MCP task-router` 的多代理任务编排项目。

它的目标不是提供一个传统的 Web 产品，而是让你在本地通过 OpenCode 直接调度 `Codex` 和 `Gemini`，完成任务派发、进度观察、失败修复、结果收集与代码合并。

---

## 项目概述

本项目通过一个本地 MCP 服务 `task-router` 把 OpenCode、Codex CLI 和 Gemini CLI 串联起来，形成一条完整的代理协作链路。

你可以在 OpenCode 中：

- 用 `/delegate` 把任务交给合适的代理
- 用 `/watch` 在当前终端打开固定 watcher 面板
- 用 `/cancel` 取消卡死或不再需要的运行中任务
- 用 `/repair` 对失败任务追加修复说明并重试
- 用 `/history` 查看任务历史、分数和代理表现
- 用 `/merge` 把胜出的结果合并回当前工作区
- 用 `/cleanup` 清理已完成任务的全部工件

项目强调：

- 本地优先
- 轻量依赖
- MCP 工具直连
- 可观测的任务状态
- 基于 worktree 的隔离执行

---

## 核心功能

### 1. 多代理任务派发

`task-router` 可以根据任务类型把工作分发给不同代理：

- `Codex`：更适合实现、重构、测试、脚本和 bugfix
- `Gemini`：更适合文档、总结、对比和文案类任务

支持三种执行模式：

- `single`：只运行一个代理
- `fallback`：主代理失败后，或分数低于阈值时自动切换备用代理（默认）
- `race`：两个代理并行运行并选择结果更优的一方

派发时还支持以下质量控制能力：

- `constraints`：声明任务必须满足的约束条件，并进入打分链路
- `output_schema`：要求代理输出包含指定字段，用于结构化验收
- `score_threshold`：为 `fallback` 模式设置最低可接受分数
- `idle_timeout_ms`：控制长思考任务的空闲超时，避免误杀

系统默认最多并发执行 **4 个任务**；超出的任务会自动排队。

### 2. 固定 watcher 面板

项目内置 `watch-ui.js`，可在当前终端中维护一个固定面板，并在同一块区域内显示一个或多个任务的状态变化。

watcher 启动时会先读取一次已有事件文件恢复初始状态，随后完全依赖 `task-router` 服务主动推送的新事件刷新面板，不再自行定时轮询。

这适用于你不希望在模型会话中反复刷屏，而是想看一个持续更新的本地面板的场景。

### 3. 任务结果收集与评分

任务完成后可以通过 `collect_result` 收集真实执行结果，包括：

- `stdout`
- `stderr`
- 测试结果
- 产物信息
- 评分结果

评分不仅看任务是否“成功”，还会同时考虑：

- 结构化输出是否合法 JSON
- `output_schema` 是否满足
- 文件修改是否超出 `files_scope`
- `constraints` 是否被违反
- 测试是否通过
- `stderr` 是否存在额外噪音

### 4. 失败修复与重试

当任务失败时，可以通过 `/repair` 或 `retry_task` 在原任务语境上追加修复说明并重新执行。

系统会自动追踪 `retry_count`，并强制每个任务**最多重试 2 次**。

### 5. 安全合并

任务结果可以通过两种方式合并回当前工作区：

- `patch`：适合文档、小规模文本改动
- `cherry-pick`：适合代码实现、重构和测试修改

在真正合并前，`prepare_merge` 会返回：

- `diff_stat`：变更统计
- `files_changed`：受影响文件列表
- `patch_file` 或 `commit_sha`：用于实际应用结果

### 6. 任务取消、回顾与清理

除派发、观察、修复和合并外，当前还支持：

- `cancel_task` / `/cancel`：终止运行中的代理进程，并将任务标记为 `cancelled`
- `task_history` / `/history`：回顾任务总数、状态分布、平均分、重试次数和代理表现
- `cleanup_task` / `/cleanup`：清理 worktree、分支、结果、分数、bundle、patch、事件和 job 文件

---

## 架构与工作流

整体流程如下：

1. 启动本地 MCP 服务 `task-router`
2. 在 OpenCode 中通过 slash command 或 MCP 工具派发任务
3. `task-router` 在独立 worktree 中运行代理任务
4. 任务执行期间持续产生日志、结果文件和事件数据
5. 通过 `watch-ui.js` 或 `collect_result` 观察执行结果
6. 如任务卡死，可用 `/cancel` 终止
7. 确认无误后使用 `/merge` 合并结果
8. 使用 `/cleanup` 清理完成任务的工件

典型链路：

```text
/delegate
-> task-router.dispatch_task
-> 代理执行
-> watch-ui.js / collect_result
-> /cancel（如卡死）
-> /repair（如有失败）
-> /history（如需复盘）
-> /merge
-> /cleanup
```

---

## 环境要求

请确保本地具备以下环境：

| 组件 | 要求 |
|------|------|
| Node.js | >= 18 |
| Git | 任意较新版本 |
| OpenCode | 最新版本 |
| Codex CLI | 最新版本 |
| Gemini CLI | 最新版本 |

建议环境：

- Windows PowerShell、macOS Terminal、Linux shell 或兼容终端
- 能正常访问本地 Node.js 与 Git 命令

说明：当前 runner 已支持跨平台，Windows 使用 PowerShell，Unix-like 环境使用 `sh`。

---

## 安装与配置

### 1. 克隆仓库

```bash
git clone <your-repo-url>
cd multi-agent-orchestrator
```

### 2. 安装 `task-router` 依赖

```bash
cd .mcp/task-router
npm install
```

### 2.5 一键初始化（推荐）

如果你只是想快速完成项目初始化，而不自动修改系统环境，可以直接运行仓库内置脚本。

Windows PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
```

Linux / macOS：

```bash
sh ./scripts/bootstrap.sh
```

脚本会完成：

- 检查 `node` / `npm` / `git`
- 校验 Node.js 版本是否 `>= 18`
- 检查 `opencode` / `codex` / `gemini` 是否在 `PATH`
- 安装 `.mcp/task-router` 依赖
- 输出下一步启动命令

说明：

- 这是**安全版初始化脚本**，不会自动安装全局 CLI，也不会修改你的系统配置。
- 如果 `opencode`、`codex`、`gemini` 缺失，脚本会给出警告，但仍会完成仓库依赖安装。

### 2.6 远程安装到现有项目或新项目

如果你不想先克隆本仓库，而是想在**任意现有项目**或**新目录**里直接接入本项目的 `task-router` 能力，可以使用远程安装脚本。

安装内容包括：

- `.mcp/task-router/`
- `.opencode/commands/`
- `.opencode/opencode.json`
- 必要的 `.gitignore` 条目

脚本行为：

- 检查 `node >= 18`、`npm`、`git`
- 从 GitHub 下载当前仓库的安装包
- 将受管路径复制到目标项目
- 如果目标路径已存在，先自动备份为 `*.bak.<timestamp>`
- 在目标项目的 `.mcp/task-router` 中执行 `npm install`
- 安装完成后提示使用 `watch-ui.js` 作为任务观察入口

在**当前目录**接入（适用于已有项目）：

Windows PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -Command "iwr https://raw.githubusercontent.com/zhuyougu10/multi-agent-orchestrator/master/install.ps1 -UseBasicParsing | iex"
```

Linux / macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/zhuyougu10/multi-agent-orchestrator/master/install.sh | sh
```

在**指定新目录**中创建并接入：

Windows PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((iwr https://raw.githubusercontent.com/zhuyougu10/multi-agent-orchestrator/master/install.ps1 -UseBasicParsing).Content)) my-new-project"
```

Linux / macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/zhuyougu10/multi-agent-orchestrator/master/install.sh | sh -s -- my-new-project
```

说明：

- 远程安装脚本只管理集成相关路径，不会覆盖你的业务代码。
- 如果目标项目已有 `.mcp/task-router`、`.opencode/commands` 或 `.opencode/opencode.json`，会先备份再替换。
- 这是项目内集成，不会修改系统级全局配置。

### 3. 检查 OpenCode 配置

项目已内置 `.opencode/opencode.json`，默认会把本地 `task-router` 注册为 MCP 服务，通常不需要额外修改。

关键配置包括：

- 启动命令：`node .mcp/task-router/server.js`
- 允许调用的 `task-router` 工具权限
- watcher 忽略规则

---

## 快速开始

### 启动 MCP 服务

在仓库根目录运行：

```bash
node .mcp/task-router/server.js
```

或者：

```bash
cd .mcp/task-router
npm start
```

启动后，在当前仓库目录中打开 OpenCode，即可自动加载 `task-router` MCP 工具。

如果你刚完成初始化，推荐顺序是：

1. 运行 `scripts/bootstrap.ps1` 或 `scripts/bootstrap.sh`
2. 启动 `task-router`
3. 在当前仓库中打开 OpenCode

### 启动本地 watcher 面板

单任务示例：

```bash
cd .mcp/task-router
npm run watch-ui -- watch-smoke-20260313
```

等价写法：

```bash
node .mcp/task-router/watch-ui.js watch-smoke-20260313
```

多任务示例：

```bash
node .mcp/task-router/watch-ui.js task-001 task-002:gemini task-003
```

说明：

- `task_id` 直接写任务 ID
- 如需限定代理，可使用 `task_id:agent`
- watcher 会在当前终端中维护一个固定面板，并在同一块区域显示多任务状态

---

## 使用指南

### 1. 派发任务

在 OpenCode 中使用：

- `/delegate`

底层对应工具：

- `dispatch_task`

常用参数包括：

- `task_id`
- `task_type`
- `cwd`
- `prompt`
- `preferred_agent`
- `mode`
- `files_scope`
- `constraints`
- `test_command`
- `output_schema`
- `timeout_ms`
- `idle_timeout_ms`
- `score_threshold`

推荐实践：

- 长思考或大改动任务显式设置 `idle_timeout_ms`
- 质量要求明确的任务显式设置 `constraints`
- 需要结构化验收的任务设置 `output_schema`
- 使用 `score_threshold=60` 作为通用质量门槛

### 2. 观察任务

推荐方式：

- 使用 `/watch`
- 或直接运行 `watch-ui.js`

`/watch` 当前推荐行为是：

- 在当前终端直接运行 `watch-ui.js`
- 使用一个固定面板显示多个任务状态
- 由 `task-router` 服务主动推送任务事件到 watcher
- 不再在模型会话里重复输出大量轮询文本

注意：`watch-ui.js` 依赖本地 `task-router` 服务在线；如果服务未启动或中途重启，watcher 会断开并退出。

如果任务长时间没有心跳或明显卡死，建议先结合 `idle_timeout_ms` 判断，再使用 `/cancel` 终止任务。

### 3. 收集结果

任务完成后可通过：

- `collect_result`

获取真实执行结果，包括：

- 选中的代理结果
- 标准输出
- 标准错误
- 测试状态
- 执行元数据

### 4. 修复失败任务

在 OpenCode 中使用：

- `/repair`

底层对应工具：

- `retry_task`

适用场景：

- 任务执行失败
- 结果格式不符合要求
- 需要基于失败信息增加修复指令

注意：`retry_task` 现在有**最多 2 次重试**的硬限制，超限后需要新建任务或人工介入。

### 5. 取消运行中任务

在 OpenCode 中使用：

- `/cancel`

底层对应工具：

- `cancel_task`

适用场景：

- 任务长时间无心跳
- 方向错误，需要立刻中止
- 需要释放并发槽位给更高优先级任务

说明：`/cancel` 只负责终止运行中的任务，不会删除工件；清理请使用 `/cleanup`。

### 6. 合并结果

在 OpenCode 中使用：

- `/merge`

底层流程：

1. `prepare_merge`
2. `merge_winner`

推荐策略：

- 文档和小文本改动：`patch`
- 代码实现、重构、测试改动：`cherry-pick`

合并前建议重点检查：

- `diff_stat` 是否符合预期范围
- `files_changed` 是否只涉及目标文件
- `patch_file` 或 `commit_sha` 是否存在

### 7. 回顾历史与清理工件

回顾历史：

- `/history`
- `task_history`

可以查看：

- `status_counts`
- `average_score`
- `total_retries`
- `agent_stats`

清理工件：

- `/cleanup`
- `cleanup_task`

会清理：

- worktree 与分支
- result / score / bundle 文件
- patch 目录
- 事件文件与 job 文件

---

## MCP 工具说明

当前项目提供以下核心工具：

| Tool | 用途 |
|------|------|
| `dispatch_task` | 派发任务到 Codex 或 Gemini |
| `collect_result` | 收集已完成任务的真实结果 |
| `subscribe_task_events` | 订阅单任务事件流 |
| `score_result` | 对任务结果评分 |
| `retry_task` | 使用修复说明重试任务 |
| `cancel_task` | 取消运行中的任务 |
| `task_history` | 查看任务历史与统计 |
| `prepare_merge` | 预览待合并结果 |
| `merge_winner` | 应用结果到当前工作区 |
| `abort_merge` | 中止 merge 流程 |
| `cleanup_task` | 清理任务资源 |
| `list_jobs` | 列出任务记录 |

---

## FAQ

### 1. 为什么 `/watch` 不再推荐在会话里轮询输出？

因为轮询式输出会持续占用模型会话上下文，并且在长任务场景下容易产生大量无意义文本。当前推荐使用 `watch-ui.js` 在本地终端显示固定面板，并由 `task-router` 主动推送事件到 watcher。

### 2. 为什么 watcher 看起来像“刷屏”？

在真实终端里，`watch-ui.js` 使用 ANSI 控制序列做原地刷新；如果你是在某些日志采集环境中观察输出，可能会看到每一帧都被记录下来。

### 3. watcher 支持多任务吗？

支持。示例：

```bash
node .mcp/task-router/watch-ui.js task-001 task-002:gemini task-003
```

### 4. 为什么任务结果是成功的，但 score 偏低？

评分不仅看任务是否成功，还会考虑 `stderr`、结构化输出、`output_schema`、`constraints`、测试情况、scope 等因素。例如某些 CLI 会向 `stderr` 写环境信息，这会影响得分但不一定代表任务失败。

### 5. 修改了 `server.js` 后为什么 watcher 没生效？

因为 OpenCode 连接的 MCP 服务通常是已经启动的旧进程，而 watcher 的实时更新现在依赖这个服务进程内的推送通道。修改 `server.js` 后，需要重启本地 `task-router` 服务。

### 6. `files_scope` 支持 glob 吗？

支持。当前实现已支持相对路径和 glob 模式混用，并用于文件同步与 scope 判断。

### 7. 同一个 `task_id` 能重复派发吗？

运行中的任务不允许同名重入，以避免 worktree 和分支互相覆盖。任务结束后可以再次使用该 `task_id`，但更推荐新任务使用新的唯一 ID。

### 8. 任务为什么没有立刻开始执行？

系统默认最多同时运行 4 个任务。超过上限的任务会进入队列等待空闲槽位，因此“未立刻启动”不一定是异常。

### 9. `/cancel` 和 `/cleanup` 有什么区别？

- `/cancel`：终止还在运行的任务进程，并标记为取消
- `/cleanup`：删除任务相关工件文件和 worktree

一般顺序是：先 `/cancel`，确认不再需要后再 `/cleanup`。

### 10. 事件文件会不会无限增长？

不会。事件文件超过 1MB 后会自动截断，只保留最近 100 行。实时观察请优先使用 `/watch`，长期归档请以结果文件和你自己的记录为准。

---

## 贡献指南

欢迎改进本项目。提交代码前请遵循以下约定。

### 开发原则

- 先读再改，尤其是 `./.mcp/task-router/server.js`
- 保持最小必要改动，避免无关重构
- 修改入口逻辑时，优先补测试
- 修改 `lib/` 中纯函数时，优先写针对性测试

### 本地测试命令

运行全部测试：

```bash
cd .mcp/task-router
npm test
```

运行单个测试文件：

```bash
cd .mcp/task-router
node --test tests/dispatch.test.js
```

运行单个测试用例：

```bash
cd .mcp/task-router
node --test --test-name-pattern="launchDispatch returns pending payload before async work completes" tests/dispatch.test.js
```

### 提交建议

- 确保改动与任务直接相关
- 确保 README、slash command 文档与实际行为一致
- 确保协议字段与结果对象保持兼容
- 提交前至少运行受影响测试，理想情况下运行全量测试

### 文档同步要求

当你修改以下内容时，请同步更新文档：

- `task-router` 工具行为
- `/delegate`、`/watch`、`/cancel`、`/repair`、`/history`、`/merge`、`/cleanup` 的命令语义
- watcher 或 merge 流程

---

## 许可证

本项目使用仓库中的 `LICENSE` 文件作为许可证来源。
