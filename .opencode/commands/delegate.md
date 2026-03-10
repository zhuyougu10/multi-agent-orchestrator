---
description: Dispatch planned tasks to Codex and Gemini via MCP
---

Your task is to delegate tasks from task_plan.md to the appropriate agents.

Follow this workflow strictly:

1. Read task_plan.md to identify ready tasks:
   - Tasks with no dependencies
   - Tasks whose dependencies are completed

2. For each ready task:
   a. Determine the agent:
      - Use preferred_agent if specified
      - Otherwise route by task type:
        - implementation, refactor, tests, bugfix, script → Codex
        - docs, summarization, comparison, ux-copy → Gemini

   b. Prepare the dispatch:
      - task_id: from task_plan.md
      - task_type: from task_plan.md
      - cwd: current working directory
      - prompt: detailed instructions with constraints
      - files_scope: relevant file patterns
      - mode: single, fallback, or race
      - test_command: if applicable

   c. Call MCP tool:
      - task-router.dispatch_task with the prepared parameters

   d. Record the dispatch in progress.md

3. After dispatch:
   - Wait for results (or proceed with other tasks if parallel)
   - Call task-router.collect_result for each task
   - Record results in progress.md

4. Constraints:
   - Do not overlap file scopes between concurrent tasks
   - Keep prompts specific and actionable
   - Require structured JSON output

5. Output:
   - Dispatch summary
   - Task IDs dispatched
   - Agents assigned
