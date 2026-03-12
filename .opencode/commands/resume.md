---
description: Restore project memory from planning files without making changes
---

Your task is to restore project memory for a previously active task.

This is a read-only command. Do not modify any files, do not create files, and do not trigger `/orchestrate` automatically.

Follow this repository-skill procedure strictly:

1. Read these repository references first:
   - `.opencode/skills/README.md`
   - `.opencode/agents/orchestrator.md`

2. Read the primary memory files if they exist:
   - `task_plan.md`
   - `findings.md`
   - `progress.md`

3. Missing-file behavior:
   - If one or more files are missing, summarize the memory that is still recoverable from the files that do exist.
   - Explicitly call out each missing file.
   - If all primary memory files (`task_plan.md`, `findings.md`, and `progress.md`) are missing, state that there is no recoverable project memory and suggest `/orchestrate` as the next step.

4. Produce a structured summary with these sections:
   - Current goal
   - Completed work
   - Key decisions
   - Current skill state
   - Recommended next step

5. Summary rules:
   - Base the summary only on the files you read.
   - Distinguish clearly between explicit facts and inferred state.
   - If repository-skill context is unclear, say so instead of guessing.
   - Do not start execution, delegation, review, merge, or cleanup steps from this command.

6. Output:
   - A concise memory-restore summary
   - A missing-files list when applicable
   - A recommendation for the next command or action, without running it automatically
