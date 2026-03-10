const TASK_ID_RE = /^[A-Za-z0-9._-]+$/;

export function sanitizeTaskId(taskId) {
  const value = String(taskId ?? "").trim();
  if (!value) {
    throw new Error("task_id is required");
  }
  if (!TASK_ID_RE.test(value)) {
    throw new Error(`invalid task_id: ${taskId}`);
  }
  return value;
}
