---
description: Repair failed tasks with fix instructions
---

Your task is to fix tasks that failed review or execution.

Follow this repository-skill procedure strictly:

0. Apply these local repository skills before retrying tasks:
   - `.opencode/skills/verify/SKILL.md`
   - `.opencode/skills/delegation-rules/SKILL.md`

1. Read progress.md to identify failed tasks:
   - Non-zero exit codes
   - Failed tests
   - Review rejections
   - Scope violations

2. For each failed task:
   a. Analyze the failure:
      - Read the result file
      - Identify the root cause
      - Check stderr for errors
      - Review test failures

   b. Prepare repair instructions:
      - Describe the specific issue
      - Provide clear fix guidance
      - Reference any relevant context

   c. Call MCP tool:
      - task-router.retry_task
      - task_id: the failed task
      - issue: detailed repair instructions
      - preferred_agent: can switch agent if needed

   d. Record the retry in progress.md

3. Retry limits:
   - Maximum 2 retries per task
   - After 2 failures, escalate to manual review
   - Consider switching agents after first failure

4. After retry:
   - Collect the new result
   - Re-run review process
   - Update progress.md

5. Output:
   - Tasks being retried
   - Repair instructions provided
   - Retry count per task
