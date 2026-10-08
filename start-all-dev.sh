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

# 1. Mock API Server
echo "📡 Starting Mock API Server (Port $MOCK_API_PORT)..."
gnome-terminal -- bash -c "
    cd backend/efs_vms_chatbot
    source venv/bin/activate
    export MOCK_API_PORT=$MOCK_API_PORT
    export MOCK_API_BASE_URL=$MOCK_API_BASE_URL
    python mock_api_server.py
    exec bash
" 2>/dev/null || xterm -e "cd backend/efs_vms_chatbot && source venv/bin/activate && export MOCK_API_PORT=$MOCK_API_PORT && export MOCK_API_BASE_URL=$MOCK_API_BASE_URL && python mock_api_server.py; bash" &

sleep 2

# 2. Main Backend
echo "🤖 Starting Main Backend (Port $EFS_BACKEND_PORT)..."
gnome-terminal -- bash -c "
    cd backend/efs_vms_chatbot
    source venv/bin/activate
    export EFS_BACKEND_PORT=$EFS_BACKEND_PORT
    python main.py
    exec bash
" 2>/dev/null || xterm -e "cd backend/efs_vms_chatbot && source venv/bin/activate && export EFS_BACKEND_PORT=$EFS_BACKEND_PORT && python main.py; bash" &

sleep 2

# 3. Floor Map Server
echo "🗺️  Starting Floor Map Server (Port $FLOOR_MAP_PORT)..."
gnome-terminal -- bash -c "
    cd backend/Floor_map
    source venv/bin/activate
    export FLOOR_MAP_PORT=$FLOOR_MAP_PORT
    python main.py
    exec bash
" 2>/dev/null || xterm -e "cd backend/Floor_map && source venv/bin/activate && export FLOOR_MAP_PORT=$FLOOR_MAP_PORT && python main.py; bash" &

sleep 2

# 4. RAG Bot (Optional)
echo "🧠 Starting RAG Bot (Port $RAG_BOT_PORT)..."
gnome-terminal -- bash -c "
    cd backend/efs-rag-bot
    source venv/bin/activate
    export RAG_BOT_PORT=$RAG_BOT_PORT
    python api.py
    exec bash
" 2>/dev/null || xterm -e "cd backend/efs-rag-bot && source venv/bin/activate && export RAG_BOT_PORT=$RAG_BOT_PORT && python api.py; bash" &

sleep 2

# 5. Frontend
echo "🎨 Starting Frontend (Port 3000)..."
# Update frontend .env.development with correct OIDC authority from backend
if [ -f "frontend/.env.development" ]; then
    # Update VITE_OIDC_AUTHORITY to match backend MOCK_API_BASE_URL
    sed -i.bak "s|VITE_OIDC_AUTHORITY=.*|VITE_OIDC_AUTHORITY=$MOCK_API_BASE_URL|" frontend/.env.development
    rm -f frontend/.env.development.bak
else
    # Create from template if doesn't exist
    cp frontend/env.development.template frontend/.env.development
    # Update VITE_OIDC_AUTHORITY
    sed -i.bak "s|VITE_OIDC_AUTHORITY=.*|VITE_OIDC_AUTHORITY=$MOCK_API_BASE_URL|" frontend/.env.development
    rm -f frontend/.env.development.bak
fi
gnome-terminal -- bash -c "
    cd frontend
    npm run dev
    exec bash
" 2>/dev/null || xterm -e "cd frontend && npm run dev; bash" &

echo ""
echo "=================================================="
echo "✅ All services started in development mode!"
echo ""
echo "📡 Services:"
echo "   - Frontend:          http://localhost:3000"
echo "   - Mock API (OIDC):   $MOCK_API_BASE_URL"
echo "   - Main Backend (WS): ws://localhost:$EFS_BACKEND_PORT/ws"
echo "   - Floor Map:         http://localhost:$FLOOR_MAP_PORT"
echo "   - RAG Bot:           http://localhost:$RAG_BOT_PORT"
echo ""
echo "=================================================="

