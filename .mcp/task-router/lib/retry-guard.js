const MAX_RETRIES = 2;

export function getRetryCount(job) {
  return typeof job?.retry_count === "number" ? job.retry_count : 0;
}

export function canRetry(job, maxRetries = MAX_RETRIES) {
  return getRetryCount(job) < maxRetries;
}

export function incrementRetryCount(job) {
  const count = getRetryCount(job) + 1;
  return { ...job, retry_count: count };
}

export function assertCanRetry(taskId, job, maxRetries = MAX_RETRIES) {
  const count = getRetryCount(job);
  if (count >= maxRetries) {
    throw new Error(`retry limit exceeded for ${taskId}: ${count}/${maxRetries}`);
  }
}
