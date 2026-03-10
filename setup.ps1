param(
    [string]$RepoUrl = "https://github.com/YOUR_USERNAME/multi-agent-orchestrator",
    [string]$Branch = "main",
    [switch]$SkipGlobalSkills,
    [switch]$SkipMcp,
    [switch]$SkipTemplates,
    [switch]$SkipAgents,
    [switch]$SkipCommands,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$ProjectRoot = $ScriptDir
$OpenCodeHome = "$env:USERPROFILE\.config\opencode"
$TempRoot = "$env:TEMP\multi-agent-bootstrap"

Write-Host "=== Multi-Agent Orchestrator Setup ===" -ForegroundColor Cyan
Write-Host "Project Root: $ProjectRoot"
Write-Host "Repository: $RepoUrl"
Write-Host "Branch: $Branch"
Write-Host ""

function Download-GitHubDirectory {
    param(
        [string]$RepoUrl,
        [string]$Branch,
        [string]$Directory,
        [string]$DestPath
    )
    
    $repoName = $RepoUrl -replace '.*github\.com[/:]', '' -replace '\.git$', ''
    $archiveUrl = "https://api.github.com/repos/$repoName/contents/$Directory`?ref=$Branch"
    
    Write-Host "  Downloading $Directory from GitHub..." -ForegroundColor Gray
    
    try {
        $headers = @{
            "Accept" = "application/vnd.github.v3+json"
            "User-Agent" = "Multi-Agent-Orchestrator-Setup"
        }
        
        $response = Invoke-RestMethod -Uri $archiveUrl -Headers $headers -ErrorAction Stop
        
        foreach ($item in $response) {
            $itemDest = Join-Path $DestPath $item.name
            
            if ($item.type -eq "dir") {
                New-Item -ItemType Directory -Force -Path $itemDest | Out-Null
                Download-GitHubDirectory -RepoUrl $RepoUrl -Branch $Branch -Directory "$Directory/$($item.name)" -DestPath $itemDest
            }
            elseif ($item.type -eq "file") {
                Write-Host "    Downloading: $($item.name)" -ForegroundColor DarkGray
                $fileContent = Invoke-RestMethod -Uri $item.download_url -Headers $headers
                $fileContent | Out-File -FilePath $itemDest -Encoding UTF8 -Force
            }
        }
        return $true
    }
    catch {
        Write-Host "  [WARN] Failed to download $Directory : $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

function Download-GitHubFile {
    param(
        [string]$RepoUrl,
        [string]$Branch,
        [string]$FilePath,
        [string]$DestPath
    )
    
    $repoName = $RepoUrl -replace '.*github\.com[/:]', '' -replace '\.git$', ''
    $rawUrl = "https://raw.githubusercontent.com/$repoName/$Branch/$FilePath"
    
    Write-Host "  Downloading $FilePath..." -ForegroundColor Gray
    
    try {
        $headers = @{
            "User-Agent" = "Multi-Agent-Orchestrator-Setup"
        }
        
        $content = Invoke-RestMethod -Uri $rawUrl -Headers $headers
        $destDir = Split-Path $DestPath -Parent
        if ($destDir) {
            New-Item -ItemType Directory -Force -Path $destDir | Out-Null
        }
        $content | Out-File -FilePath $DestPath -Encoding UTF8 -Force
        return $true
    }
    catch {
        Write-Host "  [WARN] Failed to download $FilePath : $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

function Install-GlobalSkills {
    Write-Host "Installing global skills (superpowers, planning-with-files)..." -ForegroundColor Yellow
    
    New-Item -ItemType Directory -Force -Path "$OpenCodeHome\plugins" | Out-Null
    New-Item -ItemType Directory -Force -Path "$OpenCodeHome\skills" | Out-Null
    
    $superpowersDir = "$TempRoot\superpowers"
    if (!(Test-Path $superpowersDir) -or $Force) {
        if (Test-Path $superpowersDir) { Remove-Item $superpowersDir -Recurse -Force }
        git clone --depth 1 https://github.com/obra/superpowers.git $superpowersDir 2>$null
    }
    
    $planningDir = "$TempRoot\planning-with-files"
    if (!(Test-Path $planningDir) -or $Force) {
        if (Test-Path $planningDir) { Remove-Item $planningDir -Recurse -Force }
        git clone --depth 1 https://github.com/OthmanAdi/planning-with-files.git $planningDir 2>$null
    }
    
    Remove-Item "$OpenCodeHome\plugins\superpowers.js" -Force -ErrorAction SilentlyContinue
    Remove-Item "$OpenCodeHome\skills\superpowers" -Force -ErrorAction SilentlyContinue -Recurse
    
    if (Test-Path "$superpowersDir\.opencode\plugins\superpowers.js") {
        New-Item -ItemType SymbolicLink `
            -Path "$OpenCodeHome\plugins\superpowers.js" `
            -Target "$superpowersDir\.opencode\plugins\superpowers.js" -Force | Out-Null
        
        New-Item -ItemType Junction `
            -Path "$OpenCodeHome\skills\superpowers" `
            -Target "$superpowersDir\skills" -Force | Out-Null
    }
    
    New-Item -ItemType Directory -Force -Path "$ProjectRoot\.opencode\skills" | Out-Null
    New-Item -ItemType Directory -Force -Path "$ProjectRoot\.codex\skills" | Out-Null
    New-Item -ItemType Directory -Force -Path "$ProjectRoot\.gemini\skills" | Out-Null
    
    if (Test-Path "$planningDir\.opencode\skills\planning-with-files") {
        Copy-Item -Recurse -Force `
            "$planningDir\.opencode\skills\planning-with-files" `
            "$ProjectRoot\.opencode\skills\" 2>$null
    }
    if (Test-Path "$planningDir\.codex\skills\planning-with-files") {
        Copy-Item -Recurse -Force `
            "$planningDir\.codex\skills\planning-with-files" `
            "$ProjectRoot\.codex\skills\" 2>$null
    }
    if (Test-Path "$planningDir\.gemini\skills\planning-with-files") {
        Copy-Item -Recurse -Force `
            "$planningDir\.gemini\skills\planning-with-files" `
            "$ProjectRoot\.gemini\skills\" 2>$null
    }
}

function Install-McpFromGitHub {
    Write-Host "Installing MCP task-router from GitHub..." -ForegroundColor Yellow
    
    $mcpDest = "$ProjectRoot\.mcp\task-router"
    New-Item -ItemType Directory -Force -Path $mcpDest | Out-Null
    
    $success = Download-GitHubDirectory -RepoUrl $RepoUrl -Branch $Branch -Directory ".mcp/task-router" -DestPath $mcpDest
    
    if ($success) {
        Write-Host "  Installing npm dependencies..." -ForegroundColor Gray
        Push-Location $mcpDest
        npm install --silent 2>$null
        Pop-Location
    }
}

function Install-TemplatesFromGitHub {
    Write-Host "Installing templates from GitHub..." -ForegroundColor Yellow
    
    $templatesDest = "$ProjectRoot\templates"
    New-Item -ItemType Directory -Force -Path $templatesDest | Out-Null
    
    Download-GitHubDirectory -RepoUrl $RepoUrl -Branch $Branch -Directory "templates" -DestPath $templatesDest | Out-Null
}

function Install-AgentsFromGitHub {
    Write-Host "Installing agents from GitHub..." -ForegroundColor Yellow
    
    $agentsDest = "$ProjectRoot\.opencode\agents"
    New-Item -ItemType Directory -Force -Path $agentsDest | Out-Null
    
    Download-GitHubDirectory -RepoUrl $RepoUrl -Branch $Branch -Directory ".opencode/agents" -DestPath $agentsDest | Out-Null
}

function Install-CommandsFromGitHub {
    Write-Host "Installing commands from GitHub..." -ForegroundColor Yellow
    
    $commandsDest = "$ProjectRoot\.opencode\commands"
    New-Item -ItemType Directory -Force -Path $commandsDest | Out-Null
    
    Download-GitHubDirectory -RepoUrl $RepoUrl -Branch $Branch -Directory ".opencode/commands" -DestPath $commandsDest | Out-Null
}

function Install-ConfigFromGitHub {
    Write-Host "Installing configuration files from GitHub..." -ForegroundColor Yellow
    
    Download-GitHubFile -RepoUrl $RepoUrl -Branch $Branch -FilePath ".opencode/opencode.json" -DestPath "$ProjectRoot\.opencode\opencode.json" | Out-Null
    Download-GitHubFile -RepoUrl $RepoUrl -Branch $Branch -FilePath "AGENTS.md" -DestPath "$ProjectRoot\AGENTS.md" | Out-Null
    Download-GitHubFile -RepoUrl $RepoUrl -Branch $Branch -FilePath ".gitignore" -DestPath "$ProjectRoot\.gitignore" | Out-Null
}

function Test-Installation {
    Write-Host ""
    Write-Host "=== Verifying Installation ===" -ForegroundColor Cyan
    
    $allOk = $true
    
    if (!$SkipGlobalSkills) {
        Write-Host "Checking superpowers plugin link..." -ForegroundColor Yellow
        $pluginLink = Get-Item "$OpenCodeHome\plugins\superpowers.js" -ErrorAction SilentlyContinue
        if ($pluginLink -and $pluginLink.LinkType) {
            Write-Host "  [OK] Plugin symlink created" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] Plugin symlink not found (may need admin rights)" -ForegroundColor Yellow
        }
        
        Write-Host "Checking superpowers skills junction..." -ForegroundColor Yellow
        $skillsLink = Get-Item "$OpenCodeHome\skills\superpowers" -ErrorAction SilentlyContinue
        if ($skillsLink -and $skillsLink.LinkType) {
            Write-Host "  [OK] Skills junction created" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] Skills junction not found (may need admin rights)" -ForegroundColor Yellow
        }
        
        Write-Host "Checking planning-with-files in OpenCode..." -ForegroundColor Yellow
        if (Test-Path "$ProjectRoot\.opencode\skills\planning-with-files") {
            Write-Host "  [OK] planning-with-files installed for OpenCode" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] planning-with-files not found for OpenCode" -ForegroundColor Red
            $allOk = $false
        }
    }
    
    if (!$SkipMcp) {
        Write-Host "Checking MCP dependencies..." -ForegroundColor Yellow
        if (Test-Path "$ProjectRoot\.mcp\task-router\node_modules") {
            Write-Host "  [OK] MCP dependencies installed" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] MCP dependencies not installed" -ForegroundColor Red
            $allOk = $false
        }
    }
    
    if (!$SkipTemplates) {
        Write-Host "Checking templates..." -ForegroundColor Yellow
        if (Test-Path "$ProjectRoot\templates") {
            Write-Host "  [OK] Templates installed" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] Templates not found" -ForegroundColor Yellow
        }
    }
    
    if (!$SkipAgents) {
        Write-Host "Checking agents..." -ForegroundColor Yellow
        if (Test-Path "$ProjectRoot\.opencode\agents") {
            Write-Host "  [OK] Agents installed" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] Agents not found" -ForegroundColor Yellow
        }
    }
    
    if (!$SkipCommands) {
        Write-Host "Checking commands..." -ForegroundColor Yellow
        if (Test-Path "$ProjectRoot\.opencode\commands") {
            Write-Host "  [OK] Commands installed" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] Commands not found" -ForegroundColor Yellow
        }
    }
    
    return $allOk
}

New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null

if (!$SkipGlobalSkills) {
    Install-GlobalSkills
}

if (!$SkipMcp) {
    Install-McpFromGitHub
}

if (!$SkipTemplates) {
    Install-TemplatesFromGitHub
}

if (!$SkipAgents) {
    Install-AgentsFromGitHub
}

if (!$SkipCommands) {
    Install-CommandsFromGitHub
}

Install-ConfigFromGitHub

$success = Test-Installation

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""

if ($success) {
    Write-Host "All components installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Some components failed to install. Check the messages above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Initialize Git repository (if not already):" -ForegroundColor White
Write-Host "   git init" -ForegroundColor Gray
Write-Host "   git add ." -ForegroundColor Gray
Write-Host "   git commit -m 'init multi-agent orchestrator'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Install CLI tools (if not already):" -ForegroundColor White
Write-Host "   npm install -g @openai/codex" -ForegroundColor Gray
Write-Host "   npm install -g @google/gemini-cli" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start OpenCode:" -ForegroundColor White
Write-Host "   opencode" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Run your first task:" -ForegroundColor White
Write-Host "   /orchestrate" -ForegroundColor Gray
Write-Host ""
Write-Host "=== Usage Options ===" -ForegroundColor Cyan
Write-Host "Skip specific components:" -ForegroundColor White
Write-Host "  .\setup.ps1 -SkipGlobalSkills    # Skip superpowers/planning-with-files" -ForegroundColor Gray
Write-Host "  .\setup.ps1 -SkipMcp             # Skip MCP task-router" -ForegroundColor Gray
Write-Host "  .\setup.ps1 -SkipTemplates       # Skip templates" -ForegroundColor Gray
Write-Host "  .\setup.ps1 -SkipAgents          # Skip agents" -ForegroundColor Gray
Write-Host "  .\setup.ps1 -SkipCommands        # Skip commands" -ForegroundColor Gray
Write-Host ""
Write-Host "Use custom repository:" -ForegroundColor White
Write-Host "  .\setup.ps1 -RepoUrl 'https://github.com/user/repo' -Branch 'develop'" -ForegroundColor Gray
