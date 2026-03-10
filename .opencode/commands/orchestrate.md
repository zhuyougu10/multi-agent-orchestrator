---
description: Analyze requirements and generate task plan
---

Your task is to analyze the current request and create a comprehensive task plan.

Follow this workflow strictly:

1. Read and apply the mandatory skills:
   - using-superpowers
   - planning-with-files

2. Analyze the request:
   - Understand the goal
   - Identify constraints
   - Assess complexity
   - Determine affected areas

3. Create or update planning files:
   - task_plan.md: Task breakdown with dependencies
   - findings.md: Key findings and decisions
   - progress.md: Initial status

4. Task decomposition rules:
   - Break into smallest verifiable units
   - Assign appropriate task types
   - Define file scopes to avoid conflicts
   - Set dependencies between tasks

5. Task type routing:
   - implementation, refactor, tests, bugfix, script → Codex preferred
   - docs, summarization, comparison, ux-copy → Gemini preferred

6. Mode selection:
   - Most tasks: fallback (try preferred, switch on failure)
   - High-value/ambiguous: race (both agents, pick winner)
   - Simple/deterministic: single

7. Output:
   - Updated task_plan.md
   - Updated findings.md
   - Updated progress.md
   - Summary of task breakdown
