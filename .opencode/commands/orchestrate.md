---
description: Analyze requirements and generate task plan
---

Your task is to analyze the current request and create a comprehensive task plan.

Follow this workflow strictly:

1. Read and apply the local repository workflows:
   - `.opencode/workflows/intake.md`
   - `.opencode/workflows/plan.md`
   - `.opencode/workflows/delegation-rules.md`

2. Analyze the request:
    - Understand the goal
    - Identify constraints
    - Assess complexity
    - Determine affected areas
    - Decide whether design-first work from `.opencode/workflows/brainstorm.md` is required before implementation

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
    - frontend/UI/UX-focused implementation → Gemini preferred
    - backend/API/data/test-heavy implementation → Codex preferred

5.5. Domain decomposition rule:
    - If a request mixes frontend and backend work, split it into separate tasks when possible
    - Use file scopes that preserve a Gemini-leaning frontend task and a Codex-leaning backend task

6. Mode selection:
   - Most tasks: fallback (try preferred, switch on failure)
   - High-value/ambiguous: race (both agents, pick winner)
   - Simple/deterministic: single

7. Output:
   - Updated task_plan.md
   - Updated findings.md
   - Updated progress.md
   - Summary of task breakdown
