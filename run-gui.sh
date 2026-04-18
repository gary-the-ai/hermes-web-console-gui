#!/bin/bash
# ============================================================================
# Hermes Web Console GUI Runner
# ============================================================================
# 1-line run command that boots both the Python backend Gateway
# and the React frontend concurrently.
#
# Usage:
#   ./run-gui.sh
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
HERMES_ENV_FILE="${HERMES_HOME:-$HOME/.hermes}/.env"

echo ""
echo -e "${CYAN}⚕ Starting Hermes Web Console...${NC}"
echo -e "Press ${YELLOW}Ctrl+C${NC} at any time to shut down both servers safely."
echo ""

# 1. Start the Python Backend
echo -e "${GREEN}✓${NC} Initializing Hermes Backend Gateway..."
if [ -f "$SCRIPT_DIR/venv/bin/activate" ]; then
    source "$SCRIPT_DIR/venv/bin/activate"
else
    echo -e "${RED}✗ Virtual environment not found. Please run ./setup-gui.sh first.${NC}"
    exit 1
fi

# Load user env vars so the backend and Vite proxy inherit API_SERVER_KEY.
if [ -f "$HERMES_ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$HERMES_ENV_FILE"
    set +a
fi

# Run the python gateway in the background
API_SERVER_ENABLED=true python "$SCRIPT_DIR/gateway/run.py" &
BACKEND_PID=$!
echo -e "  ↳ Backend PID: $BACKEND_PID"

# Wait briefly for the API server to accept connections before starting Vite.
for _ in $(seq 1 50); do
    if (echo > /dev/tcp/127.0.0.1/8642) >/dev/null 2>&1; then
        break
    fi
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}✗ Backend exited before opening port 8642.${NC}"
        exit 1
    fi
    sleep 0.2
done

if ! (echo > /dev/tcp/127.0.0.1/8642) >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Backend is still starting; the frontend will retry automatically.${NC}"
fi

# 2. Start the React Frontend
echo -e "${GREEN}✓${NC} Initializing React Frontend..."
cd "$SCRIPT_DIR/web_console"

if [ ! -d "node_modules" ]; then
    echo -e "${RED}✗ node_modules not found. Please run ./setup-gui.sh first.${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Run vite dev server in the background
npm run dev &
FRONTEND_PID=$!
echo -e "  ↳ Frontend PID: $FRONTEND_PID"

echo ""
echo -e "${GREEN}★ Web Console is up and running! ★${NC}"
echo -e "Backend running on port 8642. Frontend running on port 5173 (usually)."
echo ""

# Handle Shutdown Gracefully
cleanup() {
    echo ""
    echo -e "${YELLOW}⚠ Shutting down Hermes Web Console...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    
    # Wait for processes to exit
    wait $BACKEND_PID 2>/dev/null || true
    wait $FRONTEND_PID 2>/dev/null || true
    
    # Just in case there are orphaned children processes
    pkill -P $BACKEND_PID 2>/dev/null || true
    pkill -P $FRONTEND_PID 2>/dev/null || true
    
    echo -e "${GREEN}✓ Shutdown complete. Goodbye!${NC}"
    exit 0
}

# Trap termination signals
trap cleanup SIGINT SIGTERM

# Wait indefinitely for the background tasks to prevent script from exiting
wait
