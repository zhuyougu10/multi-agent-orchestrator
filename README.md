# Multi-Agent Orchestrator

Windows 环境下的通用多智能体编排框架，让 OpenCode 作为总控调度器，协调 Codex CLI 和 Gemini CLI 共同完成复杂任务。

## 🚀 AI 一键安装

> **给 AI 运行的命令**：复制下面的命令让 AI 自动完成所有环境配置

```
运行 setup.ps1 脚本完成环境安装，包括：安装 superpowers 技能、安装 planning-with-files 技能、安装 MCP 依赖、验证安装结果
```

或者更详细的指令：

```
执行以下安装步骤：
1. 检查并安装前置依赖（Git、Node.js）
2. 运行 ./setup.ps1 安装项目依赖和技能
3. 安装全局 CLI 工具（@openai/codex、@google/gemini-cli）
4. 验证所有组件是否正确安装
5. 报告安装结果
```

---

## 架构概览

```
用户请求
  ↓
OpenCode (总控/分析/审核)
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
│   │   ├── planner.md
│   │   ├── reviewer.md
│   │   └── executor.md
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
├── AGENTS.md              # 总控规则
├── task_plan.md           # 任务计划
├── findings.md            # 发现记录
├── progress.md            # 进度追踪
├── setup.ps1              # 安装脚本
└── README.md
```

## 安装步骤

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

### 2. 运行安装脚本

```powershell
# 以管理员身份运行 PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup.ps1
```

### 3. 初始化 Git 仓库

```powershell
git init
git add .
git commit -m "init multi-agent orchestrator"
```

### 4. 验证安装

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

### 1. 分析任务

```
/orchestrate
```

OpenCode 会分析需求，创建任务计划文件。

### 2. 分发任务

```
/delegate
```

根据任务类型自动路由到 Codex 或 Gemini。

### 3. 审核结果

```
/review
```

收集结果，评分选优，决定是否需要修复。

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

## 配置说明

### opencode.json

```json
{
  "instructions": ["AGENTS.md"],
  "mcp": {
    "task-router": {
      "type": "local",
      "command": ["node", ".mcp/task-router/server.js"]
    }
  },
  "permission": {
    "task-router__dispatch_task": "allow",
    "task-router__collect_result": "allow",
    ...
  }
}
```

### AGENTS.md

定义多智能体协作规则，包括：
- 强制技能
- 计划规则
- 委托策略
- 合并策略
- 输出格式

## 扩展

### 添加新的 Agent

1. 在 `chooseAgent()` 函数中添加路由规则
2. 在 `buildArgs()` 函数中添加命令构建逻辑
3. 更新 `AGENTS.md` 中的委托策略

### 添加新的 MCP 工具

1. 在 `server.js` 中使用 `server.tool()` 注册新工具
2. 在 `opencode.json` 中添加权限配置
3. 创建对应的命令文件

## 许可证

MIT License
