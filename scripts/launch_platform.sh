#!/bin/bash

# Netra AI - Complete Startup Script
# This script starts all services in the correct order

set -e  # Exit on error

echo "🚀 Starting Netra AI Platform..."
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "QUICK_START.md" ]; then
    echo -e "${RED}❌ Error: Must run from Netra-Ai root directory${NC}"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.9+${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Python 3 found"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js found"

if ! command_exists npm; then
    echo -e "${RED}❌ npm not found. Please install npm${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} npm found"

echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Please create .env file from .env.example"
    exit 1
fi
echo -e "${GREEN}✓${NC} .env file found"

echo ""
echo "================================"
echo ""

# Start Backend
echo "🔧 Starting Backend Server..."
echo "--------------------------------"

cd services/core

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate || source venv/Scripts/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -q -r requirements.txt

# Start backend in background
echo "Starting FastAPI server on port 8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo -e "${GREEN}✓${NC} Backend started (PID: $BACKEND_PID)"
echo ""

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend failed to start${NC}"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

cd ../..

echo ""
echo "================================"
echo ""

# Start Frontend
echo "🎨 Starting Frontend Server..."
echo "--------------------------------"

cd apps/web

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

# Start frontend in background
echo "Starting Vite dev server on port 5173..."
npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}✓${NC} Frontend started (PID: $FRONTEND_PID)"
echo ""

# Wait for frontend to be ready
echo "Waiting for frontend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Frontend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠${NC} Frontend may still be starting..."
    fi
    sleep 1
done

cd ../..

echo ""
echo "================================"
echo "🎉 Netra AI Platform Started!"
echo "================================"
echo ""
echo "📍 Services:"
echo "  • Frontend:  http://localhost:5173"
echo "  • Backend:   http://localhost:8000"
echo "  • API Docs:  http://localhost:8000/docs"
echo ""
echo "📝 Process IDs:"
echo "  • Backend:  $BACKEND_PID"
echo "  • Frontend: $FRONTEND_PID"
echo ""
echo "🛑 To stop all services:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Or press Ctrl+C to stop this script"
echo ""

# Keep script running
wait
