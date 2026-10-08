# PowerShell script to start all services for DEVELOPMENT environment (Windows)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting EFS VMS Development Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Development ports
$env:EFS_BACKEND_PORT = "8000"
$env:FLOOR_MAP_PORT = "8003"
$env:RAG_BOT_PORT = "8002"
$env:MOCK_API_PORT = "5000"
$env:MOCK_API_BASE_URL = "http://localhost:5000"

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Kill any existing Node/Python processes
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "python" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# 1. Mock API Server
Write-Host "Starting Mock API Server (Port $env:MOCK_API_PORT)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$scriptDir\backend\efs_vms_chatbot'; `$env:MOCK_API_PORT='$env:MOCK_API_PORT'; `$env:MOCK_API_BASE_URL='$env:MOCK_API_BASE_URL'; .\venv\Scripts\Activate.ps1; python mock_api_server.py"
) -WindowStyle Normal
Start-Sleep -Seconds 2

# 2. Main Backend
Write-Host "Starting Main Backend (Port $env:EFS_BACKEND_PORT)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$scriptDir\backend\efs_vms_chatbot'; `$env:EFS_BACKEND_PORT='$env:EFS_BACKEND_PORT'; .\venv\Scripts\Activate.ps1; python main.py"
) -WindowStyle Normal
Start-Sleep -Seconds 2

# 3. Floor Map Server
Write-Host "Starting Floor Map Server (Port $env:FLOOR_MAP_PORT)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$scriptDir\backend\Floor_map'; `$env:FLOOR_MAP_PORT='$env:FLOOR_MAP_PORT'; .\venv\Scripts\Activate.ps1; python main.py"
) -WindowStyle Normal
Start-Sleep -Seconds 2

# 4. RAG Bot (Optional)
Write-Host "Starting RAG Bot (Port $env:RAG_BOT_PORT)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$scriptDir\backend\efs-rag-bot'; `$env:RAG_BOT_PORT='$env:RAG_BOT_PORT'; .\venv\Scripts\Activate.ps1; python api.py"
) -WindowStyle Normal
Start-Sleep -Seconds 2

# 5. Frontend
Write-Host "Starting Frontend (Port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$scriptDir\frontend'; Copy-Item -Path env.development.template -Destination .env.development -Force -ErrorAction SilentlyContinue; npm run dev"
) -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All services started in development mode!" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Yellow
Write-Host "   - Frontend:          http://localhost:3000" -ForegroundColor White
Write-Host "   - Mock API (OIDC):   http://localhost:5000" -ForegroundColor White
Write-Host "   - Main Backend (WS): ws://localhost:8000/ws" -ForegroundColor White
Write-Host "   - Floor Map:         http://localhost:8003" -ForegroundColor White
Write-Host "   - RAG Bot:           http://localhost:8002" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


