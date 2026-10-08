# Environment Setup Guide - Development & Staging

This guide explains how to configure and run EFS VMS in different environments with custom ports.

---

## Environment Overview

### Development Environment (Local)
- **Frontend:** `localhost:3000`
- **Mock API (OIDC):** `localhost:5000`
- **Main Backend (WebSocket):** `localhost:8000`
- **Floor Map:** `localhost:8003`
- **RAG Bot:** `localhost:8002`

### Staging Environment (192.168.3.155)
- **Frontend:** `192.168.3.155:8148` (mapped to https://vms2.0.haloocom.in)
- **Mock API (OIDC):** `192.168.3.155:8146` (mapped to /oidc)
- **Main Backend (WebSocket):** `192.168.3.155:8147` (mapped to /, /chat, /ws)
- **Floor Map:** `192.168.3.155:8144` (mapped to /floor)
- **RAG Bot:** `192.168.3.155:8145` (mapped to /ask)

---

## Quick Start

### For Development (Local):
```bash
# 1. Set up environment files
cd frontend
cp env.development.template .env.development

cd ../backend
cp env.development.template .env

# 2. Start all services
cd ..
chmod +x start-all-dev.sh
./start-all-dev.sh

# Access: http://localhost:3000
```

### For Staging (Ubuntu Server):
```bash
# 1. Set up environment files
cd frontend
cp env.staging.template .env.staging

cd ../backend
cp env.staging.template .env

# 2. Start all services
cd ..
chmod +x start-all-staging.sh
./start-all-staging.sh

# Access: https://vms2.0.haloocom.in or http://192.168.3.155:8148
```

---

## Manual Configuration

### Frontend Configuration

#### Development (.env.development)
```env
VITE_OIDC_AUTHORITY=http://localhost:5000
VITE_WS_URL=ws://localhost:8000/ws
VITE_FLOOR_MAP_URL=http://localhost:8003
VITE_USE_MOCK=false
VITE_DEBUG=true
```

#### Staging (.env.staging)

Uses `https://vms2.0.haloocom.in` (from 192.168.3.155:8144–8148).
```env
VITE_OIDC_AUTHORITY=https://vms2.0.haloocom.in/oidc    # from 192.168.3.155:8146
VITE_WS_URL=wss://vms2.0.haloocom.in/ws                # from 192.168.3.155:8147
VITE_FLOOR_MAP_URL=https://vms2.0.haloocom.in/floor    # from 192.168.3.155:8144
VITE_USE_MOCK=false
VITE_DEBUG=true
```

### Backend Configuration

#### Development (.env)
```env
EFS_BACKEND_PORT=8000
FLOOR_MAP_PORT=8003
RAG_BOT_PORT=8002
MOCK_API_PORT=5000
MOCK_API_BASE_URL=http://localhost:5000
```

#### Staging (.env)

Internal ports: 192.168.3.155. For OIDC discovery via vms2.0.haloocom.in, use `MOCK_API_BASE_URL=https://vms2.0.haloocom.in/oidc`.
```env
EFS_BACKEND_PORT=8147           # 192.168.3.155:8147
FLOOR_MAP_PORT=8144            # 192.168.3.155:8144
RAG_BOT_PORT=8145              # 192.168.3.155:8145
MOCK_API_PORT=8146             # 192.168.3.155:8146
MOCK_API_BASE_URL=https://vms2.0.haloocom.in/oidc   # or http://192.168.3.155:8146 for direct
```

---

## Manual Service Startup

### Development Environment

**Terminal 1 - Mock API:**
```bash
cd backend/efs_vms_chatbot
source venv/bin/activate
export MOCK_API_PORT=5000
export MOCK_API_BASE_URL="http://localhost:5000"
python mock_api_server.py
```

**Terminal 2 - Main Backend:**
```bash
cd backend/efs_vms_chatbot
source venv/bin/activate
export EFS_BACKEND_PORT=8000
python main.py
```

**Terminal 3 - Floor Map:**
```bash
cd backend/Floor_map
source venv/bin/activate
export FLOOR_MAP_PORT=8003
python main.py
```

**Terminal 4 - RAG Bot:**
```bash
cd backend/efs-rag-bot
source venv/bin/activate
export RAG_BOT_PORT=8002
python api.py
```

**Terminal 5 - Frontend:**
```bash
cd frontend
npm run dev
```

### Staging Environment

**Terminal 1 - Mock API (192.168.3.155:8146):**
```bash
cd backend/efs_vms_chatbot
source venv/bin/activate
export MOCK_API_PORT=8146
export MOCK_API_BASE_URL="http://192.168.3.155:8146"   # or https://vms2.0.haloocom.in/oidc for subdomain
python mock_api_server.py
```

**Terminal 2 - Main Backend (192.168.3.155:8147):**
```bash
cd backend/efs_vms_chatbot
source venv/bin/activate
export EFS_BACKEND_PORT=8147
python main.py
```

**Terminal 3 - Floor Map (192.168.3.155:8144):**
```bash
cd backend/Floor_map
source venv/bin/activate
export FLOOR_MAP_PORT=8144
python main.py
```

**Terminal 4 - RAG Bot:**
```bash
cd backend/efs-rag-bot
source venv/bin/activate
export RAG_BOT_PORT=8145
python api.py
```

**Terminal 5 - Frontend:**
```bash
cd frontend
npm run dev -- --port 8148 --host 0.0.0.0 --mode staging
```

---

## Port Configuration Reference

### Environment Variables

| Service | Environment Variable | Development | Staging |
|---------|---------------------|-------------|---------|
| Frontend | N/A (Vite port) | 3000 | 8148 |
| Mock API | `MOCK_API_PORT` | 5000 | 8146 |
| Main Backend | `EFS_BACKEND_PORT` | 8000 | 8147 |
| Floor Map | `FLOOR_MAP_PORT` | 8003 | 8144 |
| RAG Bot | `RAG_BOT_PORT` | 8002 | 8145 |

### Code Implementation

Each backend server reads its port from environment variables with fallbacks:

```python
import os

# Main Backend (efs_vms_chatbot/main.py)
PORT = int(os.getenv("EFS_BACKEND_PORT", "8000"))

# Floor Map (Floor_map/main.py)
PORT = int(os.getenv("FLOOR_MAP_PORT", "8003"))

# RAG Bot (efs-rag-bot/api.py)
PORT = int(os.getenv("RAG_BOT_PORT", "8002"))

# Mock API (efs_vms_chatbot/mock_api_server.py)
PORT = int(os.getenv("MOCK_API_PORT", "5000"))
BASE_URL = os.getenv("MOCK_API_BASE_URL", "http://localhost:5000")
```

---

## Firewall Configuration (Ubuntu)

For staging environment, ensure these ports are open:

```bash
# Open all required ports
sudo ufw allow 8144/tcp  # Floor Map
sudo ufw allow 8145/tcp  # RAG Bot
sudo ufw allow 8146/tcp  # Mock API (OIDC)
sudo ufw allow 8147/tcp  # Main Backend
sudo ufw allow 8148/tcp  # Frontend

# Reload firewall
sudo ufw reload

# Check status
sudo ufw status
```

---

## Verification

### Check Running Services

```bash
# Check what's listening on ports
sudo netstat -tulpn | grep -E '8144|8145|8146|8147|8148'

# Or using ss
sudo ss -tulpn | grep -E '8144|8145|8146|8147|8148'
```

### Test Endpoints

**Development:**
```bash
curl http://localhost:5000/health              # Mock API
curl http://localhost:8000/health              # Main Backend
curl http://localhost:8003/health              # Floor Map
curl http://localhost:8002/health              # RAG Bot
curl http://localhost:3000                     # Frontend
```

**Staging:**
```bash
curl http://192.168.3.155:8146/health          # Mock API (port 8146)
curl http://192.168.3.155:8147/health          # Main Backend (port 8147)
curl http://192.168.3.155:8144/health          # Floor Map (port 8144)
curl http://192.168.3.155:8145/health          # RAG Bot (port 8145)
curl http://192.168.3.155:8148                 # Frontend (port 8148)
```

---

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find what's using the port (e.g., 8147)
sudo lsof -i :8147

# Kill the process
sudo kill -9 <PID>

# Or kill all Python processes
pkill -f "python.*main.py"
```

### Issue: Environment Variables Not Set

```bash
# Check current environment variables
env | grep -E 'PORT|BASE_URL'

# Set them manually
export EFS_BACKEND_PORT=8147
export FLOOR_MAP_PORT=8144
export RAG_BOT_PORT=8145
export MOCK_API_PORT=8146
export MOCK_API_BASE_URL="http://192.168.3.155:8146"   # 192.168.3.155:8146; for vms2.0.haloocom.in: https://vms2.0.haloocom.in/oidc
```

### Issue: Frontend Can't Connect to Backend

1. **Check .env file exists:**
   ```bash
   cd frontend
   ls -la .env.staging .env.development
   ```

2. **Verify environment variables in browser console:**
   - Open DevTools (F12)
   - Check Console for: `OIDC Authority:` and `App Config:` logs

3. **Check CORS settings:**
   - Backend should allow connections from frontend origin
   - Check browser Network tab for CORS errors

### Issue: Services Start But Can't Access from Network

1. **Verify server is binding to 0.0.0.0:**
   ```bash
   sudo netstat -tulpn | grep <port>
   # Should show: 0.0.0.0:<port>, NOT 127.0.0.1:<port>
   ```

2. **Check firewall:**
   ```bash
   sudo ufw status
   ```

3. **Test from server itself:**
   ```bash
   curl http://localhost:<port>/health
   curl http://192.168.3.155:<port>/health
   ```

---

## Production Deployment (systemd)

For production, create systemd service files:

### Example: Main Backend Service

Create `/etc/systemd/system/efs-backend.service`:

```ini
[Unit]
Description=EFS VMS Main Backend
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/efs_vms_2.0/backend/efs_vms_chatbot
Environment="EFS_BACKEND_PORT=8147"
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/path/to/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable efs-backend
sudo systemctl start efs-backend
sudo systemctl status efs-backend
```

Repeat for other services (Floor Map, RAG Bot, Mock API, Frontend).

---

## File Structure Reference

```
efs_vms_2.0/
├── frontend/
│   ├── env.development.template  # Copy to .env.development
│   ├── env.staging.template      # Copy to .env.staging
│   └── src/
│       ├── auth/
│       │   └── oidcConfig.ts     # Uses VITE_OIDC_AUTHORITY
│       └── config/
│           └── env.ts             # Uses VITE_WS_URL, etc.
├── backend/
│   ├── env.development.template   # Backend environment template
│   ├── env.staging.template       # Backend environment template
│   ├── efs_vms_chatbot/
│   │   ├── main.py                # Uses EFS_BACKEND_PORT
│   │   └── mock_api_server.py     # Uses MOCK_API_PORT
│   ├── Floor_map/
│   │   └── main.py                # Uses FLOOR_MAP_PORT
│   └── efs-rag-bot/
│       └── api.py                 # Uses RAG_BOT_PORT
├── start-all-dev.sh               # Start development environment
└── start-all-staging.sh           # Start staging environment
```

---

## Quick Reference Commands

### Kill All Services
```bash
pkill -f "python.*main.py"
pkill -f "python.*api.py"
pkill -f "python.*mock_api_server.py"
pkill -f "vite"
```

### Check All Service Logs
```bash
# In each terminal running a service, you'll see logs
# Or redirect to files:
python main.py > backend.log 2>&1 &
```

### Environment Switching

**Switch to Development:**
```bash
cd frontend
cp env.development.template .env.development
npm run dev
```

**Switch to Staging:**
```bash
cd frontend
cp env.staging.template .env.staging
npm run dev -- --port 8148 --host 0.0.0.0 --mode staging
```

---

## Support

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Verify all environment files are created correctly
3. Ensure all ports are open and not in use
4. Check server logs for specific error messages
5. Verify network connectivity and firewall rules

