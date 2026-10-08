@echo off
echo Copying files to static directory...
echo.

if not exist "static\floor" mkdir static\floor
if not exist "static\images" mkdir static\images

copy /Y "Floor_map\all_floors.html" "static\floor\"
xcopy /E /Y /I "Floor_map\images\*" "static\images\"
copy /Y "Floor_map\script\*" "static\floor\"

echo.
echo Files copied successfully!
echo.
dir static\floor
echo.
pause
