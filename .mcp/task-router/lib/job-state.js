export function isTaskIndexActive(indexData) {
  return indexData?.status === "running";
}

export function assertTaskNotActive(taskId, indexData) {
  if (isTaskIndexActive(indexData)) {
    throw new Error(`task already running: ${taskId}`);
  }
}
