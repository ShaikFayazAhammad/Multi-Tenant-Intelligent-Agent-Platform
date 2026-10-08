#!/bin/bash
# Frontend startup script for Ubuntu server deployment
# Usage: ./start-server.sh [port]

PORT=${1:-8148}  # Default to 8148 if no port specified

echo "Starting Frontend Server on port $PORT..."
echo "Server will be accessible at http://$(hostname -I | awk '{print $1}'):$PORT"

# Set host to 0.0.0.0 to allow external connections
export VITE_PORT=$PORT
export VITE_HOST="0.0.0.0"

# Run the dev server
npm run dev -- --port $PORT --host 0.0.0.0

