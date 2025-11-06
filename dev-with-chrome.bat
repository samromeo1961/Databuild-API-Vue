@echo off
REM Start development server with Chrome debugging enabled

echo Starting DBx Connector Vue Development Environment...
echo.

REM Launch Chrome in debug mode
echo [1/2] Launching Chrome in debug mode...
start "" /B "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug" --new-window http://localhost:5173

REM Wait a moment for Chrome to start
timeout /t 2 /nobreak >nul

REM Start Electron app in dev mode
echo [2/2] Starting Electron application...
echo.
npm run dev
