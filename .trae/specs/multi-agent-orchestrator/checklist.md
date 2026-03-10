# Checklist

## Phase 1: 项目初始化

- [x] 项目目录结构已创建完整
- [x] .opencode 目录包含 commands、agents、skills 子目录
- [x] .codex/skills 目录已创建
- [x] .gemini/skills 目录已创建
- [x] .mcp/task-router 目录结构完整（包含 work 子目录）

## Phase 2: OpenCode 配置

- [x] .opencode/opencode.json 配置文件存在
- [x] instructions 正确指向 AGENTS.md
- [x] mcp 配置正确指向 task-router
- [x] 所有 MCP 工具权限已配置
- [x] watcher 忽略规则已配置

## Phase 3: 核心规则文件

- [x] AGENTS.md 文件存在且内容完整
- [x] 强制技能规则已定义
- [x] 计划规则已定义
- [x] 委托策略已定义
- [x] 合并策略已定义
- [x] 输出格式已定义

## Phase 4: 计划文件模板

- [x] task_plan.md 模板存在
- [x] findings.md 模板存在
- [x] progress.md 模板存在

## Phase 5: 自定义命令

- [x] orchestrate.md 命令文件存在
- [x] delegate.md 命令文件存在
- [x] review.md 命令文件存在
- [x] repair.md 命令文件存在
- [x] merge.md 命令文件存在
- [x] finalize.md 命令文件存在
- [x] 所有命令包含正确的 frontmatter 和内容

## Phase 6: 专用代理配置

- [x] planner.md 代理配置存在
- [x] reviewer.md 代理配置存在
- [x] executor.md 代理配置存在

## Phase 7: MCP 服务器

- [x] .mcp/task-router/package.json 存在
- [x] .mcp/task-router/server.js 存在
- [x] package.json 包含正确依赖（@modelcontextprotocol/sdk、zod）
- [x] 服务器实现所有必需工具

### MCP 工具验证

- [x] dispatch_task 工具实现正确
- [x] collect_result 工具实现正确
- [x] score_result 工具实现正确
- [x] retry_task 工具实现正确
- [x] list_jobs 工具实现正确
- [x] prepare_merge 工具实现正确
- [x] merge_winner 工具实现正确
- [x] abort_merge 工具实现正确
- [x] cleanup_task 工具实现正确

### 执行模式验证

- [x] single 模式实现正确
- [x] fallback 模式实现正确
- [x] race 模式实现正确

### Git Worktree 验证

- [x] createWorktree 函数实现正确
- [x] removeWorktree 函数实现正确
- [x] captureGitArtifacts 函数实现正确

### 评分系统验证

- [x] 评分算法实现正确（退出码、stderr、JSON、测试、输出长度）
- [x] 评分结果正确写入文件

### 合并策略验证

- [x] patch 合并实现正确
- [x] cherry-pick 合并实现正确
- [x] 合并错误处理正确

## Phase 8: 安装脚本

- [x] setup.ps1 脚本存在
- [x] 脚本包含 superpowers 克隆逻辑
- [x] 脚本包含符号链接创建逻辑
- [x] 脚本包含 planning-with-files 复制逻辑
- [x] 脚本包含验证逻辑

## Phase 9: Prompt 模板

- [x] implementation-template.md 存在
- [x] docs-template.md 存在
- [x] repair-template.md 存在

## Phase 10: 文档

- [x] README.md 存在
- [x] 包含项目结构说明
- [x] 包含安装步骤
- [x] 包含使用流程
- [x] 包含故障排查指南

## 功能验证

- [ ] OpenCode 能正确加载配置
- [ ] MCP 服务器能正常启动
- [ ] 自定义命令能被识别
- [ ] 任务能正确分发到 Codex/Gemini
- [ ] Worktree 能正确创建和清理
- [ ] 结果能正确收集和评分
- [ ] 合并能正确执行

**注意**: 功能验证需要在实际环境中运行 OpenCode、Codex CLI 和 Gemini CLI 后才能完成。
