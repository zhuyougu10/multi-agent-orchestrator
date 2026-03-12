export function resolveCollectedAgent(agent, indexData) {
  if (agent) {
    return agent;
  }
  return indexData?.selected_agent || null;
}

export function selectCollectedPayload(bundleData, resultData, indexData = null) {
  if (bundleData) {
    return bundleData;
  }
  if (resultData) {
    return resultData;
  }
  if (indexData) {
    return indexData;
  }
  return null;
}
