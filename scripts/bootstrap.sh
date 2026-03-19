#!/usr/bin/env sh

set -eu

say() {
  printf '%s\n' "[bootstrap] $1"
}

ok() {
  printf '%s\n' "[ok] $1"
}

warn() {
  printf '%s\n' "[warn] $1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '%s\n' "Missing required command: $1" >&2
    exit 1
  fi
}

check_optional_command() {
  if command -v "$1" >/dev/null 2>&1; then
    ok "$1 is available"
  else
    warn "$1 not found in PATH"
  fi
}

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
TASK_ROUTER_DIR="$REPO_ROOT/.mcp/task-router"

say "Repository root: $REPO_ROOT"
say "Checking required commands"

require_command node
require_command npm
require_command git

NODE_VERSION=$(node --version | sed 's/^v//')
NODE_MAJOR=$(printf '%s' "$NODE_VERSION" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  printf '%s\n' "Node.js >= 18 is required. Current version: $NODE_VERSION" >&2
  exit 1
fi

ok "node $(node --version)"
ok "npm $(npm --version)"
ok "git $(git --version)"

say "Checking optional commands"
check_optional_command opencode
check_optional_command codex
check_optional_command gemini

if [ ! -d "$TASK_ROUTER_DIR" ]; then
  printf '%s\n' "Task router directory not found: $TASK_ROUTER_DIR" >&2
  exit 1
fi

say "Installing task-router dependencies"
cd "$TASK_ROUTER_DIR"
npm install

ok "task-router dependencies installed"

printf '\nBootstrap complete.\n\n'
printf '%s\n' "Next steps:"
printf '%s\n' "1. Start MCP server: node .mcp/task-router/server.js"
printf '%s\n' "2. Open OpenCode in this repository"
printf '%s\n' "3. Monitor tasks with: node .mcp/task-router/watch-ui.js <task_id>"
printf '\n'
warn "If opencode / codex / gemini were reported missing, install them separately before full use."
