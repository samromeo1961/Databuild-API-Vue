# Chrome DevTools MCP Integration Guide

This document explains how to use Chrome DevTools MCP with Claude Code for debugging and inspecting the DBx Connector Vue application.

## Quick Start

### Option 1: Start Everything Together (Recommended)
```bash
npm run dev:chrome
```
This starts both the Electron app and Chrome in debug mode, ready for Claude Code inspection.

### Option 2: Launch Chrome Debug Mode Separately
If you already have the app running:
```bash
npm run launch-chrome
```

## What is Chrome DevTools MCP?

Chrome DevTools MCP (Model Context Protocol) allows Claude Code to interact with your running web application through Chrome's DevTools protocol. This enables:

- **Page Inspection**: Take snapshots of DOM structure with accessibility tree
- **Console Monitoring**: Read console logs, errors, and warnings
- **Network Analysis**: Inspect HTTP requests and responses
- **Script Execution**: Run JavaScript in the page context
- **Screenshots**: Capture visual state of pages or elements
- **User Interaction**: Click elements, fill forms, navigate pages
- **Performance Analysis**: Profile page performance and identify bottlenecks

## How It Works

1. **Chrome launches with debugging enabled** on port 9222
   - Command: `chrome.exe --remote-debugging-port=9222`
   - Uses temporary profile: `%TEMP%\chrome-debug`

2. **Claude Code connects** via the MCP server
   - Configuration in `.claude.json`
   - Environment: `CHROME_REMOTE_DEBUGGING_URL=http://localhost:9222`

3. **You can ask Claude to inspect your app**
   - "Take a snapshot of the current page"
   - "Check the console for errors"
   - "Click the submit button and see what happens"
   - "Show me the network requests for this page"

## Common Use Cases

### Debugging Vue Components
```
"Take a snapshot of the Catalogue tab and show me the AG Grid structure"
"Check if there are any console errors on the Recipes page"
"Click on the first row in the grid and show me what happens"
```

### Testing Features
```
"Navigate to the Templates tab and take a screenshot"
"Fill in the supplier form with test data and submit it"
"Check the network tab for failed API requests"
```

### Performance Analysis
```
"Start a performance trace and reload the page"
"Analyze the LCP and CWV metrics for the Catalogue tab"
"Show me which scripts are blocking page load"
```

### UI Inspection
```
"Take a screenshot of the current page"
"Find all buttons on the page and show their labels"
"Check if the dark mode toggle is working"
```

## Configuration Files

### .claude.json (MCP Server Config)
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-chrome-devtools"],
      "env": {
        "CHROME_REMOTE_DEBUGGING_URL": "http://localhost:9222"
      }
    }
  }
}
```

### .claude/settings.local.json (Automatic Approval Config)
The following settings enable automatic approval for all Chrome DevTools MCP functions:

```json
{
  "enableAllProjectMcpServers": true,
  "permissions": {
    "allow": [
      "mcp__chrome-devtools__*",
      // ... other permissions
    ]
  }
}
```

**What these settings do:**
- `enableAllProjectMcpServers: true` - Automatically approves all MCP servers defined in `.claude.json`
- `mcp__chrome-devtools__*` - Wildcard permission for all Chrome DevTools MCP functions

This means Claude Code can use ALL Chrome DevTools functions without prompting you for approval each time.

### launch-chrome-debug.bat
Simple script that launches Chrome with the required flags.

### dev-with-chrome.bat
Combined script that launches both Chrome and the Electron app.

## Troubleshooting

### Chrome won't launch
- Check if Chrome is already running. Close all Chrome windows and try again.
- Verify Chrome installation path: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- Try running the batch script manually: `launch-chrome-debug.bat`

### Claude Code can't connect
- Ensure Chrome is running with `--remote-debugging-port=9222`
- Check if port 9222 is accessible: Open `http://localhost:9222/json` in a browser
- Restart Claude Code to reconnect the MCP server

### "No pages found" error
- Make sure Chrome has navigated to `http://localhost:5173`
- Check if the Vite dev server is running
- Try refreshing the page in Chrome

## Tips

1. **Use snapshots first**: Before taking screenshots, try taking a text snapshot. It's faster and provides structured data.
2. **Keep DevTools open**: Open Chrome DevTools manually (F12) to see what Claude is doing in real-time.
3. **Check console**: If something isn't working, ask Claude to check the console for errors.
4. **Network tab**: For API issues, ask Claude to list network requests and inspect specific ones.

## Available MCP Tools

Claude Code has access to these Chrome DevTools MCP tools:

- `list_pages` - List all open tabs/pages
- `select_page` - Switch to a specific page
- `navigate_page` - Navigate to a URL or go back/forward
- `take_snapshot` - Get accessibility tree snapshot (text-based)
- `take_screenshot` - Capture visual screenshot
- `click` - Click on an element by UID
- `fill` - Fill input fields
- `hover` - Hover over elements
- `press_key` - Send keyboard input
- `evaluate_script` - Run JavaScript in page context
- `list_console_messages` - Get console logs
- `get_console_message` - Get detailed console message
- `list_network_requests` - Get network activity
- `get_network_request` - Get detailed request/response
- `performance_start_trace` - Start performance recording
- `performance_stop_trace` - Stop and analyze performance
- `wait_for` - Wait for text to appear
- `resize_page` - Resize viewport
- `emulate` - Emulate network/CPU conditions

## Integration with Development Workflow

This MCP integration works seamlessly with the Electron + Vue development workflow:

1. **Frontend runs** in Vite dev server (localhost:5173)
2. **Electron app loads** the Vite dev server
3. **Chrome also loads** the same dev server for debugging
4. **Claude can inspect** both the Electron app's behavior and the frontend in Chrome
5. **Hot reload works** - changes reflect immediately in both environments

## Next Steps

- Run `npm run dev:chrome` to start development with Chrome DevTools MCP
- Ask Claude Code to inspect your application
- Use Claude to help debug issues, test features, or optimize performance

For more information on the Chrome DevTools Protocol, visit:
https://chromedevtools.github.io/devtools-protocol/
