# Multi-Agent Orchestrator

Windows 环境下的通用多智能体编排框架，让 OpenCode 作为总控调度器，协调 Codex CLI 和 Gemini CLI 共同完成复杂任务。

## 🚀 AI 一键安装

> **给 AI 运行的命令**：复制下面的命令让 AI 自动完成所有环境配置

### 一行命令安装（推荐）

```
下载 https://raw.githubusercontent.com/zhuyougu10/multi-agent-orchestrator/master/setup.ps1 到当前目录，然后运行它安装多智能体编排框架的所有依赖，安装之后删除脚本
```

### 详细安装指令

```
执行以下步骤完成多智能体编排框架的安装：

1. 检查前置依赖
   - 确认已安装 Node.js (>= 18)
   - 确认已安装 Git
   - 如未安装，使用 winget 安装

2. 下载安装脚本
   从 https://raw.githubusercontent.com/zhuyougu10/multi-agent-orchestrator/master/setup.ps1 下载脚本到当前目录

3. 运行安装脚本
   执行: ./setup.ps1 -GitHubRepo "zhuyougu10/multi-agent-orchestrator" -Branch "master"
   这将安装：
   - superpowers 技能（全局 OpenCode）
   - planning-with-files 技能（项目级）
   - 项目配置文件（.opencode/、AGENTS.md、templates/）
   - MCP task-router 服务

4. 安装 CLI 工具
   - npm install -g @openai/codex
   - npm install -g @google/gemini-cli

5. 验证安装结果并报告
```

---

## 安装脚本参数

```powershell
.\setup.ps1 [-GitHubRepo <repo>] [-Branch <branch>] [-SkipGlobalSkills] [-SkipMCP] [-Force]
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-GitHubRepo` | 从指定 GitHub 仓库下载项目组件 | 空（不下载） |
| `-Branch` | 下载的分支 | `master` |
| `-SkipGlobalSkills` | 跳过全局技能安装 | `$false` |
| `-SkipMCP` | 跳过 MCP 依赖安装 | `$false` |
| `-Force` | 强制覆盖已存在的文件 | `$false` |

### 使用示例

```powershell
# 完整安装（推荐）
.\setup.ps1 -GitHubRepo "zhuyougu10/multi-agent-orchestrator" -Branch "master"

# 只安装技能，不下载项目组件
.\setup.ps1

# 只安装项目配置，跳过全局技能（适合已有 superpowers 的用户）
.\setup.ps1 -GitHubRepo "zhuyougu10/multi-agent-orchestrator" -Branch "master" -SkipGlobalSkills

# 强制覆盖已存在的文件
.\setup.ps1 -GitHubRepo "zhuyougu10/multi-agent-orchestrator" -Branch "master" -Force
```

---

## 架构概览

默认情况下，OpenCode 会保持正常状态，不会自动启用本仓库的多智能体编排规则。

如需启用本项目工作流，请显式使用 `.opencode/agents/orchestrator.md` 对应的 `orchestrator` agent；只有在使用该 agent 时，仓库内的多智能体规则才会生效。

```
用户请求
  ↓
OpenCode / orchestrator agent
   ├─ skills: superpowers
   ├─ skills: planning-with-files
   ├─ commands: /orchestrate, /delegate, /review, /repair, /merge, /finalize
   └─ MCP: task-router
       ├─ dispatch_task()
       ├─ collect_result()
       ├─ score_result()
       └─ merge_winner()
              ├─ codex CLI (独立 worktree)
              └─ gemini CLI (独立 worktree)
```

## 项目结构

```
.
├── .opencode/
│   ├── commands/          # 自定义命令
│   │   ├── orchestrate.md
│   │   ├── delegate.md
│   │   ├── review.md
│   │   ├── repair.md
│   │   ├── merge.md
│   │   └── finalize.md
│   ├── agents/            # 专用代理配置
│   │   └── orchestrator.md
│   ├── skills/            # 技能目录
│   └── opencode.json      # OpenCode 配置
├── .codex/
│   └── skills/            # Codex 专用技能
├── .gemini/
│   └── skills/            # Gemini 专用技能
├── .mcp/
│   └── task-router/       # MCP 服务器
│       ├── package.json
│       ├── server.js
│       └── work/          # 工作目录
├── templates/             # Prompt 模板
│   ├── implementation-template.md
│   ├── docs-template.md
│   └── repair-template.md
├── AGENTS.md              # 用户自定义项目说明
├── setup.ps1              # 安装脚本
└── README.md
```

## 手动安装步骤

### 1. 安装前置依赖

```powershell
# 安装 Git (如果未安装)
winget install Git.Git

# 安装 Node.js (如果未安装)
winget install OpenJS.NodeJS.LTS

# 安装 OpenCode (如果未安装)
# 参考: https://opencode.ai

# 安装 Codex CLI
npm install -g @openai/codex

# 安装 Gemini CLI
npm install -g @google/gemini-cli
```

### 2. 下载并运行安装脚本

```powershell
# 下载脚本
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/zhuyougu10/multi-agent-orchestrator/master/setup.ps1" -OutFile "setup.ps1"

# 运行脚本（允许执行策略）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup.ps1 -GitHubRepo "zhuyougu10/multi-agent-orchestrator" -Branch "master"
```

### 3. 验证安装

```powershell
# 检查 CLI 工具
codex --help
gemini --help

# 检查 Node.js
node -v
npm -v

# 启动 OpenCode
opencode
```

## 使用流程

### 启用方式

- 默认：直接使用 OpenCode，保持普通模式
- 多智能体模式：显式切换到 `orchestrator` agent，再执行下面的工作流命令

### `orchestrator` 使用示例

```text
使用 orchestrator agent 分析并执行这个需求：
1. 先调用 /orchestrate 拆解任务
2. 再调用 /delegate 分发给 Codex 或 Gemini
3. 完成后依次执行 /review、/merge、/finalize
```

### 1. 分析任务

```
/orchestrate
```

OpenCode 会分析需求，创建任务计划文件。

### 2. 分发任务

```
/delegate
```

根据任务类型自动路由到 Codex 或 Gemini，并进入阻塞式任务面板。

- 分发完成后会显示任务列表面板
- 面板会周期性刷新，展示每个任务的状态、最近心跳、最近事件
- 只要还有任务未进入 `completed` 或 `failed`，`/delegate` 就不会结束
- 只有当所有任务都结束后，agent 才会进入下一步动作，例如 `/review`

### 3. 审核结果

```
/review
```

在 `/delegate` 已经等待所有任务结束之后，收集结果，评分选优，决定是否需要修复。

### 4. 合并结果

```
/merge
```

使用 patch 或 cherry-pick 策略合并赢家结果。

### 5. 完成清理

```
/finalize
```

清理 worktree，更新进度，生成最终报告。

## 任务类型路由

| 任务类型 | 默认 Agent | 默认模式 |
|----------|------------|----------|
| implementation | Codex | fallback |
| refactor | Codex | fallback |
| tests | Codex | fallback |
| bugfix | Codex | fallback |
| script | Codex | fallback |
| docs | Gemini | fallback |
| summarization | Gemini | fallback |
| comparison | Gemini | race |
| ux-copy | Gemini | fallback |

### 领域偏好

- 前端任务默认偏向 Gemini，例如 UI、交互、页面呈现、用户体验文案
- 后端任务默认偏向 Codex，例如 API、服务逻辑、数据处理、持久化、测试驱动实现
- 全栈需求建议先拆成前端/后端两个有明确 `files_scope` 的任务，再分别分发

## 执行模式

| 模式 | 说明 |
|------|------|
| single | 只派给一个 agent |
| fallback | 先派首选，失败后切换备用 |
| race | 同时派给两个 agent，择优 |

## 合并策略

| 策略 | 适用场景 |
|------|----------|
| patch | 文档、小改动 |
| cherry-pick | 代码实现、测试 |
| manual-review | 高风险、大范围改动 |

## 故障排查

### OpenCode 看不到 superpowers

1. 检查符号链接是否正确创建：
   ```powershell
   Get-ChildItem "$env:USERPROFILE\.config\opencode\plugins" | Where-Object { $_.LinkType }
   Get-ChildItem "$env:USERPROFILE\.config\opencode\skills" | Where-Object { $_.LinkType }
   ```

2. 确保以管理员权限运行或开启 Developer Mode

### Windows 无法创建符号链接

- 以管理员身份运行 PowerShell
- 或开启 Windows Developer Mode

### Worktree 创建失败

1. 确保仓库已初始化 Git
2. 确保工作区干净
3. 检查是否有残留分支

### Cherry-pick 冲突

```powershell
# 中止当前合并
git cherry-pick --abort

# 或手动解决冲突后继续
git cherry-pick --continue
```

### MCP 服务器启动失败

1. 检查依赖是否安装：
   ```powershell
   cd .mcp/task-router
   npm install
   ```

2. 检查 Node.js 版本（需要 >= 18）

### GitHub API 限流

如果遇到 GitHub API 限流，可以设置 GITHUB_TOKEN 环境变量：

```powershell
$env:GITHUB_TOKEN = "your-github-token"
.\setup.ps1 -GitHubRepo "zhuyougu10/multi-agent-orchestrator" -Branch "master"
```

## 配置说明

### opencode.json

```json
{
  "skills": {
    "superpowers": {
      "enabled": true
    },
    "planning-with-files": {
      "enabled": true
    }
  },
  "mcp": {
    "task-router": {
      "type": "local",
      "enabled": true,
      "command": ["node", ".mcp/task-router/server.js"]
    }
  },
  "permission": {
    "skill": "ask",
    "task-router__dispatch_task": "allow",
    "task-router__collect_result": "allow",
    "task-router__subscribe_task_events": "allow",
    ...
  }
}
```

### AGENTS.md

用户自定义项目常驻说明文件。

- 不再由 `opencode.json` 自动加载
- 可以自由添加你的个人或项目级默认指令
- 本仓库的多智能体编排规则已迁移到 `.opencode/agents/orchestrator.md`

### skill 权限

- 当前配置为 `"skill": "ask"`
- 触发技能前默认询问，而不是直接自动放行

## 扩展

### 添加新的 Agent

1. 在 `chooseAgent()` 函数中添加路由规则
2. 在 `buildArgs()` 函数中添加命令构建逻辑
3. 如需更新仓库编排策略，修改 `.opencode/agents/orchestrator.md`

### 添加新的 MCP 工具

1. 在 `server.js` 中使用 `server.tool()` 注册新工具
2. 在 `opencode.json` 中添加权限配置
3. 创建对应的命令文件

### 实时事件订阅

- `dispatch_task` 负责启动后台任务并立即返回
- `subscribe_task_events` 可单独订阅任务事件
- 运行中的任务会每 5 秒发送一次 `heartbeat` 事件
- 任务结束时会返回 `completed` 或 `failed` 事件

#### 典型使用流程

```text
1. 调用 task-router.dispatch_task
   - 获取 task_id

2. 循环调用 task-router.subscribe_task_events
   - 首次使用 cursor=0
   - 后续使用上一次返回的 next_cursor

3. 处理返回事件
   - started: 任务已开始
   - heartbeat: agent 仍在线执行
   - stdout / stderr: 运行输出
   - tests_started / tests_completed: 测试阶段事件

4. 收到 completed 或 failed 后停止订阅

5. 如需最终结构化结果，再调用 task-router.collect_result
```

#### 事件返回示例

```json
{
  "task_id": "demo-task",
  "agent": "codex",
  "events": [
    {
      "cursor": 3,
      "event": {
        "task_id": "demo-task",
        "agent": "codex",
        "event_type": "heartbeat",
        "timestamp": "2026-03-12T12:00:05.000Z",
        "phase": "agent_run"
      }
    }
  ],
  "next_cursor": 3,
  "done": false,
  "source": "live-stream"
}
```

## 许可证

MIT License
