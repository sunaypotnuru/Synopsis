# ============================================================================
# MCP Server Local Testing Script (PowerShell)
# ============================================================================
# This script:
# 1. Builds Docker image
# 2. Runs Docker container
# 3. Tests all 11 MCP tools
# 4. Stops container
# ============================================================================

$ErrorActionPreference = "Stop"

# Configuration
$IMAGE_NAME = "netraai-mcp-server"
$CONTAINER_NAME = "netraai-mcp-test"
$PORT = 8080

Write-Host "============================================================================" -ForegroundColor Blue
Write-Host "                    MCP SERVER LOCAL TESTING" -ForegroundColor Blue
Write-Host "============================================================================" -ForegroundColor Blue

# Step 1: Build Docker image
Write-Host "`nStep 1: Building Docker image..." -ForegroundColor Blue
Set-Location "backend/mcp-server"
docker build -f Dockerfile.local -t $IMAGE_NAME .
Write-Host "✅ Docker image built successfully" -ForegroundColor Green

# Step 2: Stop any existing container
Write-Host "`nStep 2: Stopping any existing container..." -ForegroundColor Blue
docker stop $CONTAINER_NAME 2>$null
docker rm $CONTAINER_NAME 2>$null
Write-Host "✅ Cleaned up existing containers" -ForegroundColor Green

# Step 3: Run Docker container
Write-Host "`nStep 3: Starting Docker container..." -ForegroundColor Blue
docker run -d `
  --name $CONTAINER_NAME `
  -p ${PORT}:${PORT} `
  --env-file .env `
  $IMAGE_NAME

Write-Host "✅ Docker container started" -ForegroundColor Green

# Step 4: Wait for server to be ready
Write-Host "`nStep 4: Waiting for server to be ready..." -ForegroundColor Blue
Start-Sleep -Seconds 5

# Check if container is running
$containerRunning = docker ps | Select-String $CONTAINER_NAME
if (-not $containerRunning) {
  Write-Host "❌ Container failed to start" -ForegroundColor Red
  Write-Host "Container logs:" -ForegroundColor Yellow
  docker logs $CONTAINER_NAME
  exit 1
}

Write-Host "✅ Server is ready" -ForegroundColor Green

# Step 5: Run tests
Write-Host "`nStep 5: Running MCP tool tests..." -ForegroundColor Blue
Set-Location "../.."
python scripts/test_mcp_local.py

$TEST_EXIT_CODE = $LASTEXITCODE

# Step 6: Show container logs
Write-Host "`nStep 6: Container logs (last 50 lines):" -ForegroundColor Blue
docker logs --tail 50 $CONTAINER_NAME

# Step 7: Stop container
Write-Host "`nStep 7: Stopping container..." -ForegroundColor Blue
docker stop $CONTAINER_NAME
docker rm $CONTAINER_NAME
Write-Host "✅ Container stopped and removed" -ForegroundColor Green

# Final result
Write-Host "`n============================================================================" -ForegroundColor Blue
if ($TEST_EXIT_CODE -eq 0) {
  Write-Host "✅ ALL TESTS PASSED - MCP SERVER READY FOR PRODUCTION!" -ForegroundColor Green
} else {
  Write-Host "❌ SOME TESTS FAILED - REVIEW ERRORS ABOVE" -ForegroundColor Red
}
Write-Host "============================================================================" -ForegroundColor Blue

exit $TEST_EXIT_CODE
