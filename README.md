# Multi-Agent Orchestrator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.17.0-blue)](https://modelcontextprotocol.io/)

**Windows 环境下的通用多智能体编排框架**，让 OpenCode 作为总控调度器，协调 Codex CLI 和 Gemini CLI 共同完成复杂任务。

---

## 目录

- [项目概述](#项目概述)
- [特性](#特性)
- [技术栈](#技术栈)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [安装指南](#安装指南)
- [使用说明](#使用说明)
- [项目结构](#项目结构)
- [API 参考](#api-参考)
- [配置说明](#配置说明)
- [故障排查](#故障排查)
- [贡献指南](#贡献指南)
- [许可证](#许可证)
- [联系方式](#联系方式)

---

## 项目概述

Multi-Agent Orchestrator 是一个基于 Model Context Protocol (MCP) 的多智能体协作框架。它通过统一的任务路由系统，实现多个 AI Agent 之间的智能调度、并行执行和结果整合。

### 核心价值

- **智能任务路由**：根据任务类型自动选择最合适的 Agent
- **并行执行**：支持多个 Agent 同时处理任务，择优选取结果
- **容错机制**：内置 fallback 机制，确保任务完成率
- **隔离执行**：每个 Agent 在独立的 Git worktree 中工作，避免冲突
- **结果评分**：自动评估执行结果，支持多维度质量检查

---

## 特性

### 🔄 多种执行模式

| 模式 | 描述 | 适用场景 |
|------|------|----------|
| `single` | 单 Agent 执行 | 简单任务、确定性需求 |
| `fallback` | 主备切换执行 | 常规任务、可靠性优先 |
| `race` | 并行竞速执行 | 高价值任务、质量优先 |

### 🎯 智能任务路由

| 任务类型 | 默认 Agent | 执行模式 |
|----------|------------|----------|
| `implementation` | Codex | fallback |
| `refactor` | Codex | fallback |
| `tests` | Codex | fallback |
| `bugfix` | Codex | fallback |
| `docs` | Gemini | fallback |
| `summarization` | Gemini | fallback |
| `comparison` | Gemini | race |
| `ux-copy` | Gemini | fallback |

### 🔌 MCP 工具集

- `dispatch_task` - 任务分发
- `collect_result` - 结果收集
- `subscribe_task_events` - 事件订阅
- `watch_task_group` - 任务面板监控
- `score_result` - 结果评分
- `merge_winner` - 结果合并
- `retry_task` - 任务重试
- `cleanup_task` - 资源清理

---

## 技术栈

### 开发语言

- **JavaScript (ES6+)** - MCP 服务器实现
- **PowerShell** - 安装脚本

### 核心框架

- **[MCP SDK](https://modelcontextprotocol.io/)** - Model Context Protocol 官方 SDK
- **[OpenCode](https://opencode.ai/)** - AI 编程助手平台

### 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@modelcontextprotocol/sdk` | ^1.17.0 | MCP 协议实现 |
| `zod` | ^3.24.1 | 参数验证和 Schema 定义 |

### 外部 CLI 工具

- **[Codex CLI](https://github.com/openai/codex)** - OpenAI 代码生成工具
- **[Gemini CLI](https://github.com/google/gemini-cli)** - Google AI 代码助手

---

## 环境要求

### 必需环境

| 软件 | 最低版本 | 检查命令 |
|------|----------|----------|
| Node.js | 18.0.0 | `node -v` |
| Git | 2.20+ | `git --version` |
| OpenCode | latest | `opencode --version` |

### 可选 CLI 工具

| 软件 | 安装命令 |
|------|----------|
| Codex CLI | `npm install -g @openai/codex` |
| Gemini CLI | `npm install -g @google/gemini-cli` |

### 系统要求

- **操作系统**: Windows 10/11
- **权限**: 管理员权限或开启 Developer Mode（用于创建符号链接）
- **网络**: 需要访问 GitHub 和 npm 仓库

---

## 快速开始

### 一键安装

```powershell
# 下载并运行安装脚本
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/zhuyougu10/multi-agent-orchestrator/master/setup.ps1" -OutFile "setup.ps1"
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup.ps1 -GitHubRepo "zhuyougu10/multi-agent-orchestrator" -Branch "master"
```

### 验证安装

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

---

## 安装指南

### 方法一：自动安装（推荐）

下载 `setup.ps1` 脚本并执行：

```powershell
.\setup.ps1 -GitHubRepo "zhuyougu10/multi-agent-orchestrator" -Branch "master"
```

#### 安装脚本参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-GitHubRepo` | 从指定 GitHub 仓库下载项目组件 | 空 |
| `-Branch` | 下载的分支 | `master` |
| `-SkipGlobalSkills` | 跳过全局技能安装 | `$false` |
| `-SkipMCP` | 跳过 MCP 依赖安装 | `$false` |
| `-Force` | 强制覆盖已存在的文件 | `$false` |

#### 使用示例

```powershell
# 完整安装
.\setup.ps1 -GitHubRepo "zhuyougu10/multi-agent-orchestrator" -Branch "master"

# 只安装技能，不下载项目组件
.\setup.ps1

# 强制覆盖已存在的文件
.\setup.ps1 -GitHubRepo "zhuyougu10/multi-agent-orchestrator" -Branch "master" -Force
```

### 方法二：手动安装

#### 1. 安装前置依赖

```powershell
# 安装 Git
winget install Git.Git

# 安装 Node.js
winget install OpenJS.NodeJS.LTS

# 安装 Codex CLI
npm install -g @openai/codex

# 安装 Gemini CLI
npm install -g @google/gemini-cli
```

#### 2. 克隆项目

```powershell
git clone https://github.com/zhuyougu10/multi-agent-orchestrator.git
cd multi-agent-orchestrator
```

#### 3. 安装 MCP 依赖

```powershell
cd .mcp/task-router
npm install
```

#### 4. 配置 OpenCode

确保 `.opencode/opencode.json` 配置正确：

```json
{
  "skills": {
    "superpowers": { "enabled": true },
    "planning-with-files": { "enabled": true }
  },
  "mcp": {
    "task-router": {
      "type": "local",
      "enabled": true,
      "command": ["node", ".mcp/task-router/server.js"]
    }
  }
}
```

---

## 使用说明

### 启用多智能体模式

默认情况下，OpenCode 保持普通模式。如需启用多智能体编排，请显式切换到 `orchestrator` agent：

```
使用 orchestrator agent 执行任务
```

### 工作流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ /orchestrate│ ──▶ │  /delegate  │ ──▶ │   /watch    │
│  分析任务    │     │  分发任务    │     │  监控面板   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  /finalize  │ ◀── │   /merge    │ ◀── │   /review   │
│  清理完成    │     │  合并结果    │     │  审核结果   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 命令详解

#### `/orchestrate` - 任务分析

分析需求，创建任务计划文件。

```
/orchestrate
```

生成文件：
- `task_plan.md` - 任务分解计划
- `findings.md` - 调研发现
- `progress.md` - 执行进度

#### `/delegate` - 任务分发

根据任务类型自动路由到 Codex 或 Gemini。

```
/delegate
```

特性：
- 自动选择最佳 Agent
- 创建独立 Git worktree
- 支持文件范围限制

#### `/watch` - 任务监控

阻塞式任务面板，实时显示任务状态。

```
/watch
```

面板示例：

```
Tasks: 2 total | running: 1 | completed: 1 | failed: 0

task-a | gemini | running   | 2026-03-12T12:00:05Z | heartbeat
task-b | codex  | completed | 2026-03-12T12:00:08Z | completed
```

#### `/review` - 结果审核

收集结果，评分选优，决定是否需要修复。

```
/review
```

评分维度：
- JSON 输出有效性
- Schema 符合度
- 测试通过率
- 文件范围合规性

#### `/merge` - 结果合并

使用 patch 或 cherry-pick 策略合并结果。

```
/merge
```

合并策略：

| 策略 | 适用场景 |
|------|----------|
| `patch` | 文档、小改动 |
| `cherry-pick` | 代码实现、测试 |
| `manual-review` | 高风险、大范围改动 |

#### `/finalize` - 完成清理

清理 worktree，更新进度，生成最终报告。

```
/finalize
```

### 使用示例

#### 示例 1：实现新功能

```
使用 orchestrator agent 实现用户认证功能：
1. 先调用 /orchestrate 分析需求
2. 调用 /delegate 分发任务
3. 调用 /watch 等待完成
4. 完成后执行 /review、/merge、/finalize
```

#### 示例 2：编写文档

```
使用 orchestrator agent 编写 API 文档：
1. /orchestrate
2. /delegate（自动路由到 Gemini）
3. /watch
4. /review
5. /merge（使用 patch 策略）
6. /finalize
```

---

## 项目结构

```
multi-agent-orchestrator/
├── .opencode/                    # OpenCode 配置目录
│   ├── agents/
│   │   └── orchestrator.md       # 编排器 Agent 配置
│   ├── commands/                 # 自定义命令
│   │   ├── orchestrate.md
│   │   ├── delegate.md
│   │   ├── watch.md
│   │   ├── review.md
│   │   ├── repair.md
│   │   ├── merge.md
│   │   └── finalize.md
│   ├── skills/
│   │   └── planning-with-files/  # 规划技能
│   └── opencode.json             # OpenCode 主配置
├── .codex/                       # Codex 专用配置
│   └── skills/
├── .gemini/                      # Gemini 专用配置
│   └── skills/
├── .mcp/                         # MCP 服务器
│   └── task-router/
│       ├── server.js             # MCP 服务器入口
│       ├── dispatch.js           # 任务分发逻辑
│       ├── runtime.js            # 运行时环境
│       ├── runner.js             # Agent 执行器
│       ├── lib/                  # 工具库
│       │   ├── paths.js          # 路径管理
│       │   ├── process.js        # 进程管理
│       │   ├── storage.js        # 存储工具
│       │   ├── validation.js     # 验证工具
│       │   ├── result-utils.js   # 结果处理
│       │   ├── task-events.js    # 事件系统
│       │   └── task-panel.js     # 任务面板
│       ├── tests/                # 测试文件
│       └── work/                 # 工作目录
│           ├── jobs/             # 任务定义
│           ├── results/          # 执行结果
│           ├── scores/           # 评分记录
│           └── bundles/          # 结果包
├── templates/                    # Prompt 模板
│   ├── implementation-template.md
│   ├── docs-template.md
│   └── repair-template.md
├── docs/                         # 文档目录
├── setup.ps1                     # 安装脚本
├── README.md                     # 项目说明
└── AGENTS.md                     # 项目自定义说明
```

---

## API 参考

### MCP 工具

#### `dispatch_task`

分发任务到指定的 Agent。

**参数：**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `task_id` | string | 是 | 任务唯一标识 |
| `task_type` | string | 是 | 任务类型 |
| `cwd` | string | 是 | 工作目录 |
| `prompt` | string | 是 | 任务提示词 |
| `files_scope` | string[] | 否 | 文件范围限制 |
| `preferred_agent` | string | 否 | 指定 Agent（默认 auto） |
| `mode` | string | 否 | 执行模式（默认 fallback） |
| `test_command` | string | 否 | 测试命令 |
| `output_schema` | object | 否 | 输出 Schema |

**返回：**

```json
{
  "task_id": "string",
  "agent": "string",
  "status": "dispatched"
}
```

#### `collect_result`

收集任务执行结果。

**参数：**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `task_id` | string | 是 | 任务 ID |
| `agent` | string | 否 | 指定 Agent |

#### `subscribe_task_events`

订阅任务事件流。

**参数：**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `task_id` | string | 是 | 任务 ID |
| `agent` | string | 否 | 指定 Agent |
| `cursor` | number | 否 | 事件游标（默认 0） |
| `wait_ms` | number | 否 | 等待时间（默认 5500） |

**事件类型：**

- `started` - 任务开始
- `heartbeat` - 心跳（每 5 秒）
- `stdout` - 标准输出
- `stderr` - 标准错误
- `tests_started` - 测试开始
- `tests_completed` - 测试完成
- `completed` - 任务完成
- `failed` - 任务失败

#### `score_result`

评估任务结果。

**参数：**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `task_id` | string | 是 | 任务 ID |
| `agent` | string | 是 | Agent 名称 |
| `output_schema` | object | 否 | 输出 Schema |
| `files_scope` | string[] | 否 | 文件范围 |

**评分规则：**

| 扣分项 | 分值 |
|--------|------|
| 命令超时 | -40 |
| 测试失败 | -20 |
| stderr 非空 | -10 |
| JSON 无效 | -20 |
| Schema 不匹配 | -20 |
| 超出文件范围 | -15 |

#### `merge_winner`

合并获胜结果。

**参数：**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `cwd` | string | 是 | 工作目录 |
| `task_id` | string | 是 | 任务 ID |
| `agent` | string | 是 | Agent 名称 |
| `strategy` | string | 否 | 合并策略（默认 patch） |

---

## 配置说明

### opencode.json

```json
{
  "$schema": "https://opencode.ai/config.json",
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
    "bash": "allow",
    "edit": "allow",
    "write": "allow",
    "task-router__dispatch_task": "allow",
    "task-router__collect_result": "allow",
    "task-router__subscribe_task_events": "allow",
    "task-router__score_result": "allow",
    "task-router__retry_task": "allow",
    "task-router__list_jobs": "allow",
    "task-router__prepare_merge": "allow",
    "task-router__merge_winner": "allow",
    "task-router__abort_merge": "allow",
    "task-router__cleanup_task": "allow"
  },
  "watcher": {
    "ignore": [
      "node_modules/**",
      "dist/**",
      ".git/**",
      ".mcp/task-router/work/**"
    ]
  }
}
```

### AGENTS.md

项目自定义说明文件，用于存放项目特定的指令和说明。该文件不会被自动加载，可以自由添加个人或项目级默认指令。

---

## 故障排查

### OpenCode 看不到 superpowers

**检查符号链接：**

```powershell
Get-ChildItem "$env:USERPROFILE\.config\opencode\plugins" | Where-Object { $_.LinkType }
Get-ChildItem "$env:USERPROFILE\.config\opencode\skills" | Where-Object { $_.LinkType }
```

**解决方案：**
- 以管理员身份运行 PowerShell
- 或开启 Windows Developer Mode

### Windows 无法创建符号链接

**解决方案：**
- 以管理员身份运行 PowerShell
- 或开启 Windows Developer Mode（设置 → 更新和安全 → 开发者选项）

### Worktree 创建失败

**检查项：**
1. 确保仓库已初始化 Git
2. 确保工作区干净
3. 检查是否有残留分支

**清理命令：**

```powershell
git worktree list
git worktree remove --force <path>
```

### Cherry-pick 冲突

```powershell
# 中止当前合并
git cherry-pick --abort

# 或手动解决冲突后继续
git cherry-pick --continue
```

### MCP 服务器启动失败

**检查依赖：**

```powershell
cd .mcp/task-router
npm install
```

**检查 Node.js 版本：**

```powershell
node -v  # 需要 >= 18.0.0
```

### GitHub API 限流

**设置 Token：**

```powershell
$env:GITHUB_TOKEN = "your-github-token"
.\setup.ps1 -GitHubRepo "zhuyougu10/multi-agent-orchestrator" -Branch "master"
```

---

## 贡献指南

我们欢迎所有形式的贡献！

### 开发环境设置

```powershell
# 克隆仓库
git clone https://github.com/zhuyougu10/multi-agent-orchestrator.git
cd multi-agent-orchestrator

# 安装依赖
cd .mcp/task-router
npm install

# 运行测试
npm test
```

### 代码规范

- **JavaScript**: 遵循 [Standard](https://standardjs.com/) 规范
- **提交信息**: 遵循 [Conventional Commits](https://www.conventionalcommits.org/)
- **文档**: 使用中文编写，保持简洁清晰

### 提交规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型（type）：**

- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例：**

```
feat(task-router): add retry mechanism for failed tasks

- Implement exponential backoff retry
- Add max retry count configuration
- Update error handling logic

Closes #123
```

### PR 流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### PR 检查清单

- [ ] 代码通过所有测试
- [ ] 更新相关文档
- [ ] 遵循代码规范
- [ ] 提交信息符合规范
- [ ] 无合并冲突

---

## 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

```
MIT License

Copyright (c) 2026 Multi-Agent Orchestrator Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 联系方式

### 问题反馈

- **Issues**: [GitHub Issues](https://github.com/zhuyougu10/multi-agent-orchestrator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/zhuyougu10/multi-agent-orchestrator/discussions)

### 维护者

- **GitHub**: [@zhuyougu10](https://github.com/zhuyougu10)

---

<p align="center">
  <strong>如果这个项目对你有帮助，请给一个 ⭐️ Star！</strong>
</p>
