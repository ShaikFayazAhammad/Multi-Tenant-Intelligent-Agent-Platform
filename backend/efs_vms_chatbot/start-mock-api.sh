#!/bin/bash
# Mock API Server startup script for Ubuntu deployment
# Usage: ./start-mock-api.sh [server-ip] [port]

SERVER_IP=${1:-"localhost"}
PORT=${2:-5000}

# Construct BASE_URL
if [ "$SERVER_IP" = "localhost" ] || [ "$SERVER_IP" = "127.0.0.1" ]; then
    BASE_URL="http://localhost:${PORT}"
else
    BASE_URL="http://${SERVER_IP}:${PORT}"
fi

echo "🚀 Starting Mock API Server..."
echo "📡 Server IP: $SERVER_IP"
echo "🔌 Port: $PORT"
echo "🔗 BASE_URL: $BASE_URL"
echo ""
echo "👉 OIDC Discovery: ${BASE_URL}/.well-known/openid-configuration"
echo "👉 Health Check: ${BASE_URL}/health"
echo ""

# Export environment variables
export MOCK_API_BASE_URL="$BASE_URL"
export MOCK_API_PORT="$PORT"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "🐍 Activating virtual environment..."
    source venv/bin/activate
fi

# Run the server
python mock_api_server.py

