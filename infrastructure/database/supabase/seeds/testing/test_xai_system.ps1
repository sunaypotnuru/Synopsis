# XAI System Verification Test Script
# Tests both Cataract and Diabetic Retinopathy XAI implementations

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "XAI System Verification Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorCount = 0
$SuccessCount = 0

# Test 1: Check Cataract Service Health
Write-Host "Test 1: Checking Cataract Service Health..." -ForegroundColor Yellow
try {
    $cataractHealth = Invoke-RestMethod -Uri "http://localhost:8005/health" -ErrorAction Stop
    
    if ($cataractHealth.status -eq "healthy") {
        Write-Host "  [PASS] Cataract service is healthy" -ForegroundColor Green
        $SuccessCount++
    } else {
        Write-Host "  [FAIL] Cataract service status: $($cataractHealth.status)" -ForegroundColor Red
        $ErrorCount++
    }
    
    if ($cataractHealth.model_loaded -eq $true) {
        Write-Host "  [PASS] Model is loaded" -ForegroundColor Green
        $SuccessCount++
    } else {
        Write-Host "  [FAIL] Model is not loaded" -ForegroundColor Red
        $ErrorCount++
    }
    
    if ($cataractHealth.PSObject.Properties.Name -contains "xai_enabled") {
        if ($cataractHealth.xai_enabled -eq $true) {
            Write-Host "  [PASS] XAI is enabled" -ForegroundColor Green
            $SuccessCount++
        } else {
            Write-Host "  [WARN] XAI is disabled" -ForegroundColor Yellow
            Write-Host "        This may be expected if dependencies are not installed" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [FAIL] xai_enabled field missing from health response" -ForegroundColor Red
        $ErrorCount++
    }
    
} catch {
    Write-Host "  [FAIL] Cannot connect to cataract service: $($_.Exception.Message)" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# Test 2: Check DR Service Health
Write-Host "Test 2: Checking Diabetic Retinopathy Service Health..." -ForegroundColor Yellow
try {
    $drHealth = Invoke-RestMethod -Uri "http://localhost:8002/health" -ErrorAction Stop
    
    if ($drHealth.status -eq "healthy") {
        Write-Host "  [PASS] DR service is healthy" -ForegroundColor Green
        $SuccessCount++
    } else {
        Write-Host "  [FAIL] DR service status: $($drHealth.status)" -ForegroundColor Red
        $ErrorCount++
    }
    
    if ($drHealth.model_loaded -eq $true) {
        Write-Host "  [PASS] Model is loaded" -ForegroundColor Green
        $SuccessCount++
    } else {
        Write-Host "  [FAIL] Model is not loaded" -ForegroundColor Red
        $ErrorCount++
    }
    
    if ($drHealth.PSObject.Properties.Name -contains "xai_enabled") {
        if ($drHealth.xai_enabled -eq $true) {
            Write-Host "  [PASS] XAI is enabled" -ForegroundColor Green
            $SuccessCount++
        } else {
            Write-Host "  [WARN] XAI is disabled" -ForegroundColor Yellow
            Write-Host "        This may be expected if dependencies are not installed" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [FAIL] xai_enabled field missing from health response" -ForegroundColor Red
        $ErrorCount++
    }
    
} catch {
    Write-Host "  [FAIL] Cannot connect to DR service: $($_.Exception.Message)" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# Test 3: Check Backend Service
Write-Host "Test 3: Checking Backend Service..." -ForegroundColor Yellow
try {
    $backendHealth = Invoke-RestMethod -Uri "http://localhost:8000/health" -ErrorAction Stop
    
    if ($backendHealth.status -eq "healthy") {
        Write-Host "  [PASS] Backend service is healthy" -ForegroundColor Green
        $SuccessCount++
    } else {
        Write-Host "  [FAIL] Backend service status: $($backendHealth.status)" -ForegroundColor Red
        $ErrorCount++
    }
    
} catch {
    Write-Host "  [FAIL] Cannot connect to backend service: $($_.Exception.Message)" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# Test 4: Check Docker Containers
Write-Host "Test 4: Checking Docker Containers..." -ForegroundColor Yellow
try {
    $containers = docker ps --format "{{.Names}}" 2>$null
    
    $requiredContainers = @(
        "netra-ai-cataract-1",
        "netra-ai-diabetic-retinopathy-1",
        "netra-ai-backend-1"
    )
    
    foreach ($container in $requiredContainers) {
        if ($containers -contains $container) {
            Write-Host "  [PASS] $container is running" -ForegroundColor Green
            $SuccessCount++
        } else {
            Write-Host "  [FAIL] $container is not running" -ForegroundColor Red
            $ErrorCount++
        }
    }
    
} catch {
    Write-Host "  [FAIL] Cannot check Docker containers: $($_.Exception.Message)" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# Test 5: Check for use_cuda in code (should not exist)
Write-Host "Test 5: Checking for deprecated use_cuda parameter..." -ForegroundColor Yellow
try {
    $useCudaFiles = Get-ChildItem -Path "services" -Recurse -Include "*.py" | 
        Select-String -Pattern "use_cuda\s*=" -SimpleMatch
    
    if ($useCudaFiles.Count -eq 0) {
        Write-Host "  [PASS] No use_cuda parameters found in code" -ForegroundColor Green
        $SuccessCount++
    } else {
        Write-Host "  [FAIL] Found use_cuda parameters in:" -ForegroundColor Red
        foreach ($file in $useCudaFiles) {
            Write-Host "        $($file.Path):$($file.LineNumber)" -ForegroundColor Red
        }
        $ErrorCount++
    }
    
} catch {
    Write-Host "  [WARN] Cannot check for use_cuda: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Test 6: Check grad-cam version in requirements
Write-Host "Test 6: Checking grad-cam version in requirements..." -ForegroundColor Yellow
try {
    $cataractReq = Get-Content "services/cataract/requirements.txt" -Raw
    $drReq = Get-Content "services/diabetic-retinopathy/requirements.txt" -Raw
    
    if ($cataractReq -match "grad-cam==1\.5\.[45]") {
        Write-Host "  [PASS] Cataract service has correct grad-cam version" -ForegroundColor Green
        $SuccessCount++
    } else {
        Write-Host "  [FAIL] Cataract service has incorrect grad-cam version" -ForegroundColor Red
        $ErrorCount++
    }
    
    if ($drReq -match "grad-cam==1\.5\.[45]") {
        Write-Host "  [PASS] DR service has correct grad-cam version" -ForegroundColor Green
        $SuccessCount++
    } else {
        Write-Host "  [FAIL] DR service has incorrect grad-cam version" -ForegroundColor Red
        $ErrorCount++
    }
    
} catch {
    Write-Host "  [FAIL] Cannot check requirements files: $($_.Exception.Message)" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passed: $SuccessCount" -ForegroundColor Green
Write-Host "Failed: $ErrorCount" -ForegroundColor $(if ($ErrorCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Host "✅ All tests passed! XAI system is ready." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Test XAI endpoints with sample images" -ForegroundColor White
    Write-Host "2. Verify heatmap generation in frontend" -ForegroundColor White
    Write-Host "3. Test PDF report generation" -ForegroundColor White
    exit 0
} else {
    Write-Host "❌ Some tests failed. Please review the errors above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Cyan
    Write-Host "1. Check Docker logs: docker-compose logs -f cataract" -ForegroundColor White
    Write-Host "2. Restart services: docker-compose restart cataract diabetic-retinopathy" -ForegroundColor White
    Write-Host "3. Rebuild if needed: docker-compose build cataract diabetic-retinopathy" -ForegroundColor White
    exit 1
}
