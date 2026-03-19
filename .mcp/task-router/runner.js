import os from "node:os";

const isWindows = os.platform() === "win32";

function wrapForPlatform(command) {
  if (isWindows) {
    return {
      command: "powershell",
      args: ["-NoProfile", "-Command", command]
    };
  }
  return {
    command: "/bin/sh",
    args: ["-c", command]
  };
}

export function buildArgs(agent, prompt) {
  if (agent === "codex") {
    const wrapped = wrapForPlatform("codex exec --sandbox workspace-write --skip-git-repo-check -");
    return {
      ...wrapped,
      stdin: prompt
    };
  }
  if (agent === "gemini") {
    const wrapped = wrapForPlatform("gemini -p _ --output-format text -y");
    return {
      ...wrapped,
      stdin: prompt
    };
  }
  throw new Error(`Unsupported agent: ${agent}`);
}
