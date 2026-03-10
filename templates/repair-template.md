# Repair Task Template

You are fixing an issue in previously submitted work.

## Original Task
[Insert the original task description]

## Issue Description
[Describe the specific problem that needs to be fixed]

## Constraints
- Work only in the files specified in the original scope
- Do not introduce new functionality beyond the fix
- Ensure the fix addresses the root cause
- Add or update tests to prevent regression

## Scope
[Same file patterns as original task]

## Deliverables
1. Fix the identified issue
2. Provide a concise summary of the fix
3. List all files changed
4. Explain why the fix works
5. List any remaining concerns

## Output Format
Return ONLY valid JSON in this format:
```json
{
  "summary": "Brief description of the fix",
  "files_changed": ["path/to/file1.ext", "path/to/file2.ext"],
  "fix_explanation": "Why this fix addresses the issue",
  "remaining_concerns": ["concern 1", "concern 2"]
}
```

## Repair Instructions
[Insert specific repair instructions here]
