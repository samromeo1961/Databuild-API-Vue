@echo off
echo ====================================
echo   DBx Connector Vue - Stop Dev
echo ====================================
echo.

echo Stopping all Node and Electron processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM electron.exe 2>nul
echo.

echo ====================================
echo   Dev servers stopped!
echo ====================================
echo.
echo Press any key to close this window...
pause >nul
