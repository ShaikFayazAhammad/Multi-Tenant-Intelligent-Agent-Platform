#!/bin/bash
# Start all services for STAGING environment (192.168.3.155)

SERVER_IP="192.168.3.155"

echo "🚀 Starting EFS VMS Staging Environment"
echo "=================================================="
echo "🌐 Server IP: $SERVER_IP"
echo ""

# Load environment variables from backend/.env file
# Default values if .env doesn't exist or variable not set
export EFS_BACKEND_PORT=8147
export FLOOR_MAP_PORT=8144
export RAG_BOT_PORT=8145
export MOCK_API_PORT=8146
# Default: http://192.168.3.155:8146. When using https://vms2.0.haloocom.in, set MOCK_API_BASE_URL=https://vms2.0.haloocom.in/oidc in backend/.env
export MOCK_API_BASE_URL="http://$SERVER_IP:8146"

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
# Get script directory for absolute paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOGS_DIR="$SCRIPT_DIR/logs"

# Create logs directory if it doesn't exist
mkdir -p "$LOGS_DIR"

# 1. Mock API Server
echo "📡 Starting Mock API Server (Port $MOCK_API_PORT)..."
cd "$SCRIPT_DIR/backend/efs_vms_chatbot"
source venv/bin/activate
export MOCK_API_PORT=$MOCK_API_PORT
export MOCK_API_BASE_URL=$MOCK_API_BASE_URL
nohup python mock_api_server.py > "$LOGS_DIR/mock_api.log" 2>&1 &
MOCK_API_PID=$!
echo "   ✅ Started (PID: $MOCK_API_PID, Log: logs/mock_api.log)"
cd "$SCRIPT_DIR"
sleep 2

# 2. Main Backend
echo "🤖 Starting Main Backend (Port $EFS_BACKEND_PORT)..."
cd "$SCRIPT_DIR/backend/efs_vms_chatbot"
source venv/bin/activate
export EFS_BACKEND_PORT=$EFS_BACKEND_PORT
nohup python main.py > "$LOGS_DIR/main_backend.log" 2>&1 &
MAIN_BACKEND_PID=$!
echo "   ✅ Started (PID: $MAIN_BACKEND_PID, Log: logs/main_backend.log)"
cd "$SCRIPT_DIR"
sleep 2

# 3. Floor Map Server
echo "🗺️  Starting Floor Map Server (Port $FLOOR_MAP_PORT)..."
cd "$SCRIPT_DIR/backend/Floor_map"
source venv/bin/activate
export FLOOR_MAP_PORT=$FLOOR_MAP_PORT
nohup python main.py > "$LOGS_DIR/floor_map.log" 2>&1 &
FLOOR_MAP_PID=$!
echo "   ✅ Started (PID: $FLOOR_MAP_PID, Log: logs/floor_map.log)"
cd "$SCRIPT_DIR"
sleep 2

# 4. RAG Bot (Optional)
echo "🧠 Starting RAG Bot (Port $RAG_BOT_PORT)..."
cd "$SCRIPT_DIR/backend/efs-rag-bot"
source venv/bin/activate
export RAG_BOT_PORT=$RAG_BOT_PORT
nohup python api.py > "$LOGS_DIR/rag_bot.log" 2>&1 &
RAG_BOT_PID=$!
echo "   ✅ Started (PID: $RAG_BOT_PID, Log: logs/rag_bot.log)"
cd "$SCRIPT_DIR"
sleep 2

# 5. Frontend
echo "🎨 Starting Frontend (Port 8148)..."
# Update frontend .env.staging with correct OIDC authority from backend
if [ -f "$SCRIPT_DIR/frontend/.env.staging" ]; then
    # Update VITE_OIDC_AUTHORITY to match backend MOCK_API_BASE_URL
    sed -i.bak "s|VITE_OIDC_AUTHORITY=.*|VITE_OIDC_AUTHORITY=$MOCK_API_BASE_URL|" "$SCRIPT_DIR/frontend/.env.staging"
    rm -f "$SCRIPT_DIR/frontend/.env.staging.bak"
else
    # Create from template if doesn't exist
    cp "$SCRIPT_DIR/frontend/env.staging.template" "$SCRIPT_DIR/frontend/.env.staging"
    # Update VITE_OIDC_AUTHORITY
    sed -i.bak "s|VITE_OIDC_AUTHORITY=.*|VITE_OIDC_AUTHORITY=$MOCK_API_BASE_URL|" "$SCRIPT_DIR/frontend/.env.staging"
    rm -f "$SCRIPT_DIR/frontend/.env.staging.bak"
fi
cd "$SCRIPT_DIR/frontend"
nohup npm run preview -- --port 8148 --host 0.0.0.0 --mode staging > "$LOGS_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "   ✅ Started (PID: $FRONTEND_PID, Log: logs/frontend.log)"
cd "$SCRIPT_DIR"

# Open firewall ports if needed
echo ""
echo "🔥 Opening firewall ports..."
sudo ufw allow 8144/tcp 2>/dev/null  # Floor Map
sudo ufw allow 8145/tcp 2>/dev/null  # RAG Bot
sudo ufw allow 8146/tcp 2>/dev/null  # Mock API
sudo ufw allow 8147/tcp 2>/dev/null  # Main Backend
sudo ufw allow 8148/tcp 2>/dev/null  # Frontend
sudo ufw reload 2>/dev/null

echo ""
echo "=================================================="
echo "✅ All services started in staging mode!"
echo ""
echo "📡 Services:"
echo "   - Frontend:          http://$SERVER_IP:8148"
echo "   - Mock API (OIDC):   $MOCK_API_BASE_URL"
echo "   - Main Backend (WS): ws://$SERVER_IP:$EFS_BACKEND_PORT/ws"
echo "   - Floor Map:         http://$SERVER_IP:$FLOOR_MAP_PORT"
echo "   - RAG Bot:           http://$SERVER_IP:$RAG_BOT_PORT"
echo ""
echo "📋 Process IDs:"
echo "   - Mock API:          PID $MOCK_API_PID"
echo "   - Main Backend:      PID $MAIN_BACKEND_PID"
echo "   - Floor Map:         PID $FLOOR_MAP_PID"
echo "   - RAG Bot:           PID $RAG_BOT_PID"
echo "   - Frontend:          PID $FRONTEND_PID"
echo ""
echo "📝 Logs:"
echo "   - Mock API:          logs/mock_api.log"
echo "   - Main Backend:      logs/main_backend.log"
echo "   - Floor Map:         logs/floor_map.log"
echo "   - RAG Bot:           logs/rag_bot.log"
echo "   - Frontend:          logs/frontend.log"
echo ""
echo "🔍 To view logs:"
echo "   tail -f logs/mock_api.log"
echo "   tail -f logs/main_backend.log"
echo "   tail -f logs/frontend.log"
echo ""
echo "🛑 To stop services:"
echo "   kill $MOCK_API_PID $MAIN_BACKEND_PID $FLOOR_MAP_PID $RAG_BOT_PID $FRONTEND_PID"
echo ""
echo "=================================================="

