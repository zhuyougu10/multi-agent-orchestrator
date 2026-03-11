export function selectCollectedPayload(bundleData, resultData) {
  if (bundleData) {
    return bundleData;
  }
  if (resultData) {
    return resultData;
  }
  return null;
}
