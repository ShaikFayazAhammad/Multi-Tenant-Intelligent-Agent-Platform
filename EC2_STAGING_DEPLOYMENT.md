# EC2 Ubuntu Staging Deployment Guide

## Overview

The staging startup script (`start-all-staging.sh`) has been updated to use `nohup` for EC2 Ubuntu server deployment. Services run in the background with log files instead of GUI terminals.

---

## HTTPS via Reverse Proxy (vms2.0.haloocom.in)

When mapping staging to `https://vms2.0.haloocom.in`, **all backend services** must be reachable over HTTPS. Browsers block HTTP requests from HTTPS pages (mixed content).

### Required Nginx Configuration

Configure your reverse proxy (Nginx, Apache, or load balancer) to route. All services run on **192.168.3.155**:

| Path | Backend | Port | Internal URL |
|------|---------|------|--------------|
| `/` | Frontend (SPA) | 8148 | http://192.168.3.155:8148 |
| `/chat`, `/health` | Main backend | 8147 | http://192.168.3.155:8147 |
| `/ws` | WebSocket | 8147 | http://192.168.3.155:8147 |
| `/oidc/` | Mock API (OIDC) | 8146 | http://192.168.3.155:8146 |
| `/floor/` | Floor map | 8144 | http://192.168.3.155:8144 |
| `/ask` | RAG bot | 8145 | http://192.168.3.155:8145 |

**Example Nginx config:** (proxy_pass targets: 192.168.3.155 or 127.0.0.1 when Nginx runs on same host)
```nginx
server {
    listen 443 ssl;
    server_name vms2.0.haloocom.in;
    # SSL certificates here

    location /oidc/ { proxy_pass http://192.168.3.155:8146/; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
    location /floor/ { proxy_pass http://192.168.3.155:8144/; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
    location /ask { proxy_pass http://192.168.3.155:8145; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
    location /ws { proxy_pass http://192.168.3.155:8147; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
    location /chat { proxy_pass http://192.168.3.155:8147; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
    location /health { proxy_pass http://192.168.3.155:8147; proxy_set_header Host $host; }
    location / { proxy_pass http://192.168.3.155:8148; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
}
```

### Environment Files

- **frontend/.env.staging**: Uses `https://vms2.0.haloocom.in` for all URLs (mapped from 192.168.3.155:8144–8148; see `env.staging.template`)
- **backend/.env**: Set `MOCK_API_BASE_URL=https://vms2.0.haloocom.in/oidc` for OIDC discovery (original: http://192.168.3.155:8146)

---

## Key Changes

### **1. No GUI Dependencies**

**Before:**
- Used `gnome-terminal` or `xterm` (requires GUI)
- Opened separate terminal windows
- Not suitable for headless servers

**After:**
- Uses `nohup` for background execution
- No GUI dependencies
- Perfect for EC2 Ubuntu servers

### **2. Log Files**

All services now write to log files in `logs/` directory:

```
logs/
├── mock_api.log
├── main_backend.log
├── floor_map.log
├── rag_bot.log
└── frontend.log
```

### **3. Process Management**

- Captures Process IDs (PIDs) for each service
- Provides commands to stop services
- Includes status checking script

---

## Usage

### **Start All Services**

```bash
chmod +x start-all-staging.sh
./start-all-staging.sh
```

**Output:**
```
🚀 Starting EFS VMS Staging Environment
==================================================
🌐 Server IP: 192.168.3.155

📡 Starting Mock API Server (Port 8146)...
   ✅ Started (PID: 12345, Log: logs/mock_api.log)
🤖 Starting Main Backend (Port 8147)...
   ✅ Started (PID: 12346, Log: logs/main_backend.log)
...
```

### **Check Service Status**

```bash
chmod +x check-services-staging.sh
./check-services-staging.sh
```

**Output:**
```
🔍 EFS VMS Staging Services Status
==================================================

📡 Mock API (Port 8146):
   ✅ Running (PID: 12345)
   📊 Process: python
   ⏱️  Uptime: 01:23:45
   📝 Log: logs/mock_api.log (1234 lines)
...
```

### **Stop All Services**

```bash
chmod +x stop-all-staging.sh
./stop-all-staging.sh
```

**Output:**
```
🛑 Stopping EFS VMS Staging Services
==================================================

Stopping services...
✅ Mock API Server stopped
✅ Main Backend stopped
...
```

### **View Logs**

```bash
# View all logs
tail -f logs/*.log

# View specific service log
tail -f logs/mock_api.log
tail -f logs/main_backend.log
tail -f logs/frontend.log

# View last 100 lines
tail -n 100 logs/main_backend.log

# Search logs
grep "ERROR" logs/*.log
grep "ERROR" logs/main_backend.log
```

---

## Service Management

### **Individual Service Control**

**Stop specific service:**
```bash
# By PID (from startup output)
kill 12345

# By process name
pkill -f "python.*mock_api_server.py"
pkill -f "python.*main.py"
pkill -f "vite"
```

**Restart specific service:**
```bash
# Stop
pkill -f "python.*mock_api_server.py"

# Start manually
cd backend/efs_vms_chatbot
source venv/bin/activate
export MOCK_API_PORT=8146
# For direct access: http://192.168.3.155:8146 | For vms2.0.haloocom.in: https://vms2.0.haloocom.in/oidc
export MOCK_API_BASE_URL="http://192.168.3.155:8146"
nohup python mock_api_server.py > ../../logs/mock_api.log 2>&1 &
```

### **Check if Services are Running**

```bash
# Check ports
sudo netstat -tulpn | grep -E '8144|8145|8146|8147|8148'

# Check processes
ps aux | grep -E 'mock_api_server|main.py|api.py|vite'

# Check specific port
lsof -i :8146
```

---

## Log Management

### **Log Rotation**

For production, consider setting up log rotation:

**Create `/etc/logrotate.d/efs-vms`:**
```
/path/to/efs_vms_2.0/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 ubuntu ubuntu
}
```

### **Log File Locations**

All logs are in the `logs/` directory relative to the script:

```
efs_vms_2.0/
├── start-all-staging.sh
├── logs/
│   ├── mock_api.log
│   ├── main_backend.log
│   ├── floor_map.log
│   ├── rag_bot.log
│   └── frontend.log
```

### **Log File Sizes**

Monitor log file sizes:
```bash
du -h logs/*.log
ls -lh logs/
```

---

## Process Management

### **Save PIDs to File**

The script displays PIDs, but you can also save them:

```bash
# Modify start-all-staging.sh to save PIDs
echo "$MOCK_API_PID" > logs/mock_api.pid
echo "$MAIN_BACKEND_PID" > logs/main_backend.pid
# etc.
```

### **Stop Using PID File**

```bash
kill $(cat logs/mock_api.pid)
kill $(cat logs/main_backend.pid)
```

---

## Troubleshooting

### **Issue: Services Not Starting**

**Check logs:**
```bash
tail -f logs/mock_api.log
tail -f logs/main_backend.log
```

**Check if ports are in use:**
```bash
sudo lsof -i :8146
sudo lsof -i :8147
```

**Check if processes are running:**
```bash
ps aux | grep python
ps aux | grep node
```

### **Issue: Services Stop After SSH Disconnect**

**Solution**: Use `nohup` (already implemented) or `screen`/`tmux`:

```bash
# Using screen
screen -S efs-vms
./start-all-staging.sh
# Press Ctrl+A then D to detach

# Reattach later
screen -r efs-vms
```

### **Issue: Permission Denied**

```bash
# Make scripts executable
chmod +x start-all-staging.sh
chmod +x stop-all-staging.sh
chmod +x check-services-staging.sh

# Ensure logs directory is writable
chmod 755 logs/
```

### **Issue: Virtual Environment Not Found**

```bash
# Verify virtual environments exist
ls -la backend/efs_vms_chatbot/venv
ls -la backend/Floor_map/venv
ls -la backend/efs-rag-bot/venv

# If missing, create them
cd backend/efs_vms_chatbot
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Systemd Service (Optional)

For production, create systemd service files:

### **Example: Mock API Service**

Create `/etc/systemd/system/efs-mock-api.service`:

```ini
[Unit]
Description=EFS VMS Mock API Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/path/to/efs_vms_2.0/backend/efs_vms_chatbot
Environment="MOCK_API_PORT=8146"
# Direct: http://192.168.3.155:8146 | Subdomain: https://vms2.0.haloocom.in/oidc
Environment="MOCK_API_BASE_URL=http://192.168.3.155:8146"
ExecStart=/path/to/efs_vms_2.0/backend/efs_vms_chatbot/venv/bin/python mock_api_server.py
Restart=always
RestartSec=10
StandardOutput=append:/path/to/efs_vms_2.0/logs/mock_api.log
StandardError=append:/path/to/efs_vms_2.0/logs/mock_api.log

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable efs-mock-api
sudo systemctl start efs-mock-api
sudo systemctl status efs-mock-api
```

Repeat for other services.

---

## Quick Reference

### **Start Services**
```bash
./start-all-staging.sh
```

### **Check Status**
```bash
./check-services-staging.sh
```

### **Stop Services**
```bash
./stop-all-staging.sh
```

### **View Logs**
```bash
tail -f logs/mock_api.log
tail -f logs/main_backend.log
tail -f logs/frontend.log
```

### **Check Ports**
```bash
sudo netstat -tulpn | grep -E '8144|8145|8146|8147|8148'
```

### **Kill All Services**
```bash
pkill -f "python.*mock_api_server"
pkill -f "python.*main.py"
pkill -f "python.*api.py"
pkill -f "vite"
```

---

## Summary

✅ **Updated**: `start-all-staging.sh` uses `nohup` instead of GUI terminals  
✅ **Created**: `stop-all-staging.sh` - Stop all services  
✅ **Created**: `check-services-staging.sh` - Check service status  
✅ **Logs**: All services log to `logs/` directory  
✅ **EC2 Ready**: No GUI dependencies, perfect for headless servers  

The staging script is now optimized for EC2 Ubuntu server deployment!
