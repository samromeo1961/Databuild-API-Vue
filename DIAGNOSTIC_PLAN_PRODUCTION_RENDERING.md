# Production BrowserView Rendering Issue - Diagnostic Plan

**Status:** Phase 1 Implemented (v1.1.6)
**Issue:** zzTakeoff embedded webview renders in dev mode but shows blank screen in production builds
**Created:** 2025-11-07

---

## Problem Summary

The zzTakeoff webview (implemented using Electron BrowserView) works perfectly in development mode but fails to render in production builds, showing only a blank white screen. The webview should display `https://app.zztakeoff.com` but the content is not visible.

**Key Observations:**
- Works in dev mode (npm run dev)
- Fails in production (.exe installer)
- Auto-maximize functionality works (implemented in v1.1.5)
- Blank screen suggests rendering/painting issue rather than network issue

---

## Root Cause Analysis

Based on research, the most likely failure vectors are:

### P1: Chromium Security Policies (HIGH PRIORITY)
- **Sandbox mode** - Already disabled (`sandbox: false`) in v1.1.4+
- **Context isolation** - Currently enabled, may conflict with BrowserView
- **Web security** - May block cross-origin content
- **CSP headers** - External site may have strict policies

### P2: Network/Proxy Restrictions (MEDIUM PRIORITY)
- Corporate proxy settings not inherited
- Certificate validation failures
- DNS resolution issues in packaged app
- System proxy configuration not detected

### P3: View Configuration Issues (MEDIUM PRIORITY)
- BrowserView bounds calculation errors
- Z-order/layering conflicts with main window
- Background color/transparency issues
- WebContents lifecycle timing problems

### P4: Native Module or Thread Blocking (LOW PRIORITY)
- GPU process failures (already mitigated with `disableHardwareAcceleration()`)
- ASAR packaging path resolution
- Main process blocking preventing render

---

## Diagnostic Plan - 6 Phases

## ✅ Phase 1: Enable Production Diagnostics (IMPLEMENTED in v1.1.6)

**Goal:** Get visibility into what's happening in production

### Changes Made:

1. **BrowserView DevTools Access**
   - Added **Ctrl+Shift+I** keyboard shortcut
   - Opens DevTools for BrowserView content in detached window
   - Available in production builds
   - Location: main.js:138-156

2. **Console Message Forwarding**
   - All BrowserView console messages forwarded to main process
   - Categorized by level (INFO, WARN, ERROR)
   - Includes source file and line numbers
   - Location: main.js:617-622

3. **Comprehensive Lifecycle Logging**
   - `did-start-loading` - Loading begins
   - `did-stop-loading` - Loading completes
   - `did-navigate` - Navigation events
   - `did-fail-load` - Load failures with error codes
   - `did-finish-load` - Success with URL/title
   - `dom-ready` - DOM parsed
   - `crashed` - Renderer crashes
   - `render-process-gone` - Process termination
   - `unresponsive` / `responsive` - Page responsiveness
   - Location: main.js:625-691

4. **Startup Diagnostics**
   - Electron, Chrome, Node versions
   - App version and packaged status
   - File paths and user data directory
   - Platform and architecture
   - Location: main.js:22-34

5. **BrowserView Configuration Diagnostics**
   - Creation parameters logged as JSON
   - Final configuration summary
   - WebContents rendering state (`isOffscreen()`, `isPainting()`)
   - Location: main.js:587-652

6. **Verbose Logging**
   - Enabled `--enable-logging` flag
   - Verbose level 1 (`-v 1`)
   - Location: main.js:18-20

### How to Use v1.1.6 Diagnostic Build:

1. **Install and Run:**
   ```
   dist\DBx Connector Vue Setup 1.1.6.exe
   ```

2. **Run from Command Line (to see logs):**
   ```
   cd "C:\Program Files\DBx Connector Vue"
   "DBx Connector Vue.exe"
   ```
   Or check logs at: `%APPDATA%\dbx-connector-vue\logs\`

3. **Navigate to zzTakeoff Web Tab**
   - App should create BrowserView
   - Check console for diagnostic output

4. **Open BrowserView DevTools:**
   - Press **Ctrl+Shift+I** while on zzTakeoff tab
   - Check Console tab for errors
   - Check Network tab for failed requests
   - Check Elements tab to see if DOM exists

5. **Collect Diagnostic Data:**
   - Startup diagnostics (versions, paths)
   - BrowserView creation logs
   - Lifecycle events (did-navigate, did-fail-load, etc.)
   - Console messages from webview
   - DevTools findings (errors, network failures)

### Expected Output:

The diagnostics will reveal:
- Whether WebContents is painting (`isPainting: true/false`)
- JavaScript errors in embedded page
- Network request failures
- Load failures with specific error codes
- Renderer crashes or unresponsiveness
- DOM structure (even if not visible)

---

## ⏸️ Phase 2: Verify BrowserView Configuration (PENDING)

**Goal:** Test different security and configuration settings

### Implementation Steps:

1. **Test with Relaxed Security (Temporary)**
   ```javascript
   webView = new BrowserView({
     webPreferences: {
       nodeIntegration: false,
       contextIsolation: false, // TEST: Disable to check if this blocks rendering
       sandbox: false,
       webSecurity: false, // TEST: Disable to check CORS/CSP issues
       partition: 'persist:zztakeoff',
       enableRemoteModule: false,
       backgroundThrottling: false,
       allowRunningInsecureContent: true // TEST: Allow mixed content
     }
   });
   ```

2. **Add Session Configuration**
   ```javascript
   // After BrowserView creation
   const session = webView.webContents.session;

   // Clear cache
   await session.clearCache();

   // Configure headers
   session.webRequest.onBeforeSendHeaders((details, callback) => {
     details.requestHeaders['User-Agent'] = 'Mozilla/5.0 ...';
     callback({ requestHeaders: details.requestHeaders });
   });

   // Log all requests
   session.webRequest.onCompleted((details) => {
     console.log('[BrowserView Request]', details.method, details.url, details.statusCode);
   });
   ```

3. **Test Different Background Colors**
   ```javascript
   webView.setBackgroundColor('#ff0000'); // Red to verify visibility
   ```

4. **Test Manual Paint Triggering**
   ```javascript
   // Force repaint after load
   webView.webContents.on('did-finish-load', () => {
     webView.webContents.invalidate();
     webView.webContents.setZoomFactor(1.0);
   });
   ```

### What to Test:
- Does disabling `contextIsolation` fix rendering?
- Does disabling `webSecurity` fix rendering?
- Are there any failed network requests?
- Does manual invalidate/zoom trigger painting?

---

## ⏸️ Phase 3: Network & Proxy Configuration (PENDING)

**Goal:** Ensure external HTTPS requests work in production

### Implementation Steps:

1. **Inherit System Proxy Settings**
   ```javascript
   // In BrowserView creation
   const session = webView.webContents.session;

   // Use system proxy
   await session.setProxy({
     mode: 'system'
   });

   console.log('[BrowserView] Proxy config:', await session.resolveProxy('https://app.zztakeoff.com'));
   ```

2. **Test DNS Resolution**
   ```javascript
   const dns = require('dns');
   dns.resolve4('app.zztakeoff.com', (err, addresses) => {
     console.log('[DNS] app.zztakeoff.com resolves to:', addresses);
   });
   ```

3. **Test Network Connectivity**
   ```javascript
   const https = require('https');
   https.get('https://app.zztakeoff.com', (res) => {
     console.log('[HTTPS Test] Status:', res.statusCode);
   }).on('error', (err) => {
     console.error('[HTTPS Test] Failed:', err.message);
   });
   ```

4. **Configure Certificate Handling**
   ```javascript
   // Handle certificate errors (for testing only!)
   webView.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
     console.error('[Certificate Error]', url, error);
     // event.preventDefault();
     // callback(true); // DANGER: Only for testing!
   });
   ```

### What to Test:
- User environment: Behind corporate proxy? (No per user response)
- Are proxy settings inherited correctly?
- Does DNS resolve in production?
- Are there certificate validation errors?

---

## ⏸️ Phase 4: Content Security Policy (PENDING)

**Goal:** Verify CSP headers aren't blocking rendering

### Implementation Steps:

1. **Inspect Response Headers**
   ```javascript
   webView.webContents.session.webRequest.onHeadersReceived((details, callback) => {
     console.log('[Response Headers]', details.url);
     console.log('  CSP:', details.responseHeaders['content-security-policy']);
     console.log('  X-Frame-Options:', details.responseHeaders['x-frame-options']);
     callback({ responseHeaders: details.responseHeaders });
   });
   ```

2. **Test Overriding CSP (Temporarily)**
   ```javascript
   webView.webContents.session.webRequest.onHeadersReceived((details, callback) => {
     // Remove restrictive headers for testing
     delete details.responseHeaders['content-security-policy'];
     delete details.responseHeaders['x-frame-options'];
     callback({ responseHeaders: details.responseHeaders });
   });
   ```

3. **Check for Frame-Busting Scripts**
   ```javascript
   webView.webContents.executeJavaScript(`
     console.log('Frame location:', window.location.href);
     console.log('Is framed:', window !== window.top);
   `);
   ```

### What to Test:
- Does the site send CSP headers that block rendering?
- Are there X-Frame-Options headers?
- Does the site detect it's in a frame and block itself?

---

## ⏸️ Phase 5: ASAR & Path Resolution (PENDING)

**Goal:** Verify app packaging isn't causing issues

### Implementation Steps:

1. **Log All Paths**
   ```javascript
   console.log('[Paths]', {
     appPath: app.getAppPath(),
     userData: app.getPath('userData'),
     exe: app.getPath('exe'),
     isPackaged: app.isPackaged,
     asar: process.mainModule.filename.includes('.asar')
   });
   ```

2. **Test Without ASAR**
   ```json
   // In package.json build config
   "build": {
     "asar": false
   }
   ```

3. **Verify Session Storage Path**
   ```javascript
   const partition = webView.webContents.session;
   console.log('[Session] Storage path:', partition.getStoragePath());
   ```

### What to Test:
- Does running unpacked work?
- Are session storage paths correct?
- Are there file permission issues?

---

## ⏸️ Phase 6: Hardware & GPU Rendering (PENDING)

**Goal:** Rule out GPU/rendering pipeline issues

**Note:** Already implemented in v1.1.4+:
- `app.disableHardwareAcceleration()` on line 11
- Cache disabled on lines 14-16

### Additional Tests:

1. **Force Software Rendering**
   ```javascript
   app.commandLine.appendSwitch('disable-gpu');
   app.commandLine.appendSwitch('disable-gpu-compositing');
   ```

2. **Test Different Rendering Flags**
   ```javascript
   app.commandLine.appendSwitch('enable-features', 'UseSkiaRenderer');
   app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
   ```

3. **Check GPU Blacklist**
   ```javascript
   app.commandLine.appendSwitch('ignore-gpu-blacklist');
   ```

---

## Testing Checklist

### After Installing v1.1.6:

- [ ] Run from command line to capture console output
- [ ] Navigate to zzTakeoff Web tab
- [ ] Check startup diagnostics in console
- [ ] Check BrowserView creation logs
- [ ] Press Ctrl+Shift+I to open BrowserView DevTools
- [ ] Check DevTools Console for JavaScript errors
- [ ] Check DevTools Network for failed requests
- [ ] Check DevTools Elements to see if DOM rendered
- [ ] Look for lifecycle events in console (did-navigate, did-finish-load)
- [ ] Check for "isPainting: false" in configuration summary
- [ ] Look for any error codes in did-fail-load events

### Information to Collect:

1. **Console Output** (entire startup through navigation)
2. **DevTools Screenshots** (Console, Network, Elements tabs)
3. **Error Messages** (any red text in console or DevTools)
4. **Network Failures** (failed requests, status codes)
5. **Lifecycle Events** (which events fired, which didn't)
6. **isPainting Status** (true or false)
7. **WebContents State** (isOffscreen, etc.)

---

## Known Configuration (Already Implemented)

### Hardware Acceleration:
```javascript
app.disableHardwareAcceleration(); // Line 11
```

### Cache Disabled:
```javascript
app.commandLine.appendSwitch('disk-cache-size', '0');
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
```

### BrowserView webPreferences:
```javascript
{
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: false, // CRITICAL: Disabled to fix packaged app rendering
  partition: 'persist:zztakeoff',
  webSecurity: true,
  enableRemoteModule: false,
  backgroundThrottling: false
}
```

---

## Version History

### v1.1.6 (Current - Diagnostic Build)
- ✅ Added Ctrl+Shift+I DevTools shortcut for BrowserView
- ✅ Console message forwarding from BrowserView
- ✅ Comprehensive lifecycle event logging
- ✅ Startup diagnostics (versions, paths)
- ✅ BrowserView configuration diagnostics
- ✅ Verbose Electron logging enabled

### v1.1.5
- ✅ Auto-maximize webview from all tabs
- ✅ Consistent "Send to zzTakeoff" behavior
- ⚠️ Production rendering still fails

### v1.1.4
- ✅ Hardware acceleration disabled
- ✅ Cache disabled
- ✅ Sandbox disabled
- ⚠️ Production rendering still fails

---

## Next Steps

1. **Test v1.1.6 in production environment**
   - Collect all diagnostic output
   - Test on multiple machines if possible
   - Document exact error messages

2. **Analyze diagnostic data**
   - Identify root cause from logs/DevTools
   - Determine which phase to implement next

3. **Implement targeted fix based on findings**
   - If CSP issue → Phase 4
   - If network issue → Phase 3
   - If config issue → Phase 2
   - If GPU issue → Phase 6

4. **Iterate until resolved**

---

## Questions for Diagnostic Data Collection

When running v1.1.6, answer these questions:

1. **Does Ctrl+Shift+I open DevTools successfully?**
   - If yes, what do you see in Console tab?
   - If yes, what do you see in Network tab?
   - If yes, what do you see in Elements tab?

2. **What lifecycle events appear in the console?**
   - did-start-loading?
   - did-navigate?
   - did-finish-load?
   - did-fail-load? (with what error code?)

3. **What does the configuration summary show?**
   - isPainting: true or false?
   - isOffscreen: true or false?

4. **Are there any console errors?**
   - In main process console?
   - In BrowserView DevTools console?

5. **Are there any network failures?**
   - Failed requests in DevTools Network tab?
   - What status codes?

---

## Contact & Support

If you need assistance interpreting diagnostic output or implementing the next phase, provide:
- Full console output from startup through navigation
- Screenshots of BrowserView DevTools (all tabs)
- Any error messages or warnings
- isPainting and isOffscreen values

---

**Document Created:** 2025-11-07
**Last Updated:** 2025-11-07
**Version:** v1.1.6 (Diagnostic Build)
