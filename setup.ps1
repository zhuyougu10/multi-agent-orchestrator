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

function Download-GitHubFile {
    param(
        [string]$Repo,
        [string]$Branch,
        [string]$Path,
        [string]$OutputPath
    )
    
    $url = "https://raw.githubusercontent.com/$Repo/$Branch/$Path"
    Write-Host "  Downloading: $Path" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop
        $dir = Split-Path $OutputPath -Parent
        if ($dir -and !(Test-Path $dir)) {
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
        }
        [System.IO.File]::WriteAllText($OutputPath, $response.Content, [System.Text.Encoding]::UTF8)
        return $true
    }
    catch {
        Write-Host "  [WARN] Failed to download: $Path" -ForegroundColor Yellow
        return $false
    }
}

function Download-GitHubDirectory {
    param(
        [string]$Repo,
        [string]$Branch,
        [string]$Path,
        [string]$OutputDir,
        [string[]]$FileExtensions = @("*")
    )
    
    $apiUrl = "https://api.github.com/repos/$Repo/contents/$Path?ref=$Branch"
    
    try {
        $headers = @{
            "Accept" = "application/vnd.github.v3+json"
            "User-Agent" = "Multi-Agent-Setup-Script"
        }
        
        if ($env:GITHUB_TOKEN) {
            $headers["Authorization"] = "token $env:GITHUB_TOKEN"
        }
        
        $response = Invoke-RestMethod -Uri $apiUrl -Headers $headers -ErrorAction Stop
        
        foreach ($item in $response) {
            $itemPath = $item.path
            $outputPath = Join-Path $OutputDir $item.name
            
            if ($item.type -eq "file") {
                $shouldDownload = $false
                foreach ($ext in $FileExtensions) {
                    if ($ext -eq "*" -or $item.name -like $ext) {
                        $shouldDownload = $true
                        break
                    }
                }
                
                if ($shouldDownload) {
                    Download-GitHubFile -Repo $Repo -Branch $Branch -Path $itemPath -OutputPath $outputPath | Out-Null
                }
            }
            elseif ($item.type -eq "dir") {
                $subDir = Join-Path $OutputDir $item.name
                Download-GitHubDirectory -Repo $Repo -Branch $Branch -Path $itemPath -OutputDir $subDir -FileExtensions $FileExtensions | Out-Null
            }
        }
        return $true
    }
    catch {
        Write-Host "  [WARN] Failed to list directory: $Path" -ForegroundColor Yellow
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
        return $false
    }
}

function Install-FromGitHub {
    param(
        [string]$Repo,
        [string]$Branch,
        [hashtable]$Paths
    )
    
    Write-Host "Installing from $Repo..." -ForegroundColor Yellow
    
    foreach ($entry in $Paths.GetEnumerator()) {
        $sourcePath = $entry.Key
        $destPath = $entry.Value
        
        Write-Host "  $sourcePath -> $destPath" -ForegroundColor Gray
        
        $fullDestPath = if ([System.IO.Path]::IsPathRooted($destPath)) { $destPath } else { Join-Path $ProjectRoot $destPath }
        
        $destDir = Split-Path $fullDestPath -Parent
        if ($destDir -and !(Test-Path $destDir)) {
            New-Item -ItemType Directory -Force -Path $destDir | Out-Null
        }
        
        $success = Download-GitHubDirectory -Repo $Repo -Branch $Branch -Path $sourcePath -OutputDir $fullDestPath
        
        if (!$success) {
            Write-Host "  [FAIL] Could not download $sourcePath" -ForegroundColor Red
        }
    }
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
    
    Download-GitHubFile -Repo "obra/superpowers" -Branch "main" -Path ".opencode/plugins/superpowers.js" -OutputPath "$tempSuperpowers\superpowers.js" | Out-Null
    
    Download-GitHubDirectory -Repo "obra/superpowers" -Branch "main" -Path "skills" -OutputDir "$tempSuperpowers\skills" | Out-Null
    
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
    
    if (Test-Path "$tempSuperpowers\skills") {
        New-Item -ItemType Junction `
            -Path "$OpenCodeHome\skills\superpowers" `
            -Target "$tempSuperpowers\skills" -ErrorAction SilentlyContinue | Out-Null
        
        if (!(Test-Path "$OpenCodeHome\skills\superpowers")) {
            Copy-Item "$tempSuperpowers\skills" "$OpenCodeHome\skills\superpowers" -Recurse -Force
        }
    }
    
    Write-Host "  [OK] superpowers installed" -ForegroundColor Green
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
    
    $success = Download-GitHubDirectory -Repo "OthmanAdi/planning-with-files" -Branch "main" -Path ".opencode/skills/planning-with-files" -OutputDir $destPath
    
    if ($success) {
        Write-Host "  [OK] planning-with-files installed" -ForegroundColor Green
    }
    else {
        Write-Host "  [FAIL] Could not install planning-with-files" -ForegroundColor Red
    }
}

function Install-ProjectComponents {
    param(
        [string]$Repo,
        [string]$Branch
    )
    
    Write-Host "Installing project components..." -ForegroundColor Yellow
    
    $components = @{
        ".opencode/commands"    = ".opencode\commands"
        ".opencode/agents"      = ".opencode\agents"
        ".opencode/opencode.json" = ".opencode\opencode.json"
        ".mcp/task-router"      = ".mcp\task-router"
        "AGENTS.md"             = "AGENTS.md"
        "templates"             = "templates"
    }
    
    foreach ($entry in $components.GetEnumerator()) {
        $sourcePath = $entry.Key
        $destPath = Join-Path $ProjectRoot $entry.Value
        
        Write-Host "  Checking: $sourcePath" -ForegroundColor Gray
        
        $destDir = Split-Path $destPath -Parent
        if ($destDir -and !(Test-Path $destDir)) {
            New-Item -ItemType Directory -Force -Path $destDir | Out-Null
        }
        
        if ($sourcePath -like "*.*") {
            Download-GitHubFile -Repo $Repo -Branch $Branch -Path $sourcePath -OutputPath $destPath | Out-Null
        }
        else {
            Download-GitHubDirectory -Repo $Repo -Branch $Branch -Path $sourcePath -OutputDir $destPath | Out-Null
        }
    }
    
    Write-Host "  [OK] Project components installed" -ForegroundColor Green
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
