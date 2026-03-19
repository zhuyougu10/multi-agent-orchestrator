export async function gitCommitAll(exec, cwd, message) {
  await exec("git", ["add", "-A"], cwd, {}, { shell: false });
  return exec("git", ["commit", "-m", message], cwd, {}, { shell: false });
}
