#!/bin/bash
# Start all services for EFS VMS (Ubuntu)

echo "🚀 Starting EFS VMS Services"
echo "=================================================="
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Select environment mode
echo "Select execution mode:"
echo "1) Development (localhost ports)"
echo "2) Staging (Remote server ports - 192.168.3.155)"
echo ""
read -t 10 -p "Enter choice [1-2, default: 2]: " choice || choice=2

if [ "$choice" == "1" ]; then
    ENV="development"
    echo "✅ Starting in DEVELOPMENT mode..."
    
    # Default Dev configuration
    export EFS_BACKEND_PORT=${EFS_BACKEND_PORT:-8000}
    export FLOOR_MAP_PORT=${FLOOR_MAP_PORT:-8003}
    export RAG_BOT_PORT=${RAG_BOT_PORT:-8002}
    export MOCK_API_PORT=${MOCK_API_PORT:-5000}
    export MOCK_API_BASE_URL=${MOCK_API_BASE_URL:-"http://localhost:5000"}
    FRONTEND_PORT=3000
else
    ENV="staging"
    echo "✅ Starting in STAGING mode..."
    
    # Default Staging configuration
    SERVER_IP="192.168.3.155"
    export EFS_BACKEND_PORT=${EFS_BACKEND_PORT:-8247}
    export FLOOR_MAP_PORT=${FLOOR_MAP_PORT:-8244}
    export RAG_BOT_PORT=${RAG_BOT_PORT:-8245}
    export MOCK_API_PORT=${MOCK_API_PORT:-8246}
    export MOCK_API_BASE_URL=${MOCK_API_BASE_URL:-"http://$SERVER_IP:8246"}
    FRONTEND_PORT=8248
fi

# Load variables from backend/.env if it exists (allows overriding defaults)
if [ -f "backend/.env" ]; then
    echo "📄 Overriding with environment variables from backend/.env..."
    set -a
    source backend/.env
    set +a
fi

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "python.*main.py" 2>/dev/null || true
pkill -f "python.*api.py" 2>/dev/null || true
pkill -f "python.*mock_api_server.py" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Create logs directory
LOGS_DIR="$SCRIPT_DIR/logs"
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
deactivate
sleep 2

# 2. Main Backend
echo "🤖 Starting Main Backend (Port $EFS_BACKEND_PORT)..."
cd "$SCRIPT_DIR/backend/efs_vms_chatbot"
source venv/bin/activate
export EFS_BACKEND_PORT=$EFS_BACKEND_PORT
nohup python main.py > "$LOGS_DIR/main_backend.log" 2>&1 &
MAIN_BACKEND_PID=$!
echo "   ✅ Started (PID: $MAIN_BACKEND_PID, Log: logs/main_backend.log)"
deactivate
sleep 2

# 3. Floor Map Server
echo "🗺️  Starting Floor Map Server (Port $FLOOR_MAP_PORT)..."
cd "$SCRIPT_DIR/backend/Floor_map"
source venv/bin/activate
export FLOOR_MAP_PORT=$FLOOR_MAP_PORT
nohup python main.py > "$LOGS_DIR/floor_map.log" 2>&1 &
FLOOR_MAP_PID=$!
echo "   ✅ Started (PID: $FLOOR_MAP_PID, Log: logs/floor_map.log)"
deactivate
sleep 2

# 4. RAG Bot
echo "🧠 Starting RAG Bot (Port $RAG_BOT_PORT)..."
cd "$SCRIPT_DIR/backend/efs-rag-bot"
source venv/bin/activate
export RAG_BOT_PORT=$RAG_BOT_PORT
nohup python api.py > "$LOGS_DIR/rag_bot.log" 2>&1 &
RAG_BOT_PID=$!
echo "   ✅ Started (PID: $RAG_BOT_PID, Log: logs/rag_bot.log)"
deactivate
sleep 2

# 5. Frontend
echo "🎨 Starting Frontend (Port $FRONTEND_PORT)..."
cd "$SCRIPT_DIR/frontend"

# Ensure frontend .env exists and has VITE_OIDC_AUTHORITY matching backend MOCK_API_BASE_URL
if [ "$ENV" == "development" ]; then
    ENV_FILE=".env.development"
    TEMPLATE_FILE="env.development.template"
else
    ENV_FILE=".env.staging"
    TEMPLATE_FILE="env.staging.template"
fi

if [ ! -f "$ENV_FILE" ]; then
    cp "$TEMPLATE_FILE" "$ENV_FILE"
fi

# Update VITE_OIDC_AUTHORITY in the env file
sed -i.bak "s|VITE_OIDC_AUTHORITY=.*|VITE_OIDC_AUTHORITY=$MOCK_API_BASE_URL|" "$ENV_FILE" 2>/dev/null || true
rm -f "$ENV_FILE.bak"

if [ "$ENV" == "development" ]; then
    nohup npm run dev -- --port $FRONTEND_PORT --host 0.0.0.0 > "$LOGS_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo "   ✅ Started in Dev mode (PID: $FRONTEND_PID, Log: logs/frontend.log)"
else
    echo "   🔨 Building frontend with staging config..."
    npm run build -- --mode staging > "$LOGS_DIR/frontend_build.log" 2>&1
    if [ $? -eq 0 ]; then
        echo "   ✅ Build complete. Starting preview server..."
        nohup npm run preview -- --port $FRONTEND_PORT --host 0.0.0.0 > "$LOGS_DIR/frontend.log" 2>&1 &
        FRONTEND_PID=$!
        echo "   ✅ Started Preview (PID: $FRONTEND_PID, Log: logs/frontend.log)"
    else
        echo "   ❌ Frontend build failed! Check logs/frontend_build.log for details."
        FRONTEND_PID="FAILED"
    fi
fi

# Open firewall ports if on staging mode and using ufw
if [ "$ENV" == "staging" ] && command -v ufw &> /dev/null; then
    echo "🔥 Opening firewall ports..."
    sudo ufw allow $FLOOR_MAP_PORT/tcp 2>/dev/null || true
    sudo ufw allow $RAG_BOT_PORT/tcp 2>/dev/null || true
    sudo ufw allow $MOCK_API_PORT/tcp 2>/dev/null || true
    sudo ufw allow $EFS_BACKEND_PORT/tcp 2>/dev/null || true
    sudo ufw allow $FRONTEND_PORT/tcp 2>/dev/null || true
    sudo ufw reload 2>/dev/null || true
fi

cd "$SCRIPT_DIR"

echo ""
echo "=================================================="
echo "✅ Setup and startup triggered in $ENV mode!"
echo "=================================================="
echo ""
echo "📡 Service URLs:"
echo "   - Frontend:          http://localhost:$FRONTEND_PORT (Staging: http://192.168.3.155:$FRONTEND_PORT)"
echo "   - Mock API (OIDC):   $MOCK_API_BASE_URL"
echo "   - Main Backend (WS): ws://localhost:$EFS_BACKEND_PORT/ws"
echo "   - Floor Map:         http://localhost:$FLOOR_MAP_PORT"
echo "   - RAG Bot:           http://localhost:$RAG_BOT_PORT"
echo ""
echo "📝 Active Logs:"
echo "   - Main Backend:      tail -f logs/main_backend.log"
echo "   - RAG Bot:           tail -f logs/rag_bot.log"
echo "   - Floor Map:         tail -f logs/floor_map.log"
echo "   - Mock API:          tail -f logs/mock_api.log"
echo "   - Frontend:          tail -f logs/frontend.log"
echo ""
echo "🛑 To stop all services run: ./stop-all-staging.sh (or kill processes manually)"
echo "=================================================="
