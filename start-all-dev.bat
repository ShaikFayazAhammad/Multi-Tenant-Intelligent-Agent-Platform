@echo off
REM Start all services for DEVELOPMENT environment (Windows)

echo ========================================
echo Starting EFS VMS Development Environment
echo ========================================
echo.

REM Load environment variables from backend/.env file
REM Default values if .env doesn't exist or variable not set
set EFS_BACKEND_PORT=8000
set FLOOR_MAP_PORT=8003
set RAG_BOT_PORT=8002
set MOCK_API_PORT=5000
set MOCK_API_BASE_URL=http://localhost:5000

REM Read from backend/.env if it exists
if exist "backend\.env" (
    echo Loading environment variables from backend\.env...
    for /f "usebackq tokens=1,* delims==" %%a in ("backend\.env") do (
        if "%%a"=="EFS_BACKEND_PORT" set EFS_BACKEND_PORT=%%b
        if "%%a"=="FLOOR_MAP_PORT" set FLOOR_MAP_PORT=%%b
        if "%%a"=="RAG_BOT_PORT" set RAG_BOT_PORT=%%b
        if "%%a"=="MOCK_API_PORT" set MOCK_API_PORT=%%b
        if "%%a"=="MOCK_API_BASE_URL" set MOCK_API_BASE_URL=%%b
    )
)

REM Kill any existing Node/Python processes
echo Cleaning up existing processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
timeout /t 2 >nul

cd /d "%~dp0"

REM 1. Mock API Server
echo Starting Mock API Server (Port %MOCK_API_PORT%)...
start "Mock API Server" cmd /k "cd backend\efs_vms_chatbot && venv\Scripts\activate && set MOCK_API_PORT=%MOCK_API_PORT% && set MOCK_API_BASE_URL=%MOCK_API_BASE_URL% && python mock_api_server.py"
timeout /t 2 >nul

REM 2. Main Backend
echo Starting Main Backend (Port %EFS_BACKEND_PORT%)...
start "Main Backend" cmd /k "cd backend\efs_vms_chatbot && venv\Scripts\activate && set EFS_BACKEND_PORT=%EFS_BACKEND_PORT% && python main.py"
timeout /t 2 >nul

REM 3. Floor Map Server
echo Starting Floor Map Server (Port %FLOOR_MAP_PORT%)...
start "Floor Map Server" cmd /k "cd backend\Floor_map && venv\Scripts\activate && set FLOOR_MAP_PORT=%FLOOR_MAP_PORT% && python main.py"
timeout /t 2 >nul

REM 4. RAG Bot (Optional)
echo Starting RAG Bot (Port %RAG_BOT_PORT%)...
start "RAG Bot" cmd /k "cd backend\efs-rag-bot && venv\Scripts\activate && set RAG_BOT_PORT=%RAG_BOT_PORT% && python api.py"
timeout /t 2 >nul

REM 5. Frontend
echo Starting Frontend (Port 3000)...
REM Ensure frontend .env.development exists and has correct OIDC authority
if not exist "frontend\.env.development" (
    copy /Y frontend\env.development.template frontend\.env.development >nul 2>&1
)
REM Update VITE_OIDC_AUTHORITY in frontend .env.development to match backend MOCK_API_BASE_URL
REM Note: User should manually ensure frontend/.env.development has VITE_OIDC_AUTHORITY matching MOCK_API_BASE_URL
echo.
echo ⚠️  IMPORTANT: Ensure frontend\.env.development has:
echo    VITE_OIDC_AUTHORITY=%MOCK_API_BASE_URL%
echo.
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo All services started in development mode!
echo.
echo Services:
echo    - Frontend:          http://localhost:3000
echo    - Mock API (OIDC):   http://localhost:%MOCK_API_PORT%
echo    - Main Backend (WS): ws://localhost:8000/ws
echo    - Floor Map:         http://localhost:8003
echo    - RAG Bot:           http://localhost:8002
echo.
echo ========================================
echo.
pause


