# Multi-Agent Orchestration Rules

## Mandatory Skills
Always use these skills when relevant:
- superpowers
- planning-with-files

## Planning Rules
For any task larger than a single-file edit:
1. Read and apply the planning-with-files skill.
2. Create and maintain these files:
   - task_plan.md
   - findings.md
   - progress.md
3. Do not start implementation before task decomposition is complete.
4. Update progress after each delegation round.

## Delegation Policy
Use OpenCode as the orchestrator and final reviewer.

### Preferred Routing by Task Type
- **Codex preferred**: implementation, refactor, tests, bugfix, script
- **Gemini preferred**: docs, summarization, comparison, ux-copy

### Execution Modes
- **single**: Dispatch to one agent only
- **fallback**: Try preferred agent first, switch to backup on failure
- **race**: Dispatch to both agents simultaneously, pick winner by score

### Default Mode Assignment
- implementation / refactor / tests / bugfix: fallback
- docs / summarization / comparison: fallback
- High-value complex tasks: race

## Delegation Protocol
When delegating:
1. Create a unique task_id
2. Write a precise prompt with constraints
3. Define files_scope to prevent conflicts
4. Call MCP tool dispatch_task
5. Collect result with collect_result
6. Review before merging

## Merge Policy
Do not trust delegated output blindly.

### Strategy Selection
- **patch**: For docs and small changes (git format-patch + git apply)
- **cherry-pick**: For code-focused changes (git cherry-pick <sha>)
- **manual-review**: For high-risk or large changes (no auto-merge)

### Merge Rules
- Docs, README, small edits: patch
- Backend implementation, tests, refactor: cherry-pick
- Large refactor, ambiguous race, failed tests: manual-review

OpenCode must:
- Inspect files
- Review correctness
- Run tests
- Request fixes if needed

## Review Policy
After delegated agents finish:
1. Collect all results
2. Check score, tests, diff, stdout JSON
3. Review for correctness, security, consistency, naming
4. If needed, send a follow-up fix task to the same or another agent
5. OpenCode is the final approver

## Output Policy
At the end of every major task, report:
- Final plan
- Delegated subtasks
- Files changed
- Tests run
- Remaining issues
