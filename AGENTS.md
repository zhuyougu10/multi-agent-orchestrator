# AGENTS.md
本文件提供给会在本仓库中工作的代理式编码助手。
你是当前项目的开发者。
你的职责是安全修改仓库、验证结果、保持现有协议与风格稳定，而不是只给建议。

## 项目定位
- 这是一个 `OpenCode + MCP task-router` 项目。
- 核心代码位于 `.mcp/task-router/`，是本地 Node.js MCP 服务。
- `.opencode/` 保存 OpenCode 配置与 slash command 文档。
- 项目重点是任务分发、事件订阅、结果收集、评分、重试与合并。

## 当前已知事实
- Node.js 要求：`>= 18`。
- 包管理器：`npm`。
- 模块系统：ESM。
- 测试框架：`node:test`。
- 断言库：`node:assert/strict`。
- 当前仓库未发现以下规则文件：
- `.cursorrules`
- `.cursor/rules/**`
- `.github/copilot-instructions.md`
- 因此本文件就是当前仓库的主要代理约束。

## 关键目录
- `README.md`：项目说明与启动方式。
- `.opencode/opencode.json`：OpenCode 到本地 MCP 的连接配置。
- `.opencode/commands/*.md`：`/delegate`、`/watch`、`/repair`、`/merge` 的行为说明。
- `.mcp/task-router/server.js`：MCP 服务主入口。
- `.mcp/task-router/dispatch.js`：任务派发。
- `.mcp/task-router/runtime.js`：执行上下文与 worktree 同步。
- `.mcp/task-router/runner.js`：Codex / Gemini CLI 启动参数。
- `.mcp/task-router/lib/*.js`：基础模块。
- `.mcp/task-router/tests/*.test.js`：自动化测试。

## 构建 / 运行 / 测试命令
以下命令以仓库根目录为起点。

### 安装依赖
```bash
cd .mcp/task-router
npm install
```

### 启动 MCP 服务
```bash
node .mcp/task-router/server.js
```
或：
```bash
cd .mcp/task-router
npm start
```

### 运行全部测试
```bash
cd .mcp/task-router
npm test
```
等价命令：
```bash
cd .mcp/task-router
node --test
```

### 运行单个测试文件
```bash
cd .mcp/task-router
node --test tests/dispatch.test.js
```

### 运行单个测试用例
```bash
cd .mcp/task-router
node --test --test-name-pattern="launchDispatch returns pending payload before async work completes" tests/dispatch.test.js
```

### 按名称过滤一组测试
```bash
cd .mcp/task-router
node --test --test-name-pattern="launchDispatch|collectPanelSnapshots"
```

## Lint / Format 现状
- 仓库当前没有 `lint` 脚本。
- 仓库当前没有 `format` 脚本。
- 没有 ESLint、Prettier 或 TypeScript 编译脚本。
- 不要臆造 `npm run lint`、`npm run format` 等命令。
- 质量校验以“运行相关测试 + 保持现有代码风格一致”为主。

## 开发原则
- 先读再改，尤其是 `server.js`。
- 保持最小必要改动，避免无关重构。
- 改入口逻辑时，优先补或改对应测试。
- 改 `lib/` 中纯函数时，优先写针对性测试。
- 涉及 worktree、merge、retry、score 流程时，注意结果对象与文件工件是否仍兼容。

## 导入规范
- 统一使用 ESM：`import` / `export`。
- Node 内置模块使用 `node:` 前缀，如 `node:fs`、`node:path`。
- 导入顺序遵循现有风格：先 Node 内置模块，再第三方依赖，最后本地模块。
- 本地导入保留显式 `.js` 后缀。

## 格式规范
- 字符串默认使用双引号。
- 保留分号。
- 缩进为 2 空格。
- 长参数列表、长对象、长导入按现有风格换行。
- 不要为了“统一格式”顺手重排整个文件。

## 命名规范
- 函数名、局部变量名：`camelCase`。
- 模块级常量：`UPPER_SNAKE_CASE`。
- 测试名称：完整自然语言句子，直接描述行为。
- 文件名保持现有风格，不要无故改名。
- 协议字段如 `task_id`、`timed_out`、`selected_agent` 等必须保持兼容。

## 类型与数据结构
- 当前项目是 JavaScript，不是 TypeScript。
- 不要把现有文件直接迁移到 `.ts`，除非任务明确要求。
- MCP tool 入参校验使用 `zod`。
- 运行结果以普通对象表达，常见字段包括：`ok`、`status`、`stdout`、`stderr`、`exit_code`、`timed_out`。
- 新增字段时优先延续已有对象形状。

## 错误处理规范
- 输入校验失败时，尽早抛错，参考 `sanitizeTaskId()`。
- 执行外部进程时，优先返回结构化结果，而不是只抛异常。
- 写 JSON 文件时保持原子性，参考 `writeJsonAtomic()`。
- 清理型操作可参考 `safeUnlink()` 的“尽力而为”风格。
- 不要吞掉关键流程错误，除非它本身就是清理路径。

## 测试规范
- 测试文件位于 `.mcp/task-router/tests/`。
- 命名格式保持 `*.test.js`。
- 使用 `import test from "node:test"`。
- 使用 `import assert from "node:assert/strict"`。
- 新增功能时至少覆盖成功路径、失败路径、关键边界条件。
- 涉及异步任务流时，要验证状态迁移，不只看最终布尔值。

## 对 `server.js` 的特别提醒
- `server.js` 是编排中枢，修改风险高。
- 改前先定位相关 `server.tool(...)` 定义。
- 如果逻辑能抽到 `lib/` 做纯函数，优先抽纯函数再接回入口。
- 但不要做与当前任务无关的“顺手重构”。

## 对代理的工作要求
- 你是开发者，应直接产出可执行修改。
- 不要覆盖用户已有未提交改动。
- 不要在未要求时擅自提交 git commit。
- 不要擅自回滚、删除 worktree 或修改关键配置策略。
- 发现脏工作区时，先区分“已有改动”和“本次改动”。

## 提交前自检
- 改动是否只覆盖任务相关文件？
- 是否保持 ESM、双引号、分号、2 空格缩进？
- 是否避免了无关重构？
- 是否运行了受影响测试？
- 文档中的命令是否都真实可用？
- 协议字段和结果对象是否保持兼容？

## 经验性建议
- 这个仓库本质上是编排基础设施，不是产品页面。
- 评估改动时优先考虑协议稳定性、可观测性和失败恢复能力。
- 涉及 `/watch` 时，要同时检查命令文档和 MCP tool 实现。
- 涉及代理输出格式时，要同步检查 `result-utils.js` 与相关测试。

请以维护者心态工作：谨慎、直接、可验证。
