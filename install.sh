#!/usr/bin/env sh

set -eu

REPO_ZIP_URL="https://codeload.github.com/zhuyougu10/multi-agent-orchestrator/zip/refs/heads/master"

say() {
  printf '%s\n' "[install] $1"
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

backup_if_exists() {
  target=$1
  if [ -e "$target" ]; then
    stamp=$(date +%Y%m%d%H%M%S)
    backup="$target.bak.$stamp"
    mv "$target" "$backup"
    warn "Backed up existing path: $backup"
  fi
}

copy_managed_path() {
  src=$1
  dst=$2
  backup_if_exists "$dst"
  mkdir -p "$(dirname "$dst")"
  cp -R "$src" "$dst"
  ok "Installed $(basename "$dst")"
}

ensure_gitignore_entry() {
  gitignore_path=$1
  entry=$2
  if [ ! -f "$gitignore_path" ]; then
    : > "$gitignore_path"
  fi
  if ! grep -Fqx "$entry" "$gitignore_path"; then
    printf '\n%s\n' "$entry" >> "$gitignore_path"
    ok "Added .gitignore entry: $entry"
  fi
}

extract_zip() {
  zip_path=$1
  extract_root=$2
  if command -v unzip >/dev/null 2>&1; then
    unzip -q "$zip_path" -d "$extract_root"
    return
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$zip_path" "$extract_root" <<'PY'
import sys, zipfile
zip_path, extract_root = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(zip_path) as zf:
    zf.extractall(extract_root)
PY
    return
  fi
  printf '%s\n' "Need either unzip or python3 to extract installer bundle" >&2
  exit 1
}

download_file() {
  url=$1
  output=$2
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$output"
    return
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -qO "$output" "$url"
    return
  fi
  printf '%s\n' "Need either curl or wget to download installer bundle" >&2
  exit 1
}

require_command node
require_command npm
require_command git

NODE_VERSION=$(node --version | sed 's/^v//')
NODE_MAJOR=$(printf '%s' "$NODE_VERSION" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  printf '%s\n' "Node.js >= 18 is required. Current version: $NODE_VERSION" >&2
  exit 1
fi

if [ $# -gt 0 ]; then
  TARGET_ROOT=$(cd "$1" 2>/dev/null && pwd || true)
  if [ -z "$TARGET_ROOT" ]; then
    mkdir -p "$1"
    TARGET_ROOT=$(cd "$1" && pwd)
  fi
else
  TARGET_ROOT=$(pwd)
fi

TMP_ROOT=$(mktemp -d 2>/dev/null || mktemp -d -t multi-agent-orchestrator-install)
ZIP_PATH="$TMP_ROOT/repo.zip"
EXTRACT_ROOT="$TMP_ROOT/extract"
mkdir -p "$EXTRACT_ROOT"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT INT TERM

say "Downloading installer bundle"
download_file "$REPO_ZIP_URL" "$ZIP_PATH"

say "Extracting bundle"
extract_zip "$ZIP_PATH" "$EXTRACT_ROOT"

BUNDLE_ROOT=$(find "$EXTRACT_ROOT" -mindepth 1 -maxdepth 1 -type d | head -n 1)
if [ -z "$BUNDLE_ROOT" ]; then
  printf '%s\n' "Failed to locate extracted repository contents" >&2
  exit 1
fi

SOURCE_TASK_ROUTER="$BUNDLE_ROOT/.mcp/task-router"
SOURCE_COMMANDS="$BUNDLE_ROOT/.opencode/commands"
SOURCE_OPENCODE="$BUNDLE_ROOT/.opencode/opencode.json"

if [ ! -d "$SOURCE_TASK_ROUTER" ]; then
  printf '%s\n' "Installer bundle is missing .mcp/task-router" >&2
  exit 1
fi

say "Installing project integration into $TARGET_ROOT"
copy_managed_path "$SOURCE_TASK_ROUTER" "$TARGET_ROOT/.mcp/task-router"
copy_managed_path "$SOURCE_COMMANDS" "$TARGET_ROOT/.opencode/commands"
copy_managed_path "$SOURCE_OPENCODE" "$TARGET_ROOT/.opencode/opencode.json"

ensure_gitignore_entry "$TARGET_ROOT/.gitignore" ".mcp/task-router/work/"
ensure_gitignore_entry "$TARGET_ROOT/.gitignore" ".mcp/task-router/node_modules/"

say "Installing task-router dependencies"
cd "$TARGET_ROOT/.mcp/task-router"
npm install

printf '\nInstall complete.\n'
printf '%s\n' "Target project: $TARGET_ROOT"
printf '\n%s\n' "Next steps:"
printf '%s\n' "1. cd \"$TARGET_ROOT\""
printf '%s\n' "2. node .mcp/task-router/server.js"
printf '%s\n' "3. Open OpenCode in that project"
printf '%s\n' "4. Monitor tasks with: node .mcp/task-router/watch-ui.js <task_id>"
