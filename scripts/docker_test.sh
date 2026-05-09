#!/bin/bash
# ============================================================================
# Docker Local Testing Script
# ============================================================================
# Purpose: Build and test MCP server locally using Docker
# Usage: bash scripts/docker_test.sh
# ============================================================================

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="netraai-mcp-server"
CONTAINER_NAME="netraai-mcp-test"
PORT=8080

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}NetraAI MCP Server - Docker Local Testing${NC}"
echo -e "${BLUE}============================================================================${NC}\n"

# Step 1: Check if Docker is running
echo -e "${BLUE}[1/6] Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}\n"

# Step 2: Navigate to MCP server directory
echo -e "${BLUE}[2/6] Navigating to MCP server directory...${NC}"
cd "$(dirname "$0")/../backend/mcp-server" || exit 1
echo -e "${GREEN}✓ In directory: $(pwd)${NC}\n"

# Step 3: Build Docker image
echo -e "${BLUE}[3/6] Building Docker image...${NC}"
echo -e "${YELLOW}This may take 3-5 minutes...${NC}"
if docker build -f Dockerfile.local -t $IMAGE_NAME . ; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}\n"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
fi

# Step 4: Stop and remove existing container (if any)
echo -e "${BLUE}[4/6] Cleaning up existing containers...${NC}"
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup complete${NC}\n"

# Step 5: Run Docker container
echo -e "${BLUE}[5/6] Starting Docker container...${NC}"
if docker run -d \
    --name $CONTAINER_NAME \
    -p $PORT:$PORT \
    --env-file .env \
    $IMAGE_NAME ; then
    echo -e "${GREEN}✓ Container started${NC}\n"
else
    echo -e "${RED}✗ Failed to start container${NC}"
    exit 1
fi

# Wait for server to start
echo -e "${YELLOW}Waiting for server to start (10 seconds)...${NC}"
sleep 10

# Step 6: Test health endpoint
echo -e "${BLUE}[6/6] Testing health endpoint...${NC}"
if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Health check passed${NC}\n"
    
    # Show health response
    echo -e "${BLUE}Health Response:${NC}"
    curl -s http://localhost:$PORT/health | python -m json.tool
    echo -e "\n"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo -e "${YELLOW}Container logs:${NC}"
    docker logs $CONTAINER_NAME
    exit 1
fi

# Success message
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}✓ Docker container is running successfully!${NC}"
echo -e "${GREEN}============================================================================${NC}\n"

echo -e "${BLUE}Container Info:${NC}"
echo -e "  Name: $CONTAINER_NAME"
echo -e "  Port: $PORT"
echo -e "  URL: http://localhost:$PORT\n"

echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Run comprehensive tests: ${YELLOW}python scripts/test_all_11_tools.py${NC}"
echo -e "  2. View logs: ${YELLOW}docker logs -f $CONTAINER_NAME${NC}"
echo -e "  3. Stop container: ${YELLOW}docker stop $CONTAINER_NAME${NC}"
echo -e "  4. Remove container: ${YELLOW}docker rm $CONTAINER_NAME${NC}\n"

echo -e "${GREEN}🎉 Ready for testing!${NC}\n"
