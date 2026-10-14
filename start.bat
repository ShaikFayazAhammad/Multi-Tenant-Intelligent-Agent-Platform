@echo off
REM Start all services for BFSI Multi-Tenant Intelligent Agent Platform (Windows)

echo ========================================
echo Starting BFSI Platform Services
echo ========================================
echo.

cd /d "%~dp0"

REM 1. Main Backend (FastAPI - Port 8000)
echo Starting Backend API Server (Port 8000)...
start "BFSI Backend API" cmd /k "cd /d "%~dp0backend" && python main.py"
timeout /t 3 >nul

REM 2. Frontend Super Admin Portal (Vite - Port 3001)
echo Starting Super Admin Portal (Port 3001)...
start "BFSI Admin Portal" cmd /k "cd /d "%~dp0frontend\admin-portal" && npm run dev"
timeout /t 2 >nul

REM 3. Frontend Client Operations Portal (Vite - Port 3000)
echo Starting Client Operations Portal (Port 3000)...
start "BFSI Client Portal" cmd /k "cd /d "%~dp0frontend\client-portal" && npm run dev"

echo.
echo ========================================
echo All services started successfully!
echo.
echo Services:
echo    - Main Backend:         http://localhost:8000
echo    - Swagger API Docs:     http://localhost:8000/docs
echo    - Super Admin Portal:   http://localhost:3001
echo    - Client Portal:        http://localhost:3000
echo ========================================
echo.
pause
