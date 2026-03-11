---
description: Review delegated outputs and select winner
---

Your task is to review all delegated task results and make decisions.

Follow this workflow strictly:

1. Read progress.md to identify completed tasks
   - Assume `/delegate` has already blocked until every dispatched task is terminal
   - Do not start `/review` for tasks that are still running

2. For each completed task:
   a. Collect the result:
      - Call task-router.collect_result with task_id
      - If race mode, collect results for both agents

   b. If race mode:
      - Call task-router.score_result for each agent
      - Compare scores
      - Identify the winner

   c. Review the winning output:
      - Check correctness
      - Check consistency with requirements
      - Check scope compliance
      - Check test results (if applicable)
      - Check for security issues
      - Check naming conventions

   d. Decision:
      - If output is good: Mark for merge
      - If output needs fixes: Trigger repair
      - If both agents failed (race): Escalate

3. Update progress.md:
    - Record review decisions
    - Record any issues found
    - Mark tasks as reviewed

4. Preconditions:
   - `/delegate` must already have finished its blocking task panel loop
   - Every task under review must already be terminal (`completed` or `failed`)

5. Review criteria:
    - Exit code is 0
    - JSON output is valid (if required)
    - Tests pass (if applicable)
    - No scope violations
    - No security issues
    - Consistent with project style

6. Output:
    - Review summary
    - Tasks approved for merge
    - Tasks needing repair
    - Issues found
