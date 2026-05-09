# SHARP-on-MCP Compliance Test Suite (PowerShell)
# Tests all SHARP-on-MCP requirements for Agents Assemble Hackathon

$ErrorActionPreference = "Stop"

# Configuration
$BASE_URL = if ($env:MCP_SERVER_URL) { $env:MCP_SERVER_URL } else { "http://localhost:8080" }
$API_KEY = if ($env:MCP_API_KEY) { $env:MCP_API_KEY } else { "test-api-key-12345" }
$FHIR_SERVER = "https://hapi.fhir.org/baseR4"
$PATIENT_ID = "example"

Write-Host "`n🧪 SHARP-on-MCP Compliance Test Suite" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Test Configuration:" -ForegroundColor Yellow
Write-Host "  Base URL: $BASE_URL"
Write-Host "  FHIR Server: $FHIR_SERVER"
Write-Host "  Patient ID: $PATIENT_ID"
Write-Host ""

$testResults = @()

# Test 1: Agent Card Discovery
Write-Host "Test 1: Agent Card Discovery" -ForegroundColor Yellow
Write-Host "----------------------------"
try {
    $response = Invoke-WebRequest -UseBasicParsing "$BASE_URL/.well-known/agent-card.json"
    $card = $response.Content | ConvertFrom-Json
    
    if ($card.name -and $card.version) {
        Write-Host "✅ Agent card accessible at /.well-known/agent-card.json" -ForegroundColor Green
        Write-Host "   Name: $($card.name)"
        Write-Host "   Version: $($card.version)"
        $testResults += @{ Name = "Agent Card Discovery"; Passed = $true; Critical = $true }
    } else {
        Write-Host "❌ Agent card missing required fields" -ForegroundColor Red
        $testResults += @{ Name = "Agent Card Discovery"; Passed = $false; Critical = $true }
    }
} catch {
    Write-Host "❌ Agent card not accessible: $_" -ForegroundColor Red
    $testResults += @{ Name = "Agent Card Discovery"; Passed = $false; Critical = $true }
}
Write-Host ""

# Test 2: Skills Array
Write-Host "Test 2: Skills Array with Keywords" -ForegroundColor Yellow
Write-Host "-----------------------------------"
try {
    $skillsCount = $card.skills.Count
    if ($skillsCount -ge 5) {
        Write-Host "✅ Agent card has $skillsCount skills" -ForegroundColor Green
        foreach ($skill in $card.skills) {
            $keywords = $skill.keywords -join ", "
            Write-Host "   - $($skill.name): $($keywords.Substring(0, [Math]::Min(50, $keywords.Length)))..."
        }
        $testResults += @{ Name = "Skills Array"; Passed = $true; Critical = $true }
    } else {
        Write-Host "❌ Insufficient skills (found: $skillsCount, expected: ≥5)" -ForegroundColor Red
        $testResults += @{ Name = "Skills Array"; Passed = $false; Critical = $true }
    }
} catch {
    Write-Host "❌ Skills array test failed: $_" -ForegroundColor Red
    $testResults += @{ Name = "Skills Array"; Passed = $false; Critical = $true }
}
Write-Host ""

# Test 3: FHIR Capabilities
Write-Host "Test 3: FHIR Capabilities Declaration" -ForegroundColor Yellow
Write-Host "--------------------------------------"
try {
    $supportsFHIR = $card.capabilities.supportsFHIRContext
    $supportsSHARP = $card.capabilities.supportsSHARP
    
    if ($supportsFHIR -and $supportsSHARP) {
        Write-Host "✅ FHIR context support declared" -ForegroundColor Green
        Write-Host "   supportsFHIRContext: $supportsFHIR"
        Write-Host "   supportsSHARP: $supportsSHARP"
        Write-Host "   FHIR Versions: $($card.capabilities.supportedFHIRVersions -join ', ')"
        $testResults += @{ Name = "FHIR Capabilities"; Passed = $true; Critical = $true }
    } else {
        Write-Host "❌ FHIR capabilities not properly declared" -ForegroundColor Red
        $testResults += @{ Name = "FHIR Capabilities"; Passed = $false; Critical = $true }
    }
} catch {
    Write-Host "❌ FHIR capabilities test failed: $_" -ForegroundColor Red
    $testResults += @{ Name = "FHIR Capabilities"; Passed = $false; Critical = $true }
}
Write-Host ""

# Test 4: FHIR Scopes
Write-Host "Test 4: FHIR Scopes Declaration" -ForegroundColor Yellow
Write-Host "--------------------------------"
try {
    $scopesCount = $card.capabilities.fhirScopes.Count
    if ($scopesCount -ge 3) {
        $scopesText = "$scopesCount scopes"
        Write-Host "✅ FHIR scopes declared ($scopesText)" -ForegroundColor Green
        foreach ($scope in $card.capabilities.fhirScopes) {
            Write-Host "   - $scope"
        }
        $testResults += @{ Name = "FHIR Scopes"; Passed = $true; Critical = $true }
    } else {
        Write-Host "❌ Insufficient FHIR scopes (found: $scopesCount, expected: ≥3)" -ForegroundColor Red
        $testResults += @{ Name = "FHIR Scopes"; Passed = $false; Critical = $true }
    }
} catch {
    Write-Host "❌ FHIR scopes test failed: $_" -ForegroundColor Red
    $testResults += @{ Name = "FHIR Scopes"; Passed = $false; Critical = $true }
}
Write-Host ""

# Test 5: Experimental Capabilities
Write-Host "Test 5: Experimental SHARP Capability" -ForegroundColor Yellow
Write-Host "--------------------------------------"
try {
    $sharpCapability = $card.capabilities.experimental.'ai.promptopinion/fhir-context'.value
    if ($sharpCapability -eq $true) {
        Write-Host "✅ SHARP-on-MCP capability advertised" -ForegroundColor Green
        Write-Host "   ai.promptopinion/fhir-context: $sharpCapability"
        $testResults += @{ Name = "Experimental Capabilities"; Passed = $true; Critical = $false }
    } else {
        Write-Host "⚠️  SHARP capability not in experimental section" -ForegroundColor Yellow
        $testResults += @{ Name = "Experimental Capabilities"; Passed = $false; Critical = $false }
    }
} catch {
    Write-Host "⚠️  Experimental capabilities test failed (optional)" -ForegroundColor Yellow
    $testResults += @{ Name = "Experimental Capabilities"; Passed = $false; Critical = $false }
}
Write-Host ""

# Test 6: Supported Interfaces
Write-Host "Test 6: Supported Interfaces" -ForegroundColor Yellow
Write-Host "----------------------------"
try {
    $interfacesCount = $card.supportedInterfaces.Count
    if ($interfacesCount -ge 3) {
        Write-Host "✅ Multiple interfaces supported ($interfacesCount)" -ForegroundColor Green
        foreach ($interface in $card.supportedInterfaces) {
            Write-Host "   - $($interface.type): $($interface.url)"
        }
        $testResults += @{ Name = "Supported Interfaces"; Passed = $true; Critical = $true }
    } else {
        Write-Host "❌ Insufficient interfaces (found: $interfacesCount, expected: ≥3)" -ForegroundColor Red
        $testResults += @{ Name = "Supported Interfaces"; Passed = $false; Critical = $true }
    }
} catch {
    Write-Host "❌ Supported interfaces test failed: $_" -ForegroundColor Red
    $testResults += @{ Name = "Supported Interfaces"; Passed = $false; Critical = $true }
}
Write-Host ""

# Test 7: Health Check
Write-Host "Test 7: Health Check Endpoint" -ForegroundColor Yellow
Write-Host "------------------------------"
try {
    $response = Invoke-WebRequest -UseBasicParsing "$BASE_URL/health"
    $health = $response.Content | ConvertFrom-Json
    
    if ($health.status) {
        Write-Host "✅ Health check endpoint working" -ForegroundColor Green
        Write-Host "   Status: $($health.status)"
        Write-Host "   Service: $($health.service)"
        $testResults += @{ Name = "Health Check"; Passed = $true; Critical = $true }
    } else {
        Write-Host "❌ Health check missing status field" -ForegroundColor Red
        $testResults += @{ Name = "Health Check"; Passed = $false; Critical = $true }
    }
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    $testResults += @{ Name = "Health Check"; Passed = $false; Critical = $true }
}
Write-Host ""

# Test 8: SHARP Context in Chat Completions
Write-Host "Test 8: SHARP Context in Chat Completions" -ForegroundColor Yellow
Write-Host "------------------------------------------"
try {
    $headers = @{
        "Content-Type" = "application/json"
        "X-API-Key" = $API_KEY
        "X-FHIR-Server-URL" = $FHIR_SERVER
        "X-Patient-ID" = $PATIENT_ID
    }
    
    $body = @{
        messages = @(
            @{
                role = "user"
                content = "Check for fatigue"
            }
        )
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$BASE_URL/v1/chat/completions" -Headers $headers -Body $body -TimeoutSec 60
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.choices -and $result.choices.Count -gt 0) {
        Write-Host "✅ Chat completions endpoint accepts SHARP headers" -ForegroundColor Green
        $content = $result.choices[0].message.content
        $preview = ($content -split "`n")[0..2] -join "`n"
        Write-Host "   Response preview:"
        Write-Host "   $preview"
        $testResults += @{ Name = "SHARP Chat Completions"; Passed = $true; Critical = $true }
    } else {
        Write-Host "❌ Chat completions response invalid" -ForegroundColor Red
        $testResults += @{ Name = "SHARP Chat Completions"; Passed = $false; Critical = $true }
    }
} catch {
    Write-Host "❌ Chat completions failed: $_" -ForegroundColor Red
    $testResults += @{ Name = "SHARP Chat Completions"; Passed = $false; Critical = $true }
}
Write-Host ""

# Test 9: SHARP Context in JSON-RPC
Write-Host "Test 9: SHARP Context in JSON-RPC" -ForegroundColor Yellow
Write-Host "----------------------------------"
try {
    $headers = @{
        "Content-Type" = "application/json"
        "X-API-Key" = $API_KEY
        "X-FHIR-Server-URL" = $FHIR_SERVER
        "X-Patient-ID" = $PATIENT_ID
    }
    
    $body = @{
        jsonrpc = "2.0"
        id = 1
        method = "agent.interact"
        params = @{
            message = "Screen for vision problems"
            metadata = @{
                "https://app.promptopinion.ai/schemas/a2a/v1/fhir-context" = @{
                    fhirUrl = $FHIR_SERVER
                    patientId = $PATIENT_ID
                }
            }
        }
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$BASE_URL/rpc" -Headers $headers -Body $body -TimeoutSec 60
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.result -and $result.result.message) {
        Write-Host "✅ JSON-RPC endpoint accepts SHARP context" -ForegroundColor Green
        Write-Host "   FHIR context used: $($result.result.metadata.fhir_context_used)"
        Write-Host "   Workflow: $($result.result.metadata.workflow)"
        $testResults += @{ Name = "SHARP JSON-RPC"; Passed = $true; Critical = $true }
    } else {
        Write-Host "❌ JSON-RPC response invalid" -ForegroundColor Red
        $testResults += @{ Name = "SHARP JSON-RPC"; Passed = $false; Critical = $true }
    }
} catch {
    Write-Host "❌ JSON-RPC failed: $_" -ForegroundColor Red
    $testResults += @{ Name = "SHARP JSON-RPC"; Passed = $false; Critical = $true }
}
Write-Host ""

# Test 10: Alternative Card Endpoint
Write-Host "Test 10: Alternative Agent Card Endpoint" -ForegroundColor Yellow
Write-Host "-----------------------------------------"
try {
    $response = Invoke-WebRequest -UseBasicParsing "$BASE_URL/v1/card"
    $cardAlt = $response.Content | ConvertFrom-Json
    
    if ($cardAlt.name) {
        Write-Host "✅ Agent card also accessible at /v1/card" -ForegroundColor Green
        $testResults += @{ Name = "Alternative Card Endpoint"; Passed = $true; Critical = $false }
    } else {
        Write-Host "⚠️  /v1/card endpoint not working (optional)" -ForegroundColor Yellow
        $testResults += @{ Name = "Alternative Card Endpoint"; Passed = $false; Critical = $false }
    }
} catch {
    Write-Host "⚠️  /v1/card endpoint not working (optional)" -ForegroundColor Yellow
    $testResults += @{ Name = "Alternative Card Endpoint"; Passed = $false; Critical = $false }
}
Write-Host ""

# Summary
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$criticalPassed = ($testResults | Where-Object { $_.Critical -and $_.Passed }).Count
$criticalTotal = ($testResults | Where-Object { $_.Critical }).Count
$optionalPassed = ($testResults | Where-Object { -not $_.Critical -and $_.Passed }).Count
$optionalTotal = ($testResults | Where-Object { -not $_.Critical }).Count

Write-Host "Critical Tests: $criticalPassed/$criticalTotal passed"
Write-Host "Optional Tests: $optionalPassed/$optionalTotal passed"
Write-Host "Total: $($criticalPassed + $optionalPassed)/$($testResults.Count) passed"
Write-Host ""

foreach ($result in $testResults) {
    $status = if ($result.Passed) { "✅" } else { if ($result.Critical) { "❌" } else { "⚠️ " } }
    $testType = if ($result.Critical) { "CRITICAL" } else { "OPTIONAL" }
    Write-Host "$status $($result.Name) ($testType)"
}

Write-Host ""

if ($criticalPassed -eq $criticalTotal) {
    Write-Host "🎉 All critical tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:"
    Write-Host "1. Deploy to Render for public URL"
    Write-Host "2. Register on Prompt Opinion marketplace"
    Write-Host "3. Create demo video"
    Write-Host "4. Submit to Devpost"
    exit 0
} else {
    Write-Host "❌ $($criticalTotal - $criticalPassed) critical test(s) failed" -ForegroundColor Red
    exit 1
}
