#!/bin/bash
# Stop all services for STAGING environment

echo "🛑 Stopping EFS VMS Staging Services"
echo "=================================================="
echo ""

# Kill processes by name pattern
echo "Stopping services..."

# Mock API Server
pkill -f "python.*mock_api_server.py" && echo "✅ Mock API Server stopped" || echo "⚠️  Mock API Server not running"

# Main Backend
pkill -f "python.*main.py" && echo "✅ Main Backend stopped" || echo "⚠️  Main Backend not running"

# Floor Map Server
pkill -f "python.*Floor_map.*main.py" && echo "✅ Floor Map Server stopped" || echo "⚠️  Floor Map Server not running"

# RAG Bot
pkill -f "python.*efs-rag-bot.*api.py" && echo "✅ RAG Bot stopped" || echo "⚠️  RAG Bot not running"

# Frontend
pkill -f "vite.*8148" && echo "✅ Frontend stopped" || echo "⚠️  Frontend not running"

# Also kill by port if processes still running
echo ""
echo "Checking ports..."
for port in 8144 8145 8146 8147 8148; do
    PID=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$PID" ]; then
        echo "   Killing process on port $port (PID: $PID)"
        kill $PID 2>/dev/null
    fi
done

echo ""
echo "=================================================="
echo "✅ All services stopped"
echo "=================================================="
