#!/bin/bash
# Start all services for DEVELOPMENT environment (localhost)

echo "🚀 Starting EFS VMS Development Environment"
echo "=================================================="
echo ""

# Load environment variables from backend/.env file
# Default values if .env doesn't exist or variable not set
export EFS_BACKEND_PORT=8000
export FLOOR_MAP_PORT=8003
export RAG_BOT_PORT=8002
export MOCK_API_PORT=5000
export MOCK_API_BASE_URL="http://localhost:5000"

# Read from backend/.env if it exists
if [ -f "backend/.env" ]; then
    echo "📄 Loading environment variables from backend/.env..."
    set -a  # Automatically export all variables
    source backend/.env
    set +a  # Stop automatically exporting
fi

# Kill any existing processes on these ports
echo "🧹 Cleaning up existing processes..."
pkill -f "python.*main.py" 2>/dev/null
pkill -f "python.*api.py" 2>/dev/null
pkill -f "python.*mock_api_server.py" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

# Start Backend Services
cd "$(dirname "$0")"

# 1. Main Backend (FastAPI)
echo "🤖 Starting Main Backend (Port 8000)..."
(cd backend && source venv/bin/activate 2>/dev/null || true && python3 main.py) &
BACKEND_PID=$!

sleep 2

# 2. Frontend Super Admin Portal (Port 3001)
echo "🎨 Starting Admin Portal (Port 3001)..."
(cd frontend/admin-portal && npm run dev) &
ADMIN_PID=$!

# 3. Frontend Client Portal (Port 3000)
echo "🎨 Starting Client Portal (Port 3000)..."
(cd frontend/client-portal && npm run dev) &
CLIENT_PID=$!

# 4. Frontend Landing Page (Port 3002)
echo "🚀 Starting Landing Page (Port 3002)..."
(cd frontend/landing-page && npm run dev) &
LANDING_PID=$!

# 5. Database Web Inspector (Port 8005)
echo "🗄️ Starting Database View (Port 8005)..."
(cd backend && ./venv/bin/datasette serve bfsi_platform_test.db --port 8005 --host 0.0.0.0) &
DATASETTE_PID=$!

echo ""
echo "=================================================="
echo "✅ All services started in development mode!"
echo ""
echo "📡 Services:"
echo "   - Landing Page:     http://localhost:3002"
echo "   - Admin Portal:     http://localhost:3001"
echo "   - Client Portal:    http://localhost:3000"
echo "   - Main Backend:     http://localhost:8000"
echo "   - Database Web UI:  http://localhost:8005"
echo "   - WebSocket API:    ws://localhost:8000/ws/{project_id}"
echo "=================================================="


