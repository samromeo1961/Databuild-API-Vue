@echo off
echo ====================================
echo   DBx Connector Vue - Restart Dev
echo ====================================
echo.

echo [1/4] Stopping all Node and Electron processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM electron.exe 2>nul
echo Done.
echo.

echo [2/4] Waiting for processes to close...
timeout /t 2 /nobreak >nul
echo Done.
echo.

echo [3/4] Starting Frontend Dev Server (Vite on port 5173)...
start "Vite Dev Server" cmd /c "cd frontend && npm run dev"
echo Waiting for Vite to initialize...
timeout /t 5 /nobreak >nul
echo Done.
echo.

echo [4/4] Starting Electron App...
start "Electron App" cmd /c "npm run dev"
echo Done.
echo.

echo ====================================
echo   Dev servers restarted!
echo ====================================
echo.
echo Frontend: http://localhost:5173
echo Electron: Running in new window
echo.
echo Press any key to close this window...
pause >nul
