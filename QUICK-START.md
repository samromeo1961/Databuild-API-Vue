# DBx Connector Vue - Quick Start Guide

## Daily Development Startup Checklist

### ☑️ Step 1: Open Claude Code
- Claude Code automatically loads MCP servers from `.claude.json`
- Chrome DevTools MCP server starts automatically in the background
- No manual action needed ✅

### ☑️ Step 2: Start Development Environment
Run ONE of these commands:

**Option A: Everything Together (Recommended)**
```bash
npm run dev:chrome
```
Launches Chrome (debug mode) + Electron app together

**Option B: Just the App**
```bash
npm run dev
```
If Chrome is already running in debug mode

**Option C: Chrome Only**
```bash
npm run launch-chrome
```
If you need to restart Chrome without restarting the app

### ☑️ Step 3: Verify Connection
Ask Claude Code: "List Chrome pages" or "Take a snapshot"

If successful, you'll see your app pages listed ✅

---

## Quick Reference Commands

| Command | What It Does |
|---------|--------------|
| `npm run dev` | Start Electron app only |
| `npm run dev:chrome` | Start Chrome + Electron together |
| `npm run launch-chrome` | Launch Chrome in debug mode only |
| `npm run dev:frontend` | Start Vite dev server only |
| `npm run build` | Build production installer |

---

## Chrome DevTools MCP Quick Commands

### Ask Claude Code to:

**Inspect Pages**
- "Take a snapshot of the current page"
- "List all open Chrome tabs"
- "Navigate to the Catalogue tab"

**Debug Issues**
- "Check the console for errors"
- "Show me all console warnings"
- "List network requests"
- "Inspect the failed API call"

**Test Features**
- "Click the save button and see what happens"
- "Fill in the form with test data"
- "Take a screenshot of the Templates page"

**Performance Analysis**
- "Start a performance trace and reload"
- "Check the Core Web Vitals"
- "Show me slow network requests"

---

## Troubleshooting

### "No pages found" or "Connection refused"
**Solution:** Chrome isn't running with debug port
```bash
npm run launch-chrome
```

### Chrome won't launch
**Solution:** Close all Chrome windows first
```bash
taskkill /F /IM chrome.exe
npm run launch-chrome
```

### MCP not connecting
**Solution:** Restart Claude Code to reload MCP servers

### Port 9222 already in use
**Solution:** Find and kill the process using port 9222
```bash
netstat -ano | findstr :9222
taskkill /F /PID <PID_NUMBER>
```

---

## Development Workflow

### Morning Routine
1. Open Claude Code ✅ (MCP auto-starts)
2. Run `npm run dev:chrome` ✅
3. Start coding! ✅

### During Development
- Make changes in Vue components
- Vite hot-reloads automatically
- Ask Claude to inspect/debug as needed
- Use Chrome DevTools manually (F12) for deep diving

### Before Committing
- Test all features work
- Check console for errors (ask Claude)
- Run build to verify: `npm run build`

---

## Environment URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Vite Dev Server | http://localhost:5173 | Frontend development |
| Chrome Debug Port | http://localhost:9222 | MCP connection |
| Chrome Debug JSON | http://localhost:9222/json | Debug endpoint list |

---

## File Locations Reference

### Configuration
- `.claude.json` - MCP server configuration
- `.claude/settings.local.json` - Permissions & auto-approval
- `package.json` - NPM scripts
- `frontend/vite.config.js` - Vite dev server config

### Launch Scripts
- `launch-chrome-debug.bat` - Chrome debug launcher
- `dev-with-chrome.bat` - Combined startup script

### Documentation
- `CLAUDE.md` - Full project documentation
- `CHROME-DEVTOOLS-MCP.md` - Detailed MCP guide
- `QUICK-START.md` - This file!

---

## Tips for Working with Claude Code + MCP

1. **Always take snapshots before screenshots** - Faster and gives structured data
2. **Ask to check console first** when debugging - Saves time finding issues
3. **Use network inspection** for API problems
4. **Let Claude navigate** the app while you watch Chrome DevTools
5. **Performance traces** are great for identifying bottlenecks

---

## Status Check Commands

### Verify Chrome Debug Mode
Open in browser: http://localhost:9222/json
Should show JSON with page info

### Check Running Processes
```bash
tasklist | findstr chrome.exe
tasklist | findstr electron.exe
tasklist | findstr node.exe
```

### Check Ports in Use
```bash
netstat -ano | findstr :5173
netstat -ano | findstr :9222
```

---

## Need Help?

1. Check `CHROME-DEVTOOLS-MCP.md` for detailed MCP usage
2. Check `CLAUDE.md` for full project architecture
3. Ask Claude Code: "Help me debug [issue]"

---

**Ready to Code!** 🚀

Just run `npm run dev:chrome` and start asking Claude Code to help inspect, debug, and build your application!
