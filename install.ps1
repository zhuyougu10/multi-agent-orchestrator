$ErrorActionPreference = "Stop"

$RepoZipUrl = "https://codeload.github.com/zhuyougu10/multi-agent-orchestrator/zip/refs/heads/master"

function Write-Step($message) {
  Write-Host "[install] $message" -ForegroundColor Cyan
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
}

function Backup-IfExists($path) {
  if (Test-Path $path) {
    $stamp = Get-Date -Format "yyyyMMddHHmmss"
    $backup = "$path.bak.$stamp"
    Move-Item -LiteralPath $path -Destination $backup -Force
    Write-Warn "Backed up existing path: $backup"
  }
}

function Copy-ManagedPath($source, $target) {
  Backup-IfExists $target
  $parent = Split-Path -Parent $target
  if ($parent) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }
  Copy-Item -LiteralPath $source -Destination $target -Recurse -Force
  Write-Ok "Installed $(Resolve-Path -LiteralPath $target | Split-Path -Leaf)"
}

function Ensure-GitignoreEntry($gitignorePath, $entry) {
  if (-not (Test-Path $gitignorePath)) {
    Set-Content -LiteralPath $gitignorePath -Value "" -Encoding UTF8
  }
  $content = Get-Content -LiteralPath $gitignorePath -Raw
  if ($content -notmatch [Regex]::Escape($entry)) {
    Add-Content -LiteralPath $gitignorePath -Value "`n$entry"
    Write-Ok "Added .gitignore entry: $entry"
  }
}

Require-Command "node"
Require-Command "npm"
Require-Command "git"

$nodeVersion = (& node --version).TrimStart("v")
$nodeMajor = [int]($nodeVersion.Split(".")[0])
if ($nodeMajor -lt 18) {
  throw "Node.js >= 18 is required. Current version: $nodeVersion"
}

$targetRoot = if ($args.Length -gt 0) {
  if ([System.IO.Path]::IsPathRooted($args[0])) {
    [System.IO.Path]::GetFullPath($args[0])
  } else {
    [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $args[0]))
  }
} else {
  (Get-Location).Path
}

New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null

$tmpRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("multi-agent-orchestrator-install-" + [System.Guid]::NewGuid().ToString("N"))
$zipPath = Join-Path $tmpRoot "repo.zip"
$extractRoot = Join-Path $tmpRoot "extract"

try {
  New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
  New-Item -ItemType Directory -Force -Path $extractRoot | Out-Null

  Write-Step "Downloading installer bundle"
  Invoke-WebRequest -Uri $RepoZipUrl -OutFile $zipPath

  Write-Step "Extracting bundle"
  Expand-Archive -LiteralPath $zipPath -DestinationPath $extractRoot -Force

  $bundleRoot = Get-ChildItem -LiteralPath $extractRoot | Where-Object { $_.PSIsContainer } | Select-Object -First 1
  if (-not $bundleRoot) {
    throw "Failed to locate extracted repository contents"
  }

  $sourceRoot = $bundleRoot.FullName
  $sourceTaskRouter = Join-Path $sourceRoot ".mcp/task-router"
  $sourceCommands = Join-Path $sourceRoot ".opencode/commands"
  $sourceOpencode = Join-Path $sourceRoot ".opencode/opencode.json"

  if (-not (Test-Path $sourceTaskRouter)) {
    throw "Installer bundle is missing .mcp/task-router"
  }

  Write-Step "Installing project integration into $targetRoot"
  Copy-ManagedPath $sourceTaskRouter (Join-Path $targetRoot ".mcp/task-router")
  Copy-ManagedPath $sourceCommands (Join-Path $targetRoot ".opencode/commands")
  Copy-ManagedPath $sourceOpencode (Join-Path $targetRoot ".opencode/opencode.json")

  Ensure-GitignoreEntry (Join-Path $targetRoot ".gitignore") ".mcp/task-router/work/"
  Ensure-GitignoreEntry (Join-Path $targetRoot ".gitignore") ".mcp/task-router/node_modules/"

  Write-Step "Installing task-router dependencies"
  Push-Location (Join-Path $targetRoot ".mcp/task-router")
  try {
    & npm install
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed"
    }
  } finally {
    Pop-Location
  }

  Write-Host ""
  Write-Host "Install complete." -ForegroundColor Green
  Write-Host "Target project: $targetRoot"
  Write-Host ""
  Write-Host "Next steps:"
  Write-Host "1. cd `"$targetRoot`""
  Write-Host "2. node .mcp/task-router/server.js"
  Write-Host "3. Open OpenCode in that project"
  Write-Host "4. Monitor tasks with: node .mcp/task-router/watch-ui.js <task_id>"
} finally {
  if (Test-Path $tmpRoot) {
    Remove-Item -LiteralPath $tmpRoot -Recurse -Force
  }
}
