@echo off
echo ====================================
echo   DBx Connector Vue - Start Dev
echo ====================================
echo.

echo [1/2] Starting Frontend Dev Server (Vite on port 5173)...
start "Vite Dev Server" cmd /c "cd frontend && npm run dev"
echo Waiting for Vite to initialize...
timeout /t 5 /nobreak >nul
echo Done.
echo.

echo [2/2] Starting Electron App...
start "Electron App" cmd /c "npm run dev"
echo Done.
echo.

echo ====================================
echo   Dev servers started!
echo ====================================
echo.
echo Frontend: http://localhost:5173
echo Electron: Running in new window
echo.
echo Press any key to close this window...
pause >nul
