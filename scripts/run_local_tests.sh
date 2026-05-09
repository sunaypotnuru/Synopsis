#!/bin/bash
# ============================================================================
# MCP Server Local Testing Script
# ============================================================================
# This script:
# 1. Builds Docker image
# 2. Runs Docker container
# 3. Tests all 11 MCP tools
# 4. Stops container
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
echo -e "${BLUE}                    MCP SERVER LOCAL TESTING${NC}"
echo -e "${BLUE}============================================================================${NC}"

# Step 1: Build Docker image
echo -e "\n${BLUE}Step 1: Building Docker image...${NC}"
cd backend/mcp-server
docker build -f Dockerfile.local -t $IMAGE_NAME .
echo -e "${GREEN}✅ Docker image built successfully${NC}"

# Step 2: Stop any existing container
echo -e "\n${BLUE}Step 2: Stopping any existing container...${NC}"
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true
echo -e "${GREEN}✅ Cleaned up existing containers${NC}"

# Step 3: Run Docker container
echo -e "\n${BLUE}Step 3: Starting Docker container...${NC}"
docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:$PORT \
  --env-file .env \
  $IMAGE_NAME

echo -e "${GREEN}✅ Docker container started${NC}"

# Step 4: Wait for server to be ready
echo -e "\n${BLUE}Step 4: Waiting for server to be ready...${NC}"
sleep 5

# Check if container is running
if ! docker ps | grep -q $CONTAINER_NAME; then
  echo -e "${RED}❌ Container failed to start${NC}"
  echo -e "${YELLOW}Container logs:${NC}"
  docker logs $CONTAINER_NAME
  exit 1
fi

echo -e "${GREEN}✅ Server is ready${NC}"

# Step 5: Run tests
echo -e "\n${BLUE}Step 5: Running MCP tool tests...${NC}"
cd ../..
python scripts/test_mcp_local.py

TEST_EXIT_CODE=$?

# Step 6: Show container logs
echo -e "\n${BLUE}Step 6: Container logs (last 50 lines):${NC}"
docker logs --tail 50 $CONTAINER_NAME

# Step 7: Stop container
echo -e "\n${BLUE}Step 7: Stopping container...${NC}"
docker stop $CONTAINER_NAME
docker rm $CONTAINER_NAME
echo -e "${GREEN}✅ Container stopped and removed${NC}"

# Final result
echo -e "\n${BLUE}============================================================================${NC}"
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED - MCP SERVER READY FOR PRODUCTION!${NC}"
else
  echo -e "${RED}❌ SOME TESTS FAILED - REVIEW ERRORS ABOVE${NC}"
fi
echo -e "${BLUE}============================================================================${NC}"

exit $TEST_EXIT_CODE
