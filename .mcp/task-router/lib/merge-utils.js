export function buildPatchCommandArgs(result) {
  const headSha = result?.commit?.head_sha || "";
  if (result?.commit?.attempted && headSha) {
    return ["show", "--binary", "--format=", headSha];
  }
  return ["diff", "--binary"];
}
