@echo off
echo ========================================
echo Stopping EFS VMS Services
echo ========================================
echo.

echo Cleaning up existing processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul

echo.
echo ========================================
echo All services stopped successfully!
echo ========================================
echo.
pause
