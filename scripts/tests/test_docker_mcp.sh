#!/bin/bash

# Quick Docker MCP Server Test Script
# Tests the MCP server in Docker before full deployment

set -e

echo "🐳 Docker MCP Server Test"
echo "=========================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Navigate to docker directory
cd "$(dirname "$0")/docker" || exit 1

echo "📦 Building MCP Server container..."
docker-compose build mcp-server

echo ""
echo "🚀 Starting MCP Server..."
docker-compose up -d mcp-server

echo ""
echo "⏳ Waiting for MCP Server to be healthy (max 60 seconds)..."

# Wait for health check
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker-compose ps mcp-server | grep -q "healthy"; then
        echo "✅ MCP Server is healthy!"
        break
    fi
    
    if [ $attempt -eq $((max_attempts - 1)) ]; then
        echo "❌ MCP Server failed to become healthy"
        echo ""
        echo "📋 Container logs:"
        docker-compose logs --tail=50 mcp-server
        exit 1
    fi
    
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
done

echo ""
echo ""
echo "🧪 Running SHARP Compliance Tests..."
echo ""

# Run Python test script
cd ../backend/mcp-server || exit 1

# Check if Python is available
if command -v python3 > /dev/null 2>&1; then
    PYTHON_CMD=python3
elif command -v python > /dev/null 2>&1; then
    PYTHON_CMD=python
else
    echo "❌ Python not found. Please install Python 3."
    exit 1
fi

# Install required packages if needed
$PYTHON_CMD -m pip install httpx python-dateutil > /dev/null 2>&1 || true

# Run tests
export MCP_SERVER_URL="http://localhost:8080"
export MCP_API_KEY="${MCP_API_KEY:-test-api-key-12345}"

$PYTHON_CMD test_sharp_compliance.py

test_result=$?

echo ""
echo "📋 Container Status:"
cd ../../docker || exit 1
docker-compose ps mcp-server

echo ""
echo "📊 Container Logs (last 20 lines):"
docker-compose logs --tail=20 mcp-server

echo ""
if [ $test_result -eq 0 ]; then
    echo "✅ All tests passed! MCP Server is ready for deployment."
    echo ""
    echo "To stop the server:"
    echo "  cd docker && docker-compose down mcp-server"
    echo ""
    echo "To view logs:"
    echo "  cd docker && docker-compose logs -f mcp-server"
else
    echo "❌ Some tests failed. Please review the logs above."
    echo ""
    echo "To view full logs:"
    echo "  cd docker && docker-compose logs mcp-server"
    echo ""
    echo "To restart:"
    echo "  cd docker && docker-compose restart mcp-server"
fi

exit $test_result
