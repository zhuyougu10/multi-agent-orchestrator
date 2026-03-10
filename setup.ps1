$ErrorActionPreference = "Stop"

param(
    [string]$GitHubRepo = "",
    [string]$Branch = "master",
    [switch]$SkipGlobalSkills,
    [switch]$SkipMCP,
    [switch]$Force
)

$ScriptDir = $PSScriptRoot
$ProjectRoot = (Get-Location).Path
$OpenCodeHome = "$env:USERPROFILE\.config\opencode"
$TempRoot = "$env:TEMP\multi-agent-bootstrap"

Write-Host "=== Multi-Agent Orchestrator Setup ===" -ForegroundColor Cyan
Write-Host "Project Root: $ProjectRoot"
Write-Host "OpenCode Home: $OpenCodeHome"
Write-Host "GitHub Repo: $GitHubRepo"
Write-Host ""

function Download-File {
    param(
        [string]$Url,
        [string]$OutputPath
    )
    
    Write-Host "  Downloading: $Url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -ErrorAction Stop
        $dir = Split-Path $OutputPath -Parent
        if ($dir -and !(Test-Path $dir)) {
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
        }
        [System.IO.File]::WriteAllText($OutputPath, $response.Content, [System.Text.Encoding]::UTF8)
        return $true
    }
    catch {
        Write-Host "  [WARN] Failed to download: $Url" -ForegroundColor Yellow
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
        return $false
    }
}

function Download-RawFile {
    param(
        [string]$Repo,
        [string]$Branch,
        [string]$Path,
        [string]$OutputPath
    )
    
    $url = "https://raw.githubusercontent.com/$Repo/$Branch/$Path"
    return Download-File -Url $url -OutputPath $OutputPath
}

function Install-Superpowers {
    Write-Host "Installing superpowers to OpenCode..." -ForegroundColor Yellow
    
    New-Item -ItemType Directory -Force -Path "$OpenCodeHome\plugins" | Out-Null
    New-Item -ItemType Directory -Force -Path "$OpenCodeHome\skills" | Out-Null
    
    $tempSuperpowers = Join-Path $TempRoot "superpowers-temp"
    if (Test-Path $tempSuperpowers) {
        Remove-Item $tempSuperpowers -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $tempSuperpowers | Out-Null
    
    $success = Download-RawFile -Repo "obra/superpowers" -Branch "main" -Path ".opencode/plugins/superpowers.js" -OutputPath "$tempSuperpowers\superpowers.js"
    
    $skillsDir = Join-Path $tempSuperpowers "skills"
    New-Item -ItemType Directory -Force -Path $skillsDir | Out-Null
    
    $superpowersSkills = @(
        "brainstorming",
        "dispatching-parallel-agents",
        "executing-plans",
        "finishing-a-development-branch",
        "receiving-code-review",
        "requesting-code-review",
        "subagent-driven-development",
        "systematic-debugging",
        "test-driven-development",
        "using-git-worktrees",
        "using-superpowers",
        "verification-before-completion",
        "writing-plans",
        "writing-skills"
    )
    
    foreach ($skill in $superpowersSkills) {
        $skillDir = Join-Path $skillsDir $skill
        New-Item -ItemType Directory -Force -Path $skillDir | Out-Null
        
        $result = Download-RawFile -Repo "obra/superpowers" -Branch "main" -Path "skills/$skill/SKILL.md" -OutputPath "$skillDir\SKILL.md"
    }
    
    Remove-Item "$OpenCodeHome\plugins\superpowers.js" -Force -ErrorAction SilentlyContinue
    Remove-Item "$OpenCodeHome\skills\superpowers" -Force -Recurse -ErrorAction SilentlyContinue
    
    if (Test-Path "$tempSuperpowers\superpowers.js") {
        New-Item -ItemType SymbolicLink `
            -Path "$OpenCodeHome\plugins\superpowers.js" `
            -Target "$tempSuperpowers\superpowers.js" -ErrorAction SilentlyContinue | Out-Null
        
        if (!(Test-Path "$OpenCodeHome\plugins\superpowers.js")) {
            Copy-Item "$tempSuperpowers\superpowers.js" "$OpenCodeHome\plugins\superpowers.js" -Force
        }
    }
    
    if (Test-Path $skillsDir) {
        $destSkillsDir = Join-Path $OpenCodeHome "skills\superpowers"
        New-Item -ItemType Junction `
            -Path $destSkillsDir `
            -Target $skillsDir -ErrorAction SilentlyContinue | Out-Null
        
        if (!(Test-Path $destSkillsDir)) {
            Copy-Item $skillsDir $destSkillsDir -Recurse -Force
        }
    }
    
    if ($success) {
        Write-Host "  [OK] superpowers installed" -ForegroundColor Green
    }
    else {
        Write-Host "  [WARN] Some superpowers files failed to download" -ForegroundColor Yellow
    }
}

function Install-PlanningWithFiles {
    param([string]$TargetDir)
    
    Write-Host "Installing planning-with-files to $TargetDir..." -ForegroundColor Yellow
    
    $destPath = Join-Path $TargetDir "planning-with-files"
    
    if (Test-Path $destPath) {
        if ($Force) {
            Remove-Item $destPath -Recurse -Force
        }
        else {
            Write-Host "  [SKIP] Already exists (use -Force to overwrite)" -ForegroundColor Gray
            return
        }
    }
    
    New-Item -ItemType Directory -Force -Path $destPath | Out-Null
    New-Item -ItemType Directory -Force -Path "$destPath\templates" | Out-Null
    New-Item -ItemType Directory -Force -Path "$destPath\scripts" | Out-Null
    
    $files = @(
        @{ Path = "SKILL.md"; Dest = "SKILL.md" },
        @{ Path = "examples.md"; Dest = "examples.md" },
        @{ Path = "reference.md"; Dest = "reference.md" }
    )
    
    $success = $true
    foreach ($file in $files) {
        $result = Download-RawFile -Repo "OthmanAdi/planning-with-files" -Branch "master" -Path ".opencode/skills/planning-with-files/$($file.Path)" -OutputPath "$destPath\$($file.Dest)"
        $success = $success -and $result
    }
    
    $templates = @("findings.md", "progress.md", "task_plan.md")
    foreach ($template in $templates) {
        $result = Download-RawFile -Repo "OthmanAdi/planning-with-files" -Branch "master" -Path "templates/$template" -OutputPath "$destPath\templates\$template"
    }
    
    $scripts = @("check-complete.ps1", "check-complete.sh", "init-session.ps1", "init-session.sh", "session-catchup.py")
    foreach ($script in $scripts) {
        $result = Download-RawFile -Repo "OthmanAdi/planning-with-files" -Branch "master" -Path "scripts/$script" -OutputPath "$destPath\scripts\$script"
    }
    
    if ($success) {
        Write-Host "  [OK] planning-with-files installed" -ForegroundColor Green
    }
    else {
        Write-Host "  [FAIL] Some files failed to download" -ForegroundColor Red
    }
}

function Install-ProjectComponents {
    param(
        [string]$Repo,
        [string]$Branch
    )
    
    Write-Host "Installing project components..." -ForegroundColor Yellow
    
    $components = @(
        @{ Path = ".opencode/commands/orchestrate.md"; Dest = ".opencode\commands\orchestrate.md" },
        @{ Path = ".opencode/commands/delegate.md"; Dest = ".opencode\commands\delegate.md" },
        @{ Path = ".opencode/commands/review.md"; Dest = ".opencode\commands\review.md" },
        @{ Path = ".opencode/commands/repair.md"; Dest = ".opencode\commands\repair.md" },
        @{ Path = ".opencode/commands/merge.md"; Dest = ".opencode\commands\merge.md" },
        @{ Path = ".opencode/commands/finalize.md"; Dest = ".opencode\commands\finalize.md" },
        @{ Path = ".opencode/agents/planner.md"; Dest = ".opencode\agents\planner.md" },
        @{ Path = ".opencode/agents/reviewer.md"; Dest = ".opencode\agents\reviewer.md" },
        @{ Path = ".opencode/agents/executor.md"; Dest = ".opencode\agents\executor.md" },
        @{ Path = ".opencode/opencode.json"; Dest = ".opencode\opencode.json" },
        @{ Path = ".mcp/task-router/package.json"; Dest = ".mcp\task-router\package.json" },
        @{ Path = ".mcp/task-router/server.js"; Dest = ".mcp\task-router\server.js" },
        @{ Path = "AGENTS.md"; Dest = "AGENTS.md" },
        @{ Path = "templates/implementation-template.md"; Dest = "templates\implementation-template.md" },
        @{ Path = "templates/docs-template.md"; Dest = "templates\docs-template.md" },
        @{ Path = "templates/repair-template.md"; Dest = "templates\repair-template.md" }
    )
    
    $allSuccess = $true
    foreach ($comp in $components) {
        Write-Host "  Downloading: $($comp.Path)" -ForegroundColor Gray
        $destPath = Join-Path $ProjectRoot $comp.Dest
        $result = Download-RawFile -Repo $Repo -Branch $Branch -Path $comp.Path -OutputPath $destPath
        if (-not $result) {
            $allSuccess = $false
        }
    }
    
    if ($allSuccess) {
        Write-Host "  [OK] Project components installed" -ForegroundColor Green
    }
    else {
        Write-Host "  [WARN] Some components failed to download" -ForegroundColor Yellow
    }
}

function Install-MCPDependencies {
    Write-Host "Installing MCP dependencies..." -ForegroundColor Yellow
    
    $mcpPath = Join-Path $ProjectRoot ".mcp\task-router"
    
    if (!(Test-Path $mcpPath)) {
        Write-Host "  [SKIP] MCP directory not found" -ForegroundColor Gray
        return
    }
    
    Push-Location $mcpPath
    try {
        npm install --silent 2>$null
        Write-Host "  [OK] MCP dependencies installed" -ForegroundColor Green
    }
    catch {
        Write-Host "  [FAIL] npm install failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    finally {
        Pop-Location
    }
}

function Test-Installation {
    Write-Host ""
    Write-Host "=== Verifying Installation ===" -ForegroundColor Cyan
    
    $allOk = $true
    
    if (!$SkipGlobalSkills) {
        Write-Host "Checking superpowers plugin..." -ForegroundColor Yellow
        if (Test-Path "$OpenCodeHome\plugins\superpowers.js") {
            Write-Host "  [OK] Plugin installed" -ForegroundColor Green
        }
        else {
            Write-Host "  [FAIL] Plugin not found" -ForegroundColor Red
            $allOk = $false
        }
        
        Write-Host "Checking superpowers skills..." -ForegroundColor Yellow
        if (Test-Path "$OpenCodeHome\skills\superpowers") {
            Write-Host "  [OK] Skills installed" -ForegroundColor Green
        }
        else {
            Write-Host "  [FAIL] Skills not found" -ForegroundColor Red
            $allOk = $false
        }
    }
    
    Write-Host "Checking planning-with-files in OpenCode..." -ForegroundColor Yellow
    if (Test-Path "$ProjectRoot\.opencode\skills\planning-with-files") {
        Write-Host "  [OK] planning-with-files installed for OpenCode" -ForegroundColor Green
    }
    else {
        Write-Host "  [FAIL] planning-with-files not found for OpenCode" -ForegroundColor Red
        $allOk = $false
    }
    
    Write-Host "Checking planning-with-files in Codex..." -ForegroundColor Yellow
    if (Test-Path "$ProjectRoot\.codex\skills\planning-with-files") {
        Write-Host "  [OK] planning-with-files installed for Codex" -ForegroundColor Green
    }
    else {
        Write-Host "  [WARN] planning-with-files not found for Codex (optional)" -ForegroundColor Yellow
    }
    
    Write-Host "Checking planning-with-files in Gemini..." -ForegroundColor Yellow
    if (Test-Path "$ProjectRoot\.gemini\skills\planning-with-files") {
        Write-Host "  [OK] planning-with-files installed for Gemini" -ForegroundColor Green
    }
    else {
        Write-Host "  [WARN] planning-with-files not found for Gemini (optional)" -ForegroundColor Yellow
    }
    
    if (!$SkipMCP) {
        Write-Host "Checking MCP dependencies..." -ForegroundColor Yellow
        if (Test-Path "$ProjectRoot\.mcp\task-router\node_modules") {
            Write-Host "  [OK] MCP dependencies installed" -ForegroundColor Green
        }
        else {
            Write-Host "  [FAIL] MCP dependencies not installed" -ForegroundColor Red
            $allOk = $false
        }
    }
    
    Write-Host "Checking AGENTS.md..." -ForegroundColor Yellow
    if (Test-Path "$ProjectRoot\AGENTS.md") {
        Write-Host "  [OK] AGENTS.md exists" -ForegroundColor Green
    }
    else {
        Write-Host "  [FAIL] AGENTS.md not found" -ForegroundColor Red
        $allOk = $false
    }
    
    Write-Host "Checking .opencode/opencode.json..." -ForegroundColor Yellow
    if (Test-Path "$ProjectRoot\.opencode\opencode.json") {
        Write-Host "  [OK] opencode.json exists" -ForegroundColor Green
    }
    else {
        Write-Host "  [FAIL] opencode.json not found" -ForegroundColor Red
        $allOk = $false
    }
    
    return $allOk
}

New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null

if (!$SkipGlobalSkills) {
    Install-Superpowers
}

Write-Host "Installing planning-with-files skill..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "$ProjectRoot\.opencode\skills" | Out-Null
New-Item -ItemType Directory -Force -Path "$ProjectRoot\.codex\skills" | Out-Null
New-Item -ItemType Directory -Force -Path "$ProjectRoot\.gemini\skills" | Out-Null

Install-PlanningWithFiles -TargetDir "$ProjectRoot\.opencode\skills"
Install-PlanningWithFiles -TargetDir "$ProjectRoot\.codex\skills"
Install-PlanningWithFiles -TargetDir "$ProjectRoot\.gemini\skills"

if ($GitHubRepo) {
    Install-ProjectComponents -Repo $GitHubRepo -Branch $Branch
}

if (!$SkipMCP) {
    Install-MCPDependencies
}

$success = Test-Installation

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan

if ($success) {
    Write-Host "All components installed successfully!" -ForegroundColor Green
}
else {
    Write-Host "Some components failed to install. Check the output above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Install Codex CLI (if not already):" -ForegroundColor White
Write-Host "   npm install -g @openai/codex" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Install Gemini CLI (if not already):" -ForegroundColor White
Write-Host "   npm install -g @google/gemini-cli" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start OpenCode:" -ForegroundColor White
Write-Host "   opencode" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Run your first task:" -ForegroundColor White
Write-Host "   /orchestrate" -ForegroundColor Gray
