# Tasks

## Phase 1: 项目初始化

- [x] Task 1: 创建项目目录结构
  - [x] SubTask 1.1: 创建 .opencode 目录结构（commands、agents、skills）
  - [x] SubTask 1.2: 创建 .codex/skills 目录
  - [x] SubTask 1.3: 创建 .gemini/skills 目录
  - [x] SubTask 1.4: 创建 .mcp/task-router 目录结构（work/jobs、work/results、work/scores、work/bundles、work/worktrees）

- [x] Task 2: 创建 OpenCode 配置文件
  - [x] SubTask 2.1: 创建 .opencode/opencode.json 配置文件
  - [x] SubTask 2.2: 配置 instructions 指向 AGENTS.md
  - [x] SubTask 2.3: 配置 mcp 指向 task-router
  - [x] SubTask 2.4: 配置所有 MCP 工具权限
  - [x] SubTask 2.5: 配置 watcher 忽略规则

## Phase 2: 核心规则文件

- [x] Task 3: 创建 AGENTS.md 总控规则文件
  - [x] SubTask 3.1: 定义强制技能规则
  - [x] SubTask 3.2: 定义计划规则
  - [x] SubTask 3.3: 定义委托策略
  - [x] SubTask 3.4: 定义合并策略
  - [x] SubTask 3.5: 定义输出格式

- [x] Task 4: 创建计划文件模板
  - [x] SubTask 4.1: 创建 task_plan.md 模板
  - [x] SubTask 4.2: 创建 findings.md 模板
  - [x] SubTask 4.3: 创建 progress.md 模板

## Phase 3: 自定义命令

- [x] Task 5: 创建 orchestrate.md 命令
  - [x] SubTask 5.1: 定义分析需求流程
  - [x] SubTask 5.2: 定义计划文件生成步骤
  - [x] SubTask 5.3: 定义任务分解规则

- [x] Task 6: 创建 delegate.md 命令
  - [x] SubTask 6.1: 定义任务读取流程
  - [x] SubTask 6.2: 定义路由规则
  - [x] SubTask 6.3: 定义 MCP 调用方式

- [x] Task 7: 创建 review.md 命令
  - [x] SubTask 7.1: 定义结果收集流程
  - [x] SubTask 7.2: 定义评分检查项
  - [x] SubTask 7.3: 定义审核标准

- [x] Task 8: 创建 repair.md 命令
  - [x] SubTask 8.1: 定义失败检测逻辑
  - [x] SubTask 8.2: 定义修复派发流程
  - [x] SubTask 8.3: 定义重试限制

- [x] Task 9: 创建 merge.md 命令
  - [x] SubTask 9.1: 定义策略选择逻辑
  - [x] SubTask 9.2: 定义 prepare_merge 调用
  - [x] SubTask 9.3: 定义 merge_winner 调用

- [x] Task 10: 创建 finalize.md 命令
  - [x] SubTask 10.1: 定义清理 worktree 流程
  - [x] SubTask 10.2: 定义进度更新步骤
  - [x] SubTask 10.3: 定义最终输出格式

## Phase 4: 专用代理配置

- [x] Task 11: 创建 planner.md 代理配置
  - [x] SubTask 11.1: 定义规划者角色
  - [x] SubTask 11.2: 定义可用工具
  - [x] SubTask 11.3: 定义输出规范

- [x] Task 12: 创建 reviewer.md 代理配置
  - [x] SubTask 12.1: 定义审核者角色
  - [x] SubTask 12.2: 定义审核标准
  - [x] SubTask 12.3: 定义决策权限

- [x] Task 13: 创建 executor.md 代理配置
  - [x] SubTask 13.1: 定义执行者角色
  - [x] SubTask 13.2: 定义执行范围
  - [x] SubTask 13.3: 定义修复能力

## Phase 5: MCP Task Router 服务器

- [x] Task 14: 创建 MCP 服务器基础结构
  - [x] SubTask 14.1: 创建 package.json
  - [x] SubTask 14.2: 定义依赖（@modelcontextprotocol/sdk、zod）
  - [x] SubTask 14.3: 定义启动脚本

- [x] Task 15: 实现服务器核心功能
  - [x] SubTask 15.1: 实现目录初始化（work、jobs、results、scores、bundles、worktrees）
  - [x] SubTask 15.2: 实现 JSON 读写辅助函数
  - [x] SubTask 15.3: 实现命令执行函数（spawn）

- [x] Task 16: 实现 Git Worktree 管理
  - [x] SubTask 16.1: 实现 createWorktree 函数
  - [x] SubTask 16.2: 实现 removeWorktree 函数
  - [x] SubTask 16.3: 实现 captureGitArtifacts 函数（status、diff、diff-stat）

- [x] Task 17: 实现任务路由逻辑
  - [x] SubTask 17.1: 实现 chooseAgent 函数（按任务类型选择）
  - [x] SubTask 17.2: 实现 alternateAgent 函数
  - [x] SubTask 17.3: 实现 buildArgs 函数（codex/gemini 命令构建）

- [x] Task 18: 实现评分系统
  - [x] SubTask 18.1: 实现 safeJsonParse 函数
  - [x] SubTask 18.2: 实现 validateOutputShape 函数
  - [x] SubTask 18.3: 实现 computeScore 函数（综合评分）

- [x] Task 19: 实现三种执行模式
  - [x] SubTask 19.1: 实现 runSingle 模式
  - [x] SubTask 19.2: 实现 runFallback 模式
  - [x] SubTask 19.3: 实现 runRace 模式

- [x] Task 20: 实现 MCP 工具 - dispatch_task
  - [x] SubTask 20.1: 定义输入 schema（task_id、task_type、cwd、prompt、mode 等）
  - [x] SubTask 20.2: 实现任务分发逻辑
  - [x] SubTask 20.3: 实现结果文件生成

- [x] Task 21: 实现 MCP 工具 - collect_result
  - [x] SubTask 21.1: 实现结果文件读取
  - [x] SubTask 21.2: 实现错误处理

- [x] Task 22: 实现 MCP 工具 - score_result
  - [x] SubTask 22.1: 实现评分计算
  - [x] SubTask 22.2: 实现评分文件写入

- [x] Task 23: 实现 MCP 工具 - retry_task
  - [x] SubTask 23.1: 实现任务读取
  - [x] SubTask 23.2: 实现修复 prompt 构建
  - [x] SubTask 23.3: 实现重新执行

- [x] Task 24: 实现 MCP 工具 - list_jobs
  - [x] SubTask 24.1: 实现任务列表读取

- [x] Task 25: 实现合并相关工具
  - [x] SubTask 25.1: 实现 gitCommitAll 函数
  - [x] SubTask 25.2: 实现 getHeadSha 函数
  - [x] SubTask 25.3: 实现 makePatch 函数
  - [x] SubTask 25.4: 实现 applyPatchCheck 函数
  - [x] SubTask 25.5: 实现 applyPatch 函数
  - [x] SubTask 25.6: 实现 cherryPickCommit 函数
  - [x] SubTask 25.7: 实现 abortCherryPick 函数

- [x] Task 26: 实现 MCP 工具 - prepare_merge
  - [x] SubTask 26.1: 实现策略选择
  - [x] SubTask 26.2: 实现 patch 生成
  - [x] SubTask 26.3: 返回合并准备信息

- [x] Task 27: 实现 MCP 工具 - merge_winner
  - [x] SubTask 27.1: 实现 patch 合并逻辑
  - [x] SubTask 27.2: 实现 cherry-pick 合并逻辑
  - [x] SubTask 27.3: 实现错误处理

- [x] Task 28: 实现 MCP 工具 - abort_merge
  - [x] SubTask 28.1: 实现 cherry-pick 中止
  - [x] SubTask 28.2: 实现清理逻辑

- [x] Task 29: 实现 MCP 工具 - cleanup_task
  - [x] SubTask 29.1: 实现 worktree 清理
  - [x] SubTask 29.2: 实现分支删除

- [x] Task 30: 实现 runInWorktree 核心函数
  - [x] SubTask 30.1: 创建 worktree
  - [x] SubTask 30.2: 执行 agent 命令
  - [x] SubTask 30.3: 运行测试
  - [x] SubTask 30.4: 收集 git artifacts
  - [x] SubTask 30.5: 自动提交
  - [x] SubTask 30.6: 计算评分
  - [x] SubTask 30.7: 生成 bundle

## Phase 6: 安装脚本

- [x] Task 31: 创建 setup.ps1 安装脚本
  - [x] SubTask 31.1: 定义项目路径变量
  - [x] SubTask 31.2: 克隆 superpowers 仓库
  - [x] SubTask 31.3: 创建 plugin 符号链接
  - [x] SubTask 31.4: 创建 skills junction
  - [x] SubTask 31.5: 克隆 planning-with-files 仓库
  - [x] SubTask 31.6: 复制 planning-with-files 到各 agent 目录
  - [x] SubTask 31.7: 验证链接正确性

## Phase 7: Prompt 模板

- [x] Task 32: 创建 prompt 模板文件
  - [x] SubTask 32.1: 创建实现任务模板（implementation-template.md）
  - [x] SubTask 32.2: 创建文档任务模板（docs-template.md）
  - [x] SubTask 32.3: 创建修复任务模板（repair-template.md）

## Phase 8: 验证和测试

- [x] Task 33: 创建 README.md 使用说明
  - [x] SubTask 33.1: 说明项目结构
  - [x] SubTask 33.2: 说明安装步骤
  - [x] SubTask 33.3: 说明使用流程
  - [x] SubTask 33.4: 说明故障排查

# Task Dependencies

- Task 2 依赖 Task 1
- Task 3 依赖 Task 1
- Task 4 依赖 Task 1
- Task 5-10 依赖 Task 1
- Task 11-13 依赖 Task 1
- Task 14-30 依赖 Task 1
- Task 31 依赖 Task 14
- Task 32 依赖 Task 1
- Task 33 依赖 Task 1-32

# Parallelizable Tasks

以下任务可以并行执行：
- Task 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13（都依赖 Task 1，但彼此独立）
- Task 15-29（MCP 服务器内部，可以按模块并行）
- Task 32, 33（独立任务）
