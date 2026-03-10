$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$ProjectRoot = $ScriptDir
$OpenCodeHome = "$env:USERPROFILE\.config\opencode"
$TempRoot = "$env:TEMP\multi-agent-bootstrap"
Write-Host "=== Multi-Agent Orchestrator Setup ===" -ForegroundColor Cyan
Write-Host "Project Root: $ProjectRoot"
Write-Host "OpenCode Home: $OpenCodeHome"
Write-Host ""

# Create directories
Write-Host "Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $ProjectRoot | Out-Null
New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null
New-Item -ItemType Directory -Force -Path "$OpenCodeHome\plugins" | Out-Null
New-Item -ItemType Directory -Force -Path "$OpenCodeHome\skills" | Out-Null

Set-Location $TempRoot

# Clone superpowers
Write-Host "Cloning superpowers..." -ForegroundColor Yellow
if (!(Test-Path "$TempRoot\superpowers")) {
    git clone https://github.com/obra/superpowers.git "$TempRoot\superpowers"
}

# Clone planning-with-files
Write-Host "Cloning planning-with-files..." -ForegroundColor Yellow
if (!(Test-Path "$TempRoot\planning-with-files")) {
    git clone https://github.com/OthmanAdi/planning-with-files.git "$TempRoot\planning-with-files"
}

# Install superpowers to global OpenCode
Write-Host "Installing superpowers to OpenCode..." -ForegroundColor Yellow
Remove-Item "$OpenCodeHome\plugins\superpowers.js" -Force -ErrorAction SilentlyContinue
Remove-Item "$OpenCodeHome\skills\superpowers" -Force -ErrorAction SilentlyContinue -Recurse

New-Item -ItemType SymbolicLink `
    -Path "$OpenCodeHome\plugins\superpowers.js" `
    -Target "$TempRoot\superpowers\.opencode\plugins\superpowers.js" | Out-Null

New-Item -ItemType Junction `
    -Path "$OpenCodeHome\skills\superpowers" `
    -Target "$TempRoot\superpowers\skills" | Out-Null

# Copy planning-with-files to project
Write-Host "Installing planning-with-files to project..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "$ProjectRoot\.opencode\skills" | Out-Null
New-Item -ItemType Directory -Force -Path "$ProjectRoot\.codex\skills" | Out-Null
New-Item -ItemType Directory -Force -Path "$ProjectRoot\.gemini\skills" | Out-Null

Copy-Item -Recurse -Force `
    "$TempRoot\planning-with-files\.opencode\skills\planning-with-files" `
    "$ProjectRoot\.opencode\skills\"

Copy-Item -Recurse -Force `
    "$TempRoot\planning-with-files\.codex\skills\planning-with-files" `
    "$ProjectRoot\.codex\skills\"

Copy-Item -Recurse -Force `
    "$TempRoot\planning-with-files\.gemini\skills\planning-with-files" `
    "$ProjectRoot\.gemini\skills\"

# Install MCP dependencies
Write-Host "Installing MCP dependencies..." -ForegroundColor Yellow
Push-Location "$ProjectRoot\.mcp\task-router"
npm install
Pop-Location

# Verify installation
Write-Host ""
Write-Host "=== Verifying Installation ===" -ForegroundColor Cyan

Write-Host "Checking superpowers plugin link..." -ForegroundColor Yellow
$pluginLink = Get-Item "$OpenCodeHome\plugins\superpowers.js" -ErrorAction SilentlyContinue
if ($pluginLink -and $pluginLink.LinkType) {
    Write-Host "  [OK] Plugin symlink created" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Plugin symlink not found" -ForegroundColor Red
}

Write-Host "Checking superpowers skills junction..." -ForegroundColor Yellow
$skillsLink = Get-Item "$OpenCodeHome\skills\superpowers" -ErrorAction SilentlyContinue
if ($skillsLink -and $skillsLink.LinkType) {
    Write-Host "  [OK] Skills junction created" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Skills junction not found" -ForegroundColor Red
}

Write-Host "Checking planning-with-files in OpenCode..." -ForegroundColor Yellow
if (Test-Path "$ProjectRoot\.opencode\skills\planning-with-files") {
    Write-Host "  [OK] planning-with-files installed for OpenCode" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] planning-with-files not found for OpenCode" -ForegroundColor Red
}

Write-Host "Checking planning-with-files in Codex..." -ForegroundColor Yellow
if (Test-Path "$ProjectRoot\.codex\skills\planning-with-files") {
    Write-Host "  [OK] planning-with-files installed for Codex" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] planning-with-files not found for Codex" -ForegroundColor Red
}

Write-Host "Checking planning-with-files in Gemini..." -ForegroundColor Yellow
if (Test-Path "$ProjectRoot\.gemini\skills\planning-with-files") {
    Write-Host "  [OK] planning-with-files installed for Gemini" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] planning-with-files not found for Gemini" -ForegroundColor Red
}

Write-Host "Checking MCP dependencies..." -ForegroundColor Yellow
if (Test-Path "$ProjectRoot\.mcp\task-router\node_modules") {
    Write-Host "  [OK] MCP dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] MCP dependencies not installed" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Initialize Git repository (if not already):" -ForegroundColor White
Write-Host "   git init" -ForegroundColor Gray
Write-Host "   git add ." -ForegroundColor Gray
Write-Host "   git commit -m 'init multi-agent orchestrator'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Install Codex CLI (if not already):" -ForegroundColor White
Write-Host "   npm install -g @openai/codex" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Install Gemini CLI (if not already):" -ForegroundColor White
Write-Host "   npm install -g @google/gemini-cli" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Start OpenCode:" -ForegroundColor White
Write-Host "   opencode" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Run your first task:" -ForegroundColor White
Write-Host "   /orchestrate" -ForegroundColor Gray
