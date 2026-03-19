import { spawn } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

function appendLimited(current, chunk, maxBytes) {
  const next = current + chunk.toString();
  const currentBytes = Buffer.byteLength(next, "utf8");
  if (currentBytes <= maxBytes) {
    return next;
  }

  const budget = Math.max(0, maxBytes - Buffer.byteLength("\n[truncated]", "utf8"));
  return Buffer.from(next, "utf8").subarray(0, budget).toString("utf8") + "\n[truncated]";
}

export function execCmd(command, args, cwd, extraEnv = {}, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const idleTimeoutMs = options.idleTimeoutMs ?? null;

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let idleTerminated = false;
    let settled = false;
    let idleTimer = null;

    const child = spawn(command, args, {
      cwd,
      shell: options.shell ?? true,
      windowsHide: true,
      env: { ...process.env, ...extraEnv }
    });

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      if (idleTimer) clearTimeout(idleTimer);
      resolve(payload);
    };

    const resetIdleTimer = () => {
      if (!idleTimeoutMs || settled) return;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idleTerminated = true;
        clearTimeout(timer);
        child.kill("SIGKILL");
      }, idleTimeoutMs);
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    if (options.stdin) {
      child.stdin.write(options.stdin);
      child.stdin.end();
    }

    child.on("error", (err) => {
      stderr += `${err?.message || String(err)}\n`;
    });

    child.stdout.on("data", (buf) => {
      stdout = appendLimited(stdout, buf, maxOutputBytes);
      options.onStdout?.(buf);
      resetIdleTimer();
    });

    child.stderr.on("data", (buf) => {
      stderr = appendLimited(stderr, buf, maxOutputBytes);
      options.onStderr?.(buf);
      resetIdleTimer();
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      finish({
        code: timedOut ? null : code,
        stdout,
        stderr,
        timed_out: timedOut,
        idle_terminated: idleTerminated
      });
    });
  });
}
