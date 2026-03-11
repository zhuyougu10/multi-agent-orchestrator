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

3. After dispatch:
   - Build an in-memory task state table for every dispatched task
   - For each task, track at least:
     - task_id
     - agent
     - status
     - cursor
     - last_heartbeat_at
     - last_event_type
     - started_at
     - finished_at
     - short failure message if available
   - Enter a blocking wait loop immediately after all dispatches complete
   - In the wait loop, call task-router.watch_task_group with all tracked tasks and their latest cursors
   - Replace the local task state table with the returned task list and updated cursors after each polling cycle
   - Print the returned panel_text to the user on every refresh cycle so the panel is directly visible in the CLI
   - Emit a short heartbeat/status summary every refresh cycle so the CLI visibly stays alive while tasks are running
   - Treat both completed and failed tasks as terminal
   - Do not exit /delegate while any dispatched task is still non-terminal
   - Only after every dispatched task is terminal:
     - call task-router.collect_result for each task
     - record final results in progress.md
     - return control so the orchestrator can move to the next step

4. Constraints:
    - Do not overlap file scopes between concurrent tasks
    - Keep prompts specific and actionable
    - Require structured JSON output
    - Prefer splitting full-stack work into separate frontend/backend dispatches
    - Do not begin review, merge, or any next orchestration action until the blocking task panel loop has finished

5. Output:
    - Dispatch summary
    - Task panel summary
    - Task IDs dispatched
    - Agents assigned
