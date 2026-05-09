# ============================================================
# BACKEND API VERIFICATION SCRIPT (PowerShell)
# ============================================================
# This script systematically tests all backend API endpoints
# to verify Phase 3 of the verification plan.
# ============================================================

param(
    [string]$ApiBaseUrl = "http://localhost:8000"
)

$ApiV1 = "$ApiBaseUrl/api/v1"

# Counters
$script:TotalTests = 0
$script:PassedTests = 0
$script:FailedTests = 0
$script:FailedTestNames = @()

# ============================================================
# HELPER FUNCTIONS
# ============================================================

function Write-Header {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "========================================`n" -ForegroundColor Blue
}

function Write-TestInfo {
    param([string]$Message)
    Write-Host "Testing: " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ PASS: " -ForegroundColor Green -NoNewline
    Write-Host $Message
    $script:PassedTests++
    $script:TotalTests++
}

function Write-Failure {
    param([string]$Message, [string]$Error)
    Write-Host "✗ FAIL: " -ForegroundColor Red -NoNewline
    Write-Host $Message
    Write-Host "  Error: $Error" -ForegroundColor Red
    $script:FailedTestNames += $Message
    $script:FailedTests++
    $script:TotalTests++
}

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [int]$ExpectedStatus,
        [string]$Description,
        [string]$Body = $null
    )
    
    Write-TestInfo $Description
    
    try {
        $params = @{
            Uri = $Endpoint
            Method = $Method
            ErrorAction = 'Stop'
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = 'application/json'
        }
        
        $response = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Success "$Description (Status: $statusCode)"
        } else {
            Write-Failure $Description "Expected status $ExpectedStatus, got $statusCode"
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $ExpectedStatus) {
            Write-Success "$Description (Status: $statusCode)"
        } else {
            $errorMsg = $_.Exception.Message
            Write-Failure $Description "Expected status $ExpectedStatus, got $statusCode. Error: $errorMsg"
        }
    }
}

# ============================================================
# PHASE 3.1: CORE HEALTH ENDPOINTS
# ============================================================

function Test-CoreHealth {
    Write-Header "PHASE 3.1: Core Health Endpoints"
    
    Test-Endpoint -Method "GET" -Endpoint "$ApiBaseUrl/" -ExpectedStatus 200 -Description "Root endpoint"
    Test-Endpoint -Method "GET" -Endpoint "$ApiBaseUrl/health" -ExpectedStatus 200 -Description "Health check endpoint"
}

# ============================================================
# PHASE 3.2: PATIENT API
# ============================================================

function Test-PatientApi {
    Write-Header "PHASE 3.2: Patient API"
    
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/patients" -ExpectedStatus 200 -Description "List patients endpoint"
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/patients/profile" -ExpectedStatus 200 -Description "Get patient profile"
}

# ============================================================
# PHASE 3.3: DOCTOR API
# ============================================================

function Test-DoctorApi {
    Write-Header "PHASE 3.3: Doctor API"
    
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/doctors" -ExpectedStatus 200 -Description "List doctors endpoint"
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/doctors/profile" -ExpectedStatus 200 -Description "Get doctor profile"
}

# ============================================================
# PHASE 3.4: ADMIN API
# ============================================================

function Test-AdminApi {
    Write-Header "PHASE 3.4: Admin API"
    
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/admin/users" -ExpectedStatus 200 -Description "List users endpoint"
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/admin/stats" -ExpectedStatus 200 -Description "Admin statistics endpoint"
}

# ============================================================
# PHASE 3.5: SYSTEM HEALTH API
# ============================================================

function Test-SystemHealthApi {
    Write-Header "PHASE 3.5: System Health API"
    
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/system-health" -ExpectedStatus 200 -Description "System health endpoint"
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/system-health/metrics" -ExpectedStatus 200 -Description "System metrics endpoint"
}

# ============================================================
# PHASE 3.6: AI/ML API
# ============================================================

function Test-AiApi {
    Write-Header "PHASE 3.6: AI/ML API"
    
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/ai/models" -ExpectedStatus 200 -Description "List AI models endpoint"
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/ml/models" -ExpectedStatus 200 -Description "ML models endpoint"
}

# ============================================================
# PHASE 3.7: ADDITIONAL FEATURE APIS
# ============================================================

function Test-AdditionalApis {
    Write-Header "PHASE 3.7: Additional Feature APIs"
    
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/hospitals" -ExpectedStatus 200 -Description "Hospitals endpoint"
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/messages" -ExpectedStatus 200 -Description "Messages endpoint"
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/analytics" -ExpectedStatus 200 -Description "Analytics endpoint"
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/audit" -ExpectedStatus 200 -Description "Audit logs endpoint"
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/health-records" -ExpectedStatus 200 -Description "Health records endpoint"
    Test-Endpoint -Method "GET" -Endpoint "$ApiV1/timeline" -ExpectedStatus 200 -Description "Timeline endpoint"
}

# ============================================================
# MAIN EXECUTION
# ============================================================

function Main {
    Write-Host "`n============================================================" -ForegroundColor Blue
    Write-Host "  NETRA AI - BACKEND API VERIFICATION" -ForegroundColor Blue
    Write-Host "  Phase 3: Backend API Verification" -ForegroundColor Blue
    Write-Host "============================================================`n" -ForegroundColor Blue
    Write-Host "API Base URL: $ApiBaseUrl"
    Write-Host "Testing started at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Host ""
    
    # Pre-flight check
    Write-Header "Pre-flight Check"
    try {
        $health = Invoke-RestMethod -Uri "$ApiBaseUrl/health" -Method Get -ErrorAction Stop
        if ($health.status -eq "healthy") {
            Write-Success "Backend service is running and healthy"
        } else {
            Write-Host "ERROR: Backend service returned unexpected health status: $($health.status)" -ForegroundColor Red
            exit 1
        }
    }
    catch {
        Write-Host "ERROR: Backend service is not running at $ApiBaseUrl" -ForegroundColor Red
        Write-Host "Please start the backend service first:" -ForegroundColor Red
        Write-Host "  docker-compose up -d backend" -ForegroundColor Yellow
        exit 1
    }
    
    # Run all test suites
    Test-CoreHealth
    Test-PatientApi
    Test-DoctorApi
    Test-AdminApi
    Test-SystemHealthApi
    Test-AiApi
    Test-AdditionalApis
    
    # Print summary
    Write-Header "TEST SUMMARY"
    Write-Host "Total Tests:  " -NoNewline
    Write-Host $script:TotalTests -ForegroundColor Blue
    Write-Host "Passed:       " -NoNewline
    Write-Host $script:PassedTests -ForegroundColor Green
    Write-Host "Failed:       " -NoNewline
    Write-Host $script:FailedTests -ForegroundColor Red
    
    if ($script:FailedTests -gt 0) {
        Write-Host "`nFailed Tests:" -ForegroundColor Red
        foreach ($testName in $script:FailedTestNames) {
            Write-Host "  ✗ $testName" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Testing completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
    # Exit with appropriate code
    if ($script:FailedTests -eq 0) {
        Write-Host "`n✓ ALL TESTS PASSED!`n" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "`n✗ SOME TESTS FAILED`n" -ForegroundColor Red
        exit 1
    }
}

# Run main function
Main
