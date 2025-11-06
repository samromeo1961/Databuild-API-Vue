@echo off
REM Launch Chrome with remote debugging enabled for Claude Code MCP integration
echo Starting Chrome in debug mode on port 9222...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug" --new-window http://localhost:5173
echo Chrome launched. Connect to http://localhost:5173
