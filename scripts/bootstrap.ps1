$ErrorActionPreference = "Stop"

function Write-Step($message) {
  Write-Host "[bootstrap] $message" -ForegroundColor Cyan
}

function Write-Ok($message) {
  Write-Host "[ok] $message" -ForegroundColor Green
}

function Write-Warn($message) {
  Write-Host "[warn] $message" -ForegroundColor Yellow
}

function Require-Command($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Missing required command: $name"
  }
  return $cmd
}

function Check-OptionalCommand($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) {
    Write-Ok "$name is available"
    return $true
  }
  Write-Warn "$name not found in PATH"
  return $false
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$taskRouterDir = Join-Path $repoRoot ".mcp/task-router"

Write-Step "Repository root: $repoRoot"
Write-Step "Checking required commands"

Require-Command "node" | Out-Null
Require-Command "npm" | Out-Null
Require-Command "git" | Out-Null

$nodeVersion = (& node --version).TrimStart("v")
$versionParts = $nodeVersion.Split(".")
if ([int]$versionParts[0] -lt 18) {
  throw "Node.js >= 18 is required. Current version: $nodeVersion"
}

Write-Ok "node $(node --version)"
Write-Ok "npm $(& npm --version)"
Write-Ok "git $(& git --version)"

Write-Step "Checking optional commands"
Check-OptionalCommand "opencode" | Out-Null
Check-OptionalCommand "codex" | Out-Null
Check-OptionalCommand "gemini" | Out-Null

if (-not (Test-Path $taskRouterDir)) {
  throw "Task router directory not found: $taskRouterDir"
}

Write-Step "Installing task-router dependencies"
Push-Location $taskRouterDir
try {
  & npm install
  if ($LASTEXITCODE -ne 0) {
    throw "npm install failed"
  }
} finally {
  Pop-Location
}

Write-Ok "task-router dependencies installed"

Write-Host ""
Write-Host "Bootstrap complete." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Start MCP server: node .mcp/task-router/server.js"
Write-Host "2. Open OpenCode in this repository"
Write-Host "3. Monitor tasks with: node .mcp/task-router/watch-ui.js <task_id>"
Write-Host ""
Write-Host "If opencode / codex / gemini were reported missing, install them separately before full use." -ForegroundColor Yellow
