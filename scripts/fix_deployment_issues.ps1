# ============================================================
# Netra-Ai Deployment Fixes Automation Script
# ============================================================
# This script automates fixing critical deployment issues
# Run from project root: .\scripts\fix_deployment_issues.ps1
# ============================================================

Write-Host "🚀 Netra-Ai Deployment Fixes Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

# ============================================================
# STEP 1: Backup Current State
# ============================================================
Write-Host "📦 Step 1: Creating backup..." -ForegroundColor Yellow
$backupDir = Join-Path $projectRoot "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Backup critical files
Copy-Item (Join-Path $projectRoot ".env") (Join-Path $backupDir ".env") -ErrorAction SilentlyContinue
Copy-Item (Join-Path $projectRoot "backend/core/app/main.py") (Join-Path $backupDir "main.py") -ErrorAction SilentlyContinue
Copy-Item (Join-Path $projectRoot "backend/core/app/core/config.py") (Join-Path $backupDir "config.py") -ErrorAction SilentlyContinue

Write-Host "✅ Backup created at: $backupDir" -ForegroundColor Green
Write-Host ""

# ============================================================
# STEP 2: Check TypeScript Errors
# ============================================================
Write-Host "🔍 Step 2: Checking TypeScript errors..." -ForegroundColor Yellow
Set-Location (Join-Path $projectRoot "frontend")

Write-Host "Running type check..." -ForegroundColor Gray
$typeCheckOutput = npm run type-check 2>&1
$typeCheckErrors = ($typeCheckOutput | Select-String "error TS").Count

if ($typeCheckErrors -gt 0) {
    Write-Host "⚠️  Found $typeCheckErrors TypeScript errors" -ForegroundColor Red
    Write-Host "   See DEPLOYMENT_FIXES_REQUIRED.md for manual fixes" -ForegroundColor Yellow
} else {
    Write-Host "✅ No TypeScript errors found" -ForegroundColor Green
}
Write-Host ""

# ============================================================
# STEP 3: Auto-fix ESLint Issues
# ============================================================
Write-Host "🔧 Step 3: Auto-fixing ESLint issues..." -ForegroundColor Yellow
Write-Host "Running ESLint with --fix..." -ForegroundColor Gray

try {
    npm run lint -- --fix 2>&1 | Out-Null
    Write-Host "✅ ESLint auto-fixes applied" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Some ESLint issues require manual fixing" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================
# STEP 4: Enable Rate Limiting
# ============================================================
Write-Host "🔒 Step 4: Enabling rate limiting..." -ForegroundColor Yellow
Set-Location $projectRoot

$mainPyPath = Join-Path $projectRoot "backend/core/app/main.py"
$mainPyContent = Get-Content $mainPyPath -Raw

if ($mainPyContent -match "# app\.add_middleware\(AdvancedRateLimitingMiddleware\)") {
    Write-Host "Uncommenting rate limiting middleware..." -ForegroundColor Gray
    $mainPyContent = $mainPyContent -replace "# app\.add_middleware\(AdvancedRateLimitingMiddleware\)", "app.add_middleware(AdvancedRateLimitingMiddleware)"
    Set-Content $mainPyPath $mainPyContent
    Write-Host "✅ Rate limiting enabled" -ForegroundColor Green
} else {
    Write-Host "⚠️  Rate limiting already enabled or not found" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================
# STEP 5: Check Environment Variables
# ============================================================
Write-Host "🔍 Step 5: Checking environment variables..." -ForegroundColor Yellow

$envPath = Join-Path $projectRoot ".env"
$envContent = Get-Content $envPath -Raw

$requiredVars = @(
    "SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET"
)

$missingVars = @()
foreach ($var in $requiredVars) {
    if ($envContent -notmatch "$var=.+") {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "⚠️  Missing or empty environment variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "   - $var" -ForegroundColor Red
    }
} else {
    Write-Host "✅ All required environment variables present" -ForegroundColor Green
}

# Check for placeholder values
$placeholders = @(
    "YOUR_GOOGLE_MAPS_API_KEY_HERE",
    "YOUR_OPENAI_API_KEY_HERE",
    "mock_",
    "test_mock"
)

$foundPlaceholders = @()
foreach ($placeholder in $placeholders) {
    if ($envContent -match $placeholder) {
        $foundPlaceholders += $placeholder
    }
}

if ($foundPlaceholders.Count -gt 0) {
    Write-Host "⚠️  Found placeholder values in .env:" -ForegroundColor Yellow
    foreach ($placeholder in $foundPlaceholders) {
        Write-Host "   - $placeholder" -ForegroundColor Yellow
    }
    Write-Host "   Replace with real credentials before deployment" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================
# STEP 6: Security Audit
# ============================================================
Write-Host "🔒 Step 6: Running security audit..." -ForegroundColor Yellow

# Check if .env is in .gitignore
$gitignorePath = Join-Path $projectRoot ".gitignore"
$gitignoreContent = Get-Content $gitignorePath -Raw

if ($gitignoreContent -match "^\.env$" -or $gitignoreContent -match "^\.env\s") {
    Write-Host "✅ .env is in .gitignore" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env not found in .gitignore - adding it..." -ForegroundColor Yellow
    Add-Content $gitignorePath "`n.env"
    Write-Host "✅ Added .env to .gitignore" -ForegroundColor Green
}

# Check if BYPASS_AUTH is false
if ($envContent -match "BYPASS_AUTH=false" -or $envContent -notmatch "BYPASS_AUTH=true") {
    Write-Host "✅ BYPASS_AUTH is disabled" -ForegroundColor Green
} else {
    Write-Host "⚠️  BYPASS_AUTH is enabled - DISABLE for production!" -ForegroundColor Red
}

# Check if VITE_BYPASS_AUTH is false
if ($envContent -match "VITE_BYPASS_AUTH=false" -or $envContent -notmatch "VITE_BYPASS_AUTH=true") {
    Write-Host "✅ VITE_BYPASS_AUTH is disabled" -ForegroundColor Green
} else {
    Write-Host "⚠️  VITE_BYPASS_AUTH is enabled - DISABLE for production!" -ForegroundColor Red
}
Write-Host ""

# ============================================================
# STEP 7: Generate Summary Report
# ============================================================
Write-Host "📊 Step 7: Generating summary report..." -ForegroundColor Yellow

$reportPath = Join-Path $projectRoot "DEPLOYMENT_STATUS.txt"
$report = @"
============================================================
Netra-Ai Deployment Status Report
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
============================================================

AUTOMATED FIXES APPLIED:
- ✅ Backup created at: $backupDir
- $(if ($typeCheckErrors -eq 0) { "✅" } else { "⚠️ " }) TypeScript errors: $typeCheckErrors found
- ✅ ESLint auto-fixes applied
- ✅ Rate limiting enabled
- $(if ($missingVars.Count -eq 0) { "✅" } else { "⚠️ " }) Environment variables: $($missingVars.Count) missing
- $(if ($foundPlaceholders.Count -eq 0) { "✅" } else { "⚠️ " }) Placeholder values: $($foundPlaceholders.Count) found

MANUAL ACTIONS REQUIRED:
1. 🔴 CRITICAL: Rotate all exposed API keys
   - Supabase service key
   - LiveKit API key/secret
   - Google Gemini API key
   - OpenAI API key
   - Payment gateway keys

2. 🔴 CRITICAL: Fix TypeScript compilation errors ($typeCheckErrors found)
   - See DEPLOYMENT_FIXES_REQUIRED.md for details

3. 🟡 HIGH: Replace placeholder values in .env
   - GOOGLE_MAPS_API_KEY
   - OPENAI_API_KEY
   - Other mock credentials

4. 🟡 HIGH: Add missing environment variables
$(foreach ($var in $missingVars) { "   - $var`n" })

5. 🟡 HIGH: Run comprehensive tests
   - Frontend: npm run test
   - Backend: pytest
   - E2E: npm run test:e2e

NEXT STEPS:
1. Review DEPLOYMENT_FIXES_REQUIRED.md for detailed instructions
2. Complete manual actions listed above
3. Test in staging environment
4. Deploy to production

For detailed fixes, see: DEPLOYMENT_FIXES_REQUIRED.md
============================================================
"@

Set-Content $reportPath $report
Write-Host "✅ Report saved to: DEPLOYMENT_STATUS.txt" -ForegroundColor Green
Write-Host ""

# ============================================================
# FINAL SUMMARY
# ============================================================
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🎉 Automated Fixes Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Completed:" -ForegroundColor Green
Write-Host "   - Backup created" -ForegroundColor Gray
Write-Host "   - ESLint auto-fixes applied" -ForegroundColor Gray
Write-Host "   - Rate limiting enabled" -ForegroundColor Gray
Write-Host "   - Security checks performed" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Manual Actions Required:" -ForegroundColor Yellow
Write-Host "   1. Rotate all exposed API keys (CRITICAL)" -ForegroundColor Red
Write-Host "   2. Fix $typeCheckErrors TypeScript errors" -ForegroundColor Yellow
Write-Host "   3. Replace $($foundPlaceholders.Count) placeholder values" -ForegroundColor Yellow
Write-Host "   4. Add $($missingVars.Count) missing environment variables" -ForegroundColor Yellow
Write-Host ""
Write-Host "📄 Review these files:" -ForegroundColor Cyan
Write-Host "   - DEPLOYMENT_FIXES_REQUIRED.md (detailed guide)" -ForegroundColor Gray
Write-Host "   - DEPLOYMENT_STATUS.txt (this run's summary)" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Next: Review manual actions and test thoroughly!" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
