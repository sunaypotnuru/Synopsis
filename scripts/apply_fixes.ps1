# Netra-Ai Deployment Fixes - Simple Version
# Run from project root

Write-Host "Netra-Ai Deployment Fixes Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Step 1: Enable Rate Limiting
Write-Host "[1/5] Enabling rate limiting..." -ForegroundColor Yellow
$mainPyPath = "backend/core/app/main.py"
$content = Get-Content $mainPyPath -Raw
if ($content -match "# app\.add_middleware\(AdvancedRateLimitingMiddleware\)") {
    $content = $content -replace "# app\.add_middleware\(AdvancedRateLimitingMiddleware\)", "app.add_middleware(AdvancedRateLimitingMiddleware)"
    Set-Content $mainPyPath $content
    Write-Host "  Rate limiting enabled" -ForegroundColor Green
} else {
    Write-Host "  Already enabled or not found" -ForegroundColor Yellow
}

# Step 2: Check .gitignore
Write-Host "[2/5] Checking .gitignore..." -ForegroundColor Yellow
$gitignoreContent = Get-Content ".gitignore" -Raw
if ($gitignoreContent -notmatch "^\.env$") {
    Add-Content ".gitignore" "`n.env"
    Write-Host "  Added .env to .gitignore" -ForegroundColor Green
} else {
    Write-Host "  .env already in .gitignore" -ForegroundColor Green
}

# Step 3: Check TypeScript errors
Write-Host "[3/5] Checking TypeScript..." -ForegroundColor Yellow
Set-Location "frontend"
$tsOutput = npm run type-check 2>&1 | Out-String
$errorCount = ([regex]::Matches($tsOutput, "error TS")).Count
Write-Host "  Found $errorCount TypeScript errors" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Red" })
Set-Location $projectRoot

# Step 4: Auto-fix ESLint
Write-Host "[4/5] Running ESLint auto-fix..." -ForegroundColor Yellow
Set-Location "frontend"
try {
    npm run lint -- --fix 2>&1 | Out-Null
    Write-Host "  ESLint fixes applied" -ForegroundColor Green
} catch {
    Write-Host "  Some issues require manual fixing" -ForegroundColor Yellow
}
Set-Location $projectRoot

# Step 5: Check environment variables
Write-Host "[5/5] Checking environment variables..." -ForegroundColor Yellow
$envContent = Get-Content ".env" -Raw
$required = @("SUPABASE_URL", "SUPABASE_SERVICE_KEY", "LIVEKIT_API_KEY")
$missing = @()
foreach ($var in $required) {
    if ($envContent -notmatch "$var=.+") {
        $missing += $var
    }
}
if ($missing.Count -eq 0) {
    Write-Host "  All required variables present" -ForegroundColor Green
} else {
    Write-Host "  Missing: $($missing -join ', ')" -ForegroundColor Red
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Automated fixes complete!" -ForegroundColor Green
Write-Host ""
Write-Host "MANUAL ACTIONS REQUIRED:" -ForegroundColor Yellow
Write-Host "1. Rotate all exposed API keys (CRITICAL)" -ForegroundColor Red
Write-Host "2. Fix $errorCount TypeScript errors" -ForegroundColor Yellow
Write-Host "3. Review DEPLOYMENT_FIXES_REQUIRED.md" -ForegroundColor Yellow
Write-Host ""
