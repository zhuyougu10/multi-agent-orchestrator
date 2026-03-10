export function buildArgs(agent, prompt) {
  if (agent === "codex") {
    return {
      command: "powershell",
      args: ["-NoProfile", "-Command", "codex exec --sandbox workspace-write --skip-git-repo-check -"],
      stdin: prompt
    };
  }
  if (agent === "gemini") {
    return {
      command: "powershell",
      args: ["-NoProfile", "-Command", "gemini -p _ --output-format text -y"],
      stdin: prompt
    };
  }
  throw new Error(`Unsupported agent: ${agent}`);
}
