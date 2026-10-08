@echo off
REM Windows batch script for complete environment setup
setlocal EnableDelayedExpansion

echo ========================================
echo EFS VMS Complete Environment Setup
echo ========================================
echo.
echo This script will:
echo   - Copy environment files
echo   - Create Python virtual environments
echo   - Install Python dependencies
echo   - Install Node.js dependencies
echo.
if "%1"=="--auto" (
    set choice=1
    goto skip_choice
)
echo Select environment:
echo 1) Development (localhost)
echo 2) Staging (192.168.3.155)
echo.
set /p choice="Enter choice [1-2]: "
:skip_choice

if "%choice%"=="1" (
    set ENV=development
    echo Setting up DEVELOPMENT environment...
) else if "%choice%"=="2" (
    set ENV=staging
    echo Setting up STAGING environment...
) else (
    echo Invalid choice. Exiting.
    pause
    exit /b 1
)

REM Ask for installation preferences
echo.
if "%1"=="--auto" (
    set install_deps=Y
    goto skip_install_deps
)
set /p install_deps="Install dependencies? (Python venv + pip, npm) [Y/n]: "
:skip_install_deps
if "%install_deps%"=="" set install_deps=Y

echo.
echo ========================================
echo Step 1: Copying environment files...
echo ========================================

REM Get the root directory
set ROOT_DIR=%CD%

REM Setup Frontend Environment
echo.
echo Frontend environment...
cd "%ROOT_DIR%\frontend" || goto :error
if not exist ".env.%ENV%" (
    copy "env.%ENV%.template" ".env.%ENV%" >nul
    echo Created frontend\.env.%ENV%
) else (
    echo frontend\.env.%ENV% already exists
)
cd "%ROOT_DIR%"

REM Setup Backend Environment
echo.
echo Backend environment...
cd "%ROOT_DIR%\backend" || goto :error
if not exist ".env" (
    copy "env.%ENV%.template" ".env" >nul
    echo Created backend\.env
) else (
    echo backend\.env already exists
    if "%1"=="--auto" (
        set overwrite=N
        goto skip_overwrite
    )
    set /p overwrite="Overwrite backend\.env? [y/N]: "
    :skip_overwrite
    if /i "!overwrite!"=="y" (
        copy "env.%ENV%.template" ".env" >nul
        echo Overwritten backend\.env
    )
)
cd "%ROOT_DIR%"

if /i "%install_deps%"=="n" (
    echo.
    echo ========================================
    echo Environment files setup complete!
    echo ========================================
    echo.
    echo Skipped dependency installation
    echo Run this script again or install manually
    pause
    exit /b 0
)

REM Check for Python
echo.
echo ========================================
echo Step 2: Checking prerequisites...
echo ========================================

python --version >nul 2>&1
if errorlevel 1 (
    echo Python not found. Please install Python 3.8 or higher.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do echo Python %%i found

node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js not found. Please install Node.js 16 or higher.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo Node.js %%i found

REM Setup Backend Virtual Environments
echo.
echo ========================================
echo Step 3: Setting up Python environments...
echo ========================================

echo.
echo Setting up: backend\efs_vms_chatbot
cd "%ROOT_DIR%\backend\efs_vms_chatbot" || goto :error
if not exist "venv" (
    echo   Creating virtual environment...
    python -m venv venv || goto :error
    echo   Virtual environment created
) else (
    echo   Virtual environment already exists
)
echo   Installing Python dependencies...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul 2>&1
if exist "requirements.txt" (
    pip install -r requirements.txt
    echo   Dependencies installed from requirements.txt
) else if exist "requirements1.txt" (
    pip install -r requirements1.txt
    echo   Dependencies installed from requirements1.txt
) else (
    echo   No requirements file found
)
call venv\Scripts\deactivate.bat 2>nul

echo.
echo Setting up: backend\efs-rag-bot
cd "%ROOT_DIR%\backend\efs-rag-bot" || goto :error
if not exist "venv" (
    echo   Creating virtual environment...
    python -m venv venv || goto :error
    echo   Virtual environment created
) else (
    echo   Virtual environment already exists
)
echo   Installing Python dependencies...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul 2>&1
if exist "requirements.txt" (
    pip install -r requirements.txt
    echo   Dependencies installed from requirements.txt
) else if exist "requirements1.txt" (
    pip install -r requirements1.txt
    echo   Dependencies installed from requirements1.txt
) else (
    echo   No requirements file found
)
call venv\Scripts\deactivate.bat 2>nul

echo.
echo Setting up: backend\Floor_map
cd "%ROOT_DIR%\backend\Floor_map" || goto :error
if not exist "venv" (
    echo   Creating virtual environment...
    python -m venv venv || goto :error
    echo   Virtual environment created
) else (
    echo   Virtual environment already exists
)
echo   Installing Python dependencies...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul 2>&1
if exist "requirements.txt" (
    pip install -r requirements.txt
    echo   Dependencies installed from requirements.txt
) else if exist "requirements1.txt" (
    pip install -r requirements1.txt
    echo   Dependencies installed from requirements1.txt
) else (
    echo   No requirements file found
)
call venv\Scripts\deactivate.bat 2>nul

REM Return to root directory
cd "%ROOT_DIR%"

REM Setup Frontend Dependencies
echo.
echo ========================================
echo Step 4: Setting up Frontend dependencies...
echo ========================================

echo.
echo Installing Node.js packages...
cd "%ROOT_DIR%\frontend" || goto :error

if exist "node_modules" (
    echo node_modules already exists
    if "%1"=="--auto" (
        set reinstall=N
        goto skip_reinstall
    )
    set /p reinstall="Reinstall node_modules? [y/N]: "
    :skip_reinstall
    if /i "!reinstall!"=="y" (
        echo Removing old node_modules...
        rmdir /s /q node_modules 2>nul
        del package-lock.json 2>nul
        echo Installing fresh dependencies...
        call npm install || goto :error
        echo Frontend dependencies installed
    ) else (
        echo Skipping frontend installation
    )
) else (
    echo Installing dependencies...
    call npm install || goto :error
    echo Frontend dependencies installed
)

REM Return to root directory
cd "%ROOT_DIR%"

REM Final Summary
echo.
echo ========================================
echo COMPLETE SETUP FINISHED!
echo ========================================
echo.
echo Summary:
echo   Environment files configured for %ENV%
echo   Python virtual environments created:
echo      - backend\efs_vms_chatbot\venv
echo      - backend\efs-rag-bot\venv
echo      - backend\Floor_map\venv
echo   Python dependencies installed
echo   Node.js dependencies installed
echo.
echo ========================================

if "%ENV%"=="development" (
    echo Next Steps ^(Development^):
    echo.
    echo 1. Update API keys in backend\.env if needed
    echo    - OPENAI_API_KEY
    echo    - ELEVENLABS_API_KEY
    echo.
    echo 2. Start all services:
    echo    start-all-dev.bat or start-all-dev.ps1
    echo.
    echo 3. Access application:
    echo    http://localhost:3000
    echo.
    echo 4. Individual service ports:
    echo    - Frontend:     http://localhost:3000
    echo    - Main Backend: http://localhost:8000
    echo    - RAG Bot:      http://localhost:8002
    echo    - Floor Map:    http://localhost:8003
    echo    - Mock API:     http://localhost:5000
) else (
    echo Next Steps ^(Staging^):
    echo.
    echo 1. Update API keys in backend\.env if needed
    echo    - OPENAI_API_KEY
    echo    - ELEVENLABS_API_KEY
    echo.
    echo 2. Update environment URLs in:
    echo    - frontend\.env.staging
    echo    - backend\.env
    echo.
    echo 3. Ensure firewall ports are open:
    echo    - 8144-8148
    echo.
    echo 4. Start all services:
    echo    start-all-staging.sh ^(on Ubuntu server^)
    echo.
    echo 5. Access application:
    echo    http://192.168.3.155:8148
    echo.
    echo 6. Individual service ports:
    echo    - Frontend:     http://192.168.3.155:8148
    echo    - Main Backend: http://192.168.3.155:8147
    echo    - RAG Bot:      http://192.168.3.155:8145
    echo    - Floor Map:    http://192.168.3.155:8144
    echo    - Mock API:     http://192.168.3.155:8146
)

echo.
echo ========================================
echo Documentation:
echo    - Environment Guide:  ENVIRONMENT_SETUP_GUIDE.md
echo    - Vite Config Guide:  VITE_CONFIG_GUIDE.md
echo ========================================
echo.
pause
goto :end

:error
echo.
echo ========================================
echo ERROR: Setup failed!
echo ========================================
echo.
echo An error occurred during setup. Please check:
echo   1. All directories exist (backend\efs_vms_chatbot, backend\efs-rag-bot, backend\Floor_map, frontend)
echo   2. Python and Node.js are properly installed
echo   3. You have write permissions in the current directory
echo.
echo Current directory: %CD%
echo.
pause
exit /b 1

:end
exit /b 0


