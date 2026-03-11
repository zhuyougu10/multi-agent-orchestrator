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
      - Override toward Gemini for frontend/UI/UX-heavy tasks
      - Override toward Codex for backend/API/data/test-heavy tasks

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
       - Store enough information for a later `/watch` run:
         - task_id
         - agent
         - initial cursor=0
         - dispatched_at

3. After dispatch:
   - Return immediately after all dispatches are recorded
   - Do not block here
   - Tell the user or next orchestrator step to run `/watch` when they want to see the live task panel and wait for completion

4. Constraints:
    - Do not overlap file scopes between concurrent tasks
    - Keep prompts specific and actionable
    - Require structured JSON output
    - Prefer splitting full-stack work into separate frontend/backend dispatches
    - Do not begin review or merge until `/watch` has completed for the relevant task set

5. Output:
    - Dispatch summary
    - Task IDs dispatched
    - Agents assigned
    - Reminder to use `/watch` for the blocking task panel
