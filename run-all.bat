@echo off
echo ========================================
echo EFS VMS - Automated Setup and Start
echo ========================================
echo.
echo Running setup in automated mode...
call setup-environment.bat --auto

if %ERRORLEVEL% NEQ 0 (
    echo Setup failed! Please check the output above.
    pause
    exit /b 1
)

echo.
echo Setup completed successfully. Starting development servers...
call start-all-dev.bat
