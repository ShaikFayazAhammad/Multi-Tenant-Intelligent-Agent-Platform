@echo off
echo ========================================
echo Setting up Floor Navigation API
echo ========================================
echo.

echo [1/5] Creating static directories...
if not exist "static\floor" mkdir static\floor
if not exist "static\images" mkdir static\images
echo     Done!

echo.
echo [2/5] Copying HTML file...
if exist "Floor_map\all_floors.html" (
    copy /Y "Floor_map\all_floors.html" "static\floor\" >nul
    echo     Copied all_floors.html
) else (
    echo     ERROR: Floor_map\all_floors.html not found!
)

echo.
echo [3/5] Copying images...
if exist "Floor_map\images" (
    xcopy /E /Y /I "Floor_map\images\*" "static\images\" >nul
    echo     Copied all images
) else (
    echo     ERROR: Floor_map\images directory not found!
)

echo.
echo [4/5] Copying script files...
if exist "Floor_map\script" (
    copy /Y "Floor_map\script\*" "static\floor\" >nul
    echo     Copied script files
) else (
    echo     ERROR: Floor_map\script directory not found!
)

echo.
echo [5/5] Verifying setup...
if exist "static\floor\all_floors.html" (
    echo     SUCCESS: all_floors.html found in static\floor\
) else (
    echo     ERROR: all_floors.html NOT found in static\floor\
    echo.
    echo Please check that Floor_map\all_floors.html exists
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Starting FastAPI server...
echo Server will be available at: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.
python main.py
