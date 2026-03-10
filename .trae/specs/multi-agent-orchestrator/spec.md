# Windows 多智能体编排框架 Spec

## Why
在 Windows 环境下构建一个通用的多智能体编排框架，让 OpenCode 作为总控调度器，协调 Codex CLI 和 Gemini CLI 共同完成复杂任务，实现任务自动分发、结果回收、评分选优和安全合并的完整闭环。

## What Changes
- 创建 OpenCode 配置体系（commands、agents、skills、opencode.json）
- 创建自定义 MCP Server（task-router）实现任务路由和执行隔离
- 集成 superpowers 和 planning-with-files 两个必需的 skill
- 实现 Git worktree 隔离执行机制
- 实现三种执行模式（single/fallback/race）
- 实现三种合并策略（patch/cherry-pick/manual-review）
- 创建持久化计划文件系统（task_plan.md、findings.md、progress.md）

## Impact
- Affected specs: 无（新项目）
- Affected code: 全新项目结构

## ADDED Requirements

### Requirement: 项目目录结构
系统 SHALL 提供完整的项目目录结构，包含 OpenCode 配置、MCP 服务器、技能文件和计划文件。

#### Scenario: 目录结构创建
- **WHEN** 用户初始化项目
- **THEN** 系统创建以下目录结构：
  - `.opencode/commands/` - 自定义命令
  - `.opencode/agents/` - 专用代理配置
  - `.opencode/skills/` - 技能目录
  - `.codex/skills/` - Codex 专用技能
  - `.gemini/skills/` - Gemini 专用技能
  - `.mcp/task-router/` - MCP 服务器
  - `.mcp/task-router/work/` - 工作目录（jobs、results、scores、bundles、worktrees）

### Requirement: OpenCode 配置文件
系统 SHALL 提供完整的 OpenCode 配置文件 opencode.json。

#### Scenario: 配置文件加载
- **WHEN** OpenCode 启动
- **THEN** 系统加载包含以下配置的 opencode.json：
  - instructions 指向 AGENTS.md
  - mcp 配置指向 task-router
  - permission 配置所有 MCP 工具权限
  - watcher 忽略配置

### Requirement: AGENTS.md 总控规则
系统 SHALL 提供 AGENTS.md 文件定义多智能体协作规则。

#### Scenario: 规则加载
- **WHEN** OpenCode 处理任务
- **THEN** 系统遵循以下规则：
  - 强制使用 superpowers 和 planning-with-files 技能
  - 按任务类型路由到合适的 agent
  - OpenCode 作为最终审核者
  - 维护计划文件状态

### Requirement: 自定义命令系统
系统 SHALL 提供六个核心自定义命令。

#### Scenario: 命令执行
- **WHEN** 用户执行命令
- **THEN** 系统提供以下命令：
  - `/orchestrate` - 分析需求，生成计划文件
  - `/delegate` - 分发任务给 Codex/Gemini
  - `/review` - 审核结果，评分选优
  - `/repair` - 修复失败任务
  - `/merge` - 合并赢家结果
  - `/finalize` - 清理并完成

### Requirement: 专用代理配置
系统 SHALL 提供三个专用代理配置文件。

#### Scenario: 代理选择
- **WHEN** OpenCode 需要特定角色
- **THEN** 系统提供：
  - `planner.md` - 负责分析和规划
  - `reviewer.md` - 负责审核和评分
  - `executor.md` - 负责执行和修复

### Requirement: MCP Task Router 服务器
系统 SHALL 提供完整的 MCP 服务器实现。

#### Scenario: MCP 工具调用
- **WHEN** OpenCode 调用 MCP 工具
- **THEN** 系统提供以下工具：
  - `dispatch_task` - 分发任务（支持 single/fallback/race 模式）
  - `collect_result` - 收集执行结果
  - `score_result` - 评分结果
  - `retry_task` - 重试失败任务
  - `list_jobs` - 列出所有任务
  - `prepare_merge` - 准备合并
  - `merge_winner` - 执行合并
  - `abort_merge` - 中止合并
  - `cleanup_task` - 清理 worktree

### Requirement: Git Worktree 隔离执行
系统 SHALL 使用 Git worktree 为每个 agent 创建独立执行环境。

#### Scenario: 隔离执行
- **WHEN** 任务被分发到 agent
- **THEN** 系统执行以下步骤：
  - 创建独立 worktree 分支（agent/task-id-agent-name）
  - 在独立目录执行任务
  - 收集 git diff、git status、测试输出
  - 自动提交变更
  - 返回完整结果包

### Requirement: 三种执行模式
系统 SHALL 支持三种任务执行模式。

#### Scenario: Single 模式
- **WHEN** 任务配置为 single 模式
- **THEN** 系统只派发给一个指定 agent

#### Scenario: Fallback 模式
- **WHEN** 任务配置为 fallback 模式
- **THEN** 系统先派发给首选 agent，失败后自动切换到备用 agent

#### Scenario: Race 模式
- **WHEN** 任务配置为 race 模式
- **THEN** 系统同时派发给 Codex 和 Gemini，评分后选择优胜者

### Requirement: 结果评分系统
系统 SHALL 提供自动评分机制。

#### Scenario: 评分计算
- **WHEN** agent 完成任务
- **THEN** 系统根据以下因素计算分数：
  - 退出码（非零扣 50 分）
  - stderr 内容（非空扣 10 分）
  - JSON 合法性（非法扣 25 分）
  - 测试结果（失败扣 20 分）
  - 输出长度（过短扣 10 分）

### Requirement: 三种合并策略
系统 SHALL 支持三种结果合并策略。

#### Scenario: Patch 合并
- **WHEN** 选择 patch 策略
- **THEN** 系统使用 `git format-patch` + `git apply` 合并

#### Scenario: Cherry-pick 合并
- **WHEN** 选择 cherry-pick 策略
- **THEN** 系统使用 `git cherry-pick <sha>` 合并

#### Scenario: Manual-review 合并
- **WHEN** 选择 manual-review 策略
- **THEN** 系统不自动合并，等待人工审核

### Requirement: 计划文件系统
系统 SHALL 维护三个持久化计划文件。

#### Scenario: 状态持久化
- **WHEN** 任务执行过程中
- **THEN** 系统维护：
  - `task_plan.md` - 任务分解和依赖关系
  - `findings.md` - 发现和决策记录
  - `progress.md` - 执行进度追踪

### Requirement: 任务类型路由规则
系统 SHALL 按任务类型自动选择 agent。

#### Scenario: Codex 优先任务
- **WHEN** 任务类型为 implementation、refactor、tests、bugfix、script
- **THEN** 系统优先路由到 Codex

#### Scenario: Gemini 优先任务
- **WHEN** 任务类型为 docs、summarization、comparison、ux-copy
- **THEN** 系统优先路由到 Gemini

### Requirement: Windows 安装脚本
系统 SHALL 提供 PowerShell 安装脚本。

#### Scenario: 一键安装
- **WHEN** 用户运行 setup.ps1
- **THEN** 系统执行：
  - 克隆 superpowers 仓库
  - 创建 plugin 符号链接
  - 创建 skills junction
  - 复制 planning-with-files 到各 agent 目录
  - 初始化 MCP 依赖

### Requirement: Prompt 模板系统
系统 SHALL 提供通用 prompt 模板。

#### Scenario: 实现任务模板
- **WHEN** 执行实现类任务
- **THEN** 系统使用包含约束、交付物、JSON 输出格式的模板

#### Scenario: 文档任务模板
- **WHEN** 执行文档类任务
- **THEN** 系统使用包含约束、交付物、JSON 输出格式的模板

#### Scenario: 修复任务模板
- **WHEN** 执行修复类任务
- **THEN** 系统使用包含问题描述、修复指令、JSON 输出格式的模板
