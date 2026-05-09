@echo off
REM ============================================================================
REM Docker Local Testing Script (Windows)
REM ============================================================================
REM Purpose: Build and test MCP server locally using Docker
REM Usage: scripts\docker_test.bat
REM ============================================================================

setlocal enabledelayedexpansion

REM Configuration
set IMAGE_NAME=netraai-mcp-server
set CONTAINER_NAME=netraai-mcp-test
set PORT=8080

echo ============================================================================
echo NetraAI MCP Server - Docker Local Testing
echo ============================================================================
echo.

REM Step 1: Check if Docker is running
echo [1/6] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop.
    exit /b 1
)
echo [OK] Docker is running
echo.

REM Step 2: Navigate to MCP server directory
echo [2/6] Navigating to MCP server directory...
cd /d "%~dp0..\backend\mcp-server"
if errorlevel 1 (
    echo [ERROR] Failed to navigate to MCP server directory
    exit /b 1
)
echo [OK] In directory: %CD%
echo.

REM Step 3: Build Docker image
echo [3/6] Building Docker image...
echo [INFO] This may take 3-5 minutes...
docker build -f Dockerfile.local -t %IMAGE_NAME% .
if errorlevel 1 (
    echo [ERROR] Docker build failed
    exit /b 1
)
echo [OK] Docker image built successfully
echo.

REM Step 4: Stop and remove existing container (if any)
echo [4/6] Cleaning up existing containers...
docker stop %CONTAINER_NAME% >nul 2>&1
docker rm %CONTAINER_NAME% >nul 2>&1
echo [OK] Cleanup complete
echo.

REM Step 5: Run Docker container
echo [5/6] Starting Docker container...
docker run -d --name %CONTAINER_NAME% -p %PORT%:%PORT% --env-file .env %IMAGE_NAME%
if errorlevel 1 (
    echo [ERROR] Failed to start container
    exit /b 1
)
echo [OK] Container started
echo.

REM Wait for server to start
echo [INFO] Waiting for server to start (10 seconds)...
timeout /t 10 /nobreak >nul

REM Step 6: Test health endpoint
echo [6/6] Testing health endpoint...
curl -f http://localhost:%PORT%/health >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Health check failed
    echo [INFO] Container logs:
    docker logs %CONTAINER_NAME%
    exit /b 1
)
echo [OK] Health check passed
echo.

REM Show health response
echo Health Response:
curl -s http://localhost:%PORT%/health
echo.
echo.

REM Success message
echo ============================================================================
echo [SUCCESS] Docker container is running successfully!
echo ============================================================================
echo.

echo Container Info:
echo   Name: %CONTAINER_NAME%
echo   Port: %PORT%
echo   URL: http://localhost:%PORT%
echo.

echo Next Steps:
echo   1. Run comprehensive tests: python scripts\test_all_11_tools.py
echo   2. View logs: docker logs -f %CONTAINER_NAME%
echo   3. Stop container: docker stop %CONTAINER_NAME%
echo   4. Remove container: docker rm %CONTAINER_NAME%
echo.

echo [SUCCESS] Ready for testing!
echo.

endlocal
