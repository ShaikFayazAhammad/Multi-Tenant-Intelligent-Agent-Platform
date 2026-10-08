@echo off
setlocal EnableDelayedExpansion
echo ==================================================
echo EFS VMS - Windows Setup and Installation
echo ==================================================
echo.

REM Set ROOT_DIR to current directory
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

REM Step 1: Check prerequisites
echo [1/4] Checking prerequisites...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.8+ and add it to PATH.
    pause
    exit /b 1
)
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js 16+ and add it to PATH.
    pause
    exit /b 1
)
echo Python and Node.js are installed.

REM Step 2: Set up environment config files if they don't exist
echo.
echo [2/4] Setting up environment files...
if not exist "backend\.env" (
    copy "backend\env.development.template" "backend\.env" >nul
    echo Created backend\.env from development template.
    echo Please update your API keys ^(OPENAI_API_KEY, ELEVENLABS_API_KEY^) inside backend\.env
) else (
    echo backend\.env already exists. Skipping copy.
)

if not exist "frontend\.env.development" (
    copy "frontend\env.development.template" "frontend\.env.development" >nul
    echo Created frontend\.env.development from template.
) else (
    echo frontend\.env.development already exists. Skipping copy.
)

if not exist "frontend\.env.staging" (
    copy "frontend\env.staging.template" "frontend\.env.staging" >nul
    echo Created frontend\.env.staging from template.
) else (
    echo frontend\.env.staging already exists. Skipping copy.
)

REM Step 3: Setting up Python virtual environments and dependencies
echo.
echo [3/4] Installing Python backend dependencies...

set "BACKEND_DIRS=efs_vms_chatbot efs-rag-bot Floor_map"

for %%d in (%BACKEND_DIRS%) do (
    echo.
    echo --- Setting up backend\%%d ---
    cd "%ROOT_DIR%backend\%%d" || (
        echo [ERROR] Directory backend\%%d not found.
        goto error
    )
    if not exist "venv" (
        echo Creating virtual environment...
        python -m venv venv
    ) else (
        echo Virtual environment already exists.
    )
    
    echo Activating virtual environment and installing packages...
    call venv\Scripts\activate.bat
    python -m pip install --upgrade pip >nul 2>&1
    
    if exist "requirements.txt" (
        pip install -r requirements.txt
    ) else if exist "requirements1.txt" (
        pip install -r requirements1.txt
    ) else (
        echo No requirements file found.
    )
    call deactivate
)

cd /d "%ROOT_DIR%"

REM Step 4: Installing Frontend Node dependencies
echo.
echo [4/4] Installing Frontend Node.js dependencies...
cd "%ROOT_DIR%frontend" || (
    echo [ERROR] frontend directory not found.
    goto error
)
call npm install
cd /d "%ROOT_DIR%"

echo.
echo ==================================================
echo Setup completed successfully!
echo ==================================================
echo To start all services, run: start.bat
echo ==================================================
echo.
pause
exit /b 0

:error
echo.
echo [ERROR] Setup failed.
pause
exit /b 1
