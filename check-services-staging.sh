#!/bin/bash
# Check status of all services for STAGING environment

echo "🔍 EFS VMS Staging Services Status"
echo "=================================================="
echo ""

SERVER_IP="192.168.3.155"

# Check each service
check_service() {
    local name=$1
    local port=$2
    local pid_pattern=$3
    
    echo "📡 $name (Port $port):"
    
    # Check if port is listening
    if lsof -ti:$port >/dev/null 2>&1; then
        PID=$(lsof -ti:$port)
        echo "   ✅ Running (PID: $PID)"
        
        # Check process details
        if ps -p $PID > /dev/null 2>&1; then
            echo "   📊 Process: $(ps -p $PID -o comm=)"
            echo "   ⏱️  Uptime: $(ps -p $PID -o etime= | tr -d ' ')"
        fi
    else
        echo "   ❌ Not running"
    fi
    
    # Check log file
    log_name=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '_')
    log_file="logs/${log_name}.log"
    if [ -f "$log_file" ]; then
        line_count=$(wc -l < "$log_file" 2>/dev/null || echo "0")
        echo "   📝 Log: $log_file ($line_count lines)"
    fi
    
    echo ""
}

check_service "Mock API" 8146 "mock_api_server"
check_service "Main Backend" 8147 "main.py"
check_service "Floor Map" 8144 "Floor_map"
check_service "RAG Bot" 8145 "efs-rag-bot"
check_service "Frontend" 8148 "vite"

echo "=================================================="
echo "🌐 Service URLs:"
echo "   - Frontend:          http://$SERVER_IP:8148"
echo "   - Mock API (OIDC):   http://$SERVER_IP:8146"
echo "   - Main Backend (WS): ws://$SERVER_IP:8147/ws"
echo "   - Floor Map:         http://$SERVER_IP:8144"
echo "   - RAG Bot:           http://$SERVER_IP:8145"
echo ""
echo "📝 View logs:"
echo "   tail -f logs/mock_api.log"
echo "   tail -f logs/main_backend.log"
echo "   tail -f logs/frontend.log"
echo "=================================================="
