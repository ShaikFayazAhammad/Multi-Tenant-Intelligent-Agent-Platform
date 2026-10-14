@echo off
REM Start all services for BFSI Multi-Tenant Intelligent Agent Platform Development (Windows)

echo ========================================
echo Starting BFSI Platform Development Environment
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
timeout /t 2 >nul

REM 4. Frontend Landing Page (Vite - Port 3002)
echo Starting BFSI Landing Page (Port 3002)...
start "BFSI Landing Page" cmd /k "cd /d "%~dp0frontend\landing-page" && npm run dev"
timeout /t 2 >nul

REM 5. Database Web Inspector (Datasette - Port 8005)
echo Starting Database Web UI (Port 8005)...
start "BFSI Database View" cmd /k "cd /d "%~dp0backend" && datasette serve bfsi_platform_test.db --port 8005"

echo.
echo ========================================
echo All services started successfully!
echo.
echo Services:
echo    - Landing Page:         http://localhost:3002
echo    - Super Admin Portal:   http://localhost:3001
echo    - Client Portal:        http://localhost:3000
echo    - Main Backend:         http://localhost:8000
echo    - Swagger API Docs:     http://localhost:8000/docs
echo    - Database Web UI:      http://localhost:8005
echo ========================================
echo.
pause
