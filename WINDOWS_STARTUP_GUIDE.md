# Windows Startup Guide - Development Environment

This guide explains how to start EFS VMS development environment on Windows.

---

## Prerequisites

1. **Python installed** with virtual environments set up:
   - `backend/efs_vms_chatbot/venv`
   - `backend/Floor_map/venv`
   - `backend/efs-rag-bot/venv`

2. **Node.js installed** with dependencies:
   ```cmd
   cd frontend
   npm install
   ```

3. **Environment files configured**:
   - Run `setup-environment.bat` OR
   - Manually copy `frontend/env.development.template` to `frontend/.env.development`
   - Manually copy `backend/env.development.template` to `backend/.env`

---

## Quick Start

### Option 1: Using PowerShell Script (Recommended)

1. **Open PowerShell as Administrator** (for first-time execution policy setup)

2. **Allow script execution** (only needed once):
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Run the startup script**:
   ```powershell
   .\start-all-dev.ps1
   ```

4. **Access the application**:
   - Open browser to: `http://localhost:3000`

### Option 2: Using Batch File

1. **Double-click** `start-all-dev.bat`

   OR

2. **From Command Prompt**:
   ```cmd
   start-all-dev.bat
   ```

3. **Access the application**:
   - Open browser to: `http://localhost:3000`

---

## What the Scripts Do

Both scripts will:

1. ✅ Set environment variables for development ports
2. ✅ Kill any existing Python/Node processes
3. ✅ Start 5 services in separate windows:
   - Mock API Server (Port 5000)
   - Main Backend (Port 8000)
   - Floor Map Server (Port 8003)
   - RAG Bot (Port 8002)
   - Frontend (Port 3000)
4. ✅ Display service URLs

Each service runs in its own terminal window, making it easy to:
- See individual service logs
- Stop/restart individual services
- Debug issues

---

## Service Windows

After running the script, you'll see 5 new terminal windows:

### 1. Mock API Server
```
Port: 5000
Purpose: OIDC authentication (SSO login)
URL: http://localhost:5000
Endpoints:
  - /.well-known/openid-configuration
  - /connect/authorize
  - /connect/token
  - /health
```

### 2. Main Backend
```
Port: 8000
Purpose: Main WebSocket server for chat
URL: ws://localhost:8000/ws
Endpoints:
  - /ws (WebSocket)
  - /health
```

### 3. Floor Map Server
```
Port: 8003
Purpose: Navigation maps and floor plans
URL: http://localhost:8003
Endpoints:
  - /floor/all_floors.html
  - /health
```

### 4. RAG Bot
```
Port: 8002
Purpose: FAQ retrieval and RAG responses
URL: http://localhost:8002
Endpoints:
  - /api/ask
  - /docs (Swagger)
  - /health
```

### 5. Frontend
```
Port: 3000
Purpose: React frontend application
URL: http://localhost:3000
```

---

## Stopping Services

### Stop Individual Service
Close the terminal window for that service

### Stop All Services

**PowerShell:**
```powershell
Get-Process -Name "node" | Stop-Process -Force
Get-Process -Name "python" | Stop-Process -Force
```

**Command Prompt:**
```cmd
taskkill /F /IM node.exe
taskkill /F /IM python.exe
```

**Batch Script:**
Create `stop-all.bat`:
```batch
@echo off
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
echo All services stopped.
pause
```

---

## Troubleshooting

### Issue: "Execution Policy" Error (PowerShell)

**Error:**
```
.\start-all-dev.ps1 : File cannot be loaded because running scripts is disabled on this system.
```

**Solution:**
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or for current session only:
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

### Issue: Port Already in Use

**Symptoms:**
- Service fails to start
- Error: "Address already in use" or "Port 8000 is already in use"

**Solution:**
```cmd
# Find what's using the port (e.g., 8000)
netstat -ano | findstr :8000

# Kill the process (replace PID with actual process ID)
taskkill /F /PID <PID>

# Or kill all Python/Node processes
taskkill /F /IM python.exe
taskkill /F /IM node.exe
```

### Issue: Virtual Environment Not Found

**Error:**
```
.\venv\Scripts\Activate.ps1 : The system cannot find the path specified
```

**Solution:**
```cmd
# Create virtual environment for each backend
cd backend\efs_vms_chatbot
python -m venv venv

cd ..\Floor_map
python -m venv venv

cd ..\efs-rag-bot
python -m venv venv

# Install dependencies
cd backend\efs_vms_chatbot
venv\Scripts\activate
pip install -r requirements.txt
```

### Issue: NPM Dependencies Missing

**Error:**
```
Error: Cannot find module 'react'
```

**Solution:**
```cmd
cd frontend
npm install
```

### Issue: Environment File Not Found

**Symptoms:**
- Services start but use wrong ports
- Can't connect to OIDC
- "Failed to fetch" errors

**Solution:**
```cmd
# Run environment setup
setup-environment.bat

# Or manually copy:
cd frontend
copy env.development.template .env.development

cd ..\backend
copy env.development.template .env
```

### Issue: API Keys Not Set

**Symptoms:**
- OpenAI features don't work
- TTS doesn't work
- "API key not found" errors

**Solution:**
1. Edit `backend\.env`
2. Add your API keys:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   ELEVENLABS_API_KEY=your-key-here
   ```
3. Restart backend services

---

## Manual Startup (Without Scripts)

If you prefer to start services manually:

### Terminal 1 - Mock API
```cmd
cd backend\efs_vms_chatbot
venv\Scripts\activate
set MOCK_API_PORT=5000
set MOCK_API_BASE_URL=http://localhost:5000
python mock_api_server.py
```

### Terminal 2 - Main Backend
```cmd
cd backend\efs_vms_chatbot
venv\Scripts\activate
set EFS_BACKEND_PORT=8000
python main.py
```

### Terminal 3 - Floor Map
```cmd
cd backend\Floor_map
venv\Scripts\activate
set FLOOR_MAP_PORT=8003
python main.py
```

### Terminal 4 - RAG Bot
```cmd
cd backend\efs-rag-bot
venv\Scripts\activate
set RAG_BOT_PORT=8002
python api.py
```

### Terminal 5 - Frontend
```cmd
cd frontend
npm run dev
```

---

## Verification

After starting all services, verify they're running:

### Check Ports
```cmd
netstat -ano | findstr "3000 5000 8000 8002 8003"
```

Should show 5 lines with LISTENING status.

### Test Endpoints

**PowerShell:**
```powershell
# Test each service
Invoke-WebRequest http://localhost:5000/health
Invoke-WebRequest http://localhost:8000/health
Invoke-WebRequest http://localhost:8002/health
Invoke-WebRequest http://localhost:8003/health
Invoke-WebRequest http://localhost:3000
```

**Command Prompt (with curl):**
```cmd
curl http://localhost:5000/health
curl http://localhost:8000/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:3000
```

### Test Frontend
1. Open browser to `http://localhost:3000`
2. Should see login page
3. Click "Login" - should redirect to SSO (localhost:5000)
4. Login with test credentials:
   - Email: `mock-user@haloocom.com`
   - Password: `password` (any password works)
5. Should redirect back and show chat interface

---

## Performance Tips

### Faster Startup
- Keep virtual environments activated in terminals
- Don't kill processes between development sessions
- Use `npm run dev` instead of rebuilding

### Resource Usage
- Each Python backend uses ~100-200 MB RAM
- Node frontend uses ~200-400 MB RAM
- Total: ~800 MB - 1.2 GB RAM

### Multiple Developers
- Each developer can run their own local instance
- No conflicts as long as ports aren't shared
- Consider using Docker for isolation

---

## Development Workflow

1. **Start services** using startup script
2. **Make code changes**
3. **Services auto-reload** (except Python backends)
4. **Restart Python services** manually if needed:
   - Close terminal window
   - Reopen and run individual service

### Hot Reload Support
- ✅ Frontend (Vite) - Auto reloads on changes
- ❌ Python backends - Manual restart required
- ❌ Mock API - Manual restart required

---

## Useful Commands

### Check Service Status
```cmd
REM Check if services are running
tasklist | findstr "python.exe node.exe"

REM Check listening ports
netstat -ano | findstr "LISTENING"
```

### Restart Individual Service
```cmd
REM Kill and restart (example: Main Backend)
taskkill /F /FI "WINDOWTITLE eq Main Backend*"

REM Then start again
cd backend\efs_vms_chatbot
venv\Scripts\activate
set EFS_BACKEND_PORT=8000
python main.py
```

### View Logs
Each terminal window shows real-time logs. To save logs:
```cmd
python main.py > logs\backend.log 2>&1
```

---

## Next Steps

After services are running:

1. **Explore the application** at `http://localhost:3000`
2. **Test features**:
   - SSO Login
   - Chat functionality
   - Voice/TTS (if API keys set)
   - Navigation maps
   - Meeting room booking
   - FAQ queries

3. **Review documentation**:
   - `README_ENVIRONMENT.md` - Environment overview
   - `ENVIRONMENT_SETUP_GUIDE.md` - Detailed setup
   - `SSO_SETUP_GUIDE.md` - SSO configuration

4. **Make code changes** and test

---

## Additional Resources

### Files Reference
- `start-all-dev.ps1` - PowerShell startup script
- `start-all-dev.bat` - Batch startup script
- `setup-environment.bat` - Environment setup wizard
- `README_ENVIRONMENT.md` - Main documentation

### Port Reference
| Service | Port | Variable |
|---------|------|----------|
| Frontend | 3000 | N/A |
| Mock API | 5000 | `MOCK_API_PORT` |
| Main Backend | 8000 | `EFS_BACKEND_PORT` |
| RAG Bot | 8002 | `RAG_BOT_PORT` |
| Floor Map | 8003 | `FLOOR_MAP_PORT` |

---

## Support

If you encounter issues:

1. Check this troubleshooting section
2. Verify all prerequisites are met
3. Check individual service logs in terminal windows
4. Ensure environment files exist
5. Verify API keys are set (if needed)
6. Try manual startup to isolate issues

For more help, see `README_ENVIRONMENT.md` or `ENVIRONMENT_SETUP_GUIDE.md`.


