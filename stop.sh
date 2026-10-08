#!/bin/bash
# Stop all backend and frontend services (Ubuntu)

echo "🛑 Stopping EFS VMS Services"
echo "=================================================="
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Kill processes by name pattern
echo "Stopping Python services..."
pkill -f "python.*mock_api_server.py" 2>/dev/null && echo "✅ Mock API Server stopped" || echo "⚠️  Mock API Server not running"
pkill -f "python.*main.py" 2>/dev/null && echo "✅ Main/Floor Map Backend stopped" || echo "⚠️  Main/Floor Map Backend not running"
pkill -f "python.*api.py" 2>/dev/null && echo "✅ RAG Bot stopped" || echo "⚠️  RAG Bot not running"

echo "Stopping Node/Vite services..."
pkill -f "vite" 2>/dev/null && echo "✅ Vite Frontend stopped" || echo "⚠️  Vite Frontend not running"

# Also kill by port to be absolutely sure
echo ""
echo "Double-checking ports..."
PORTS=(8000 8002 8003 5000 3000 8144 8145 8146 8147 8148)

for port in "${PORTS[@]}"; do
    PID=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$PID" ]; then
        echo "   Killing remaining process on port $port (PID: $PID)"
        kill -9 $PID 2>/dev/null
    fi
done

echo ""
echo "=================================================="
echo "✅ Cleanup complete!"
echo "=================================================="
