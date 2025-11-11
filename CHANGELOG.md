# Changelog

All notable changes to DBx Connector Vue will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.9] - 2025-11-11

### Changed
- **Hotkey Update**: Changed "Back to Tab" hotkey from `Ctrl+B` to `Ctrl+Shift+B` to avoid conflicts with zzTakeoff's built-in shortcuts
- **Menu Reorganization**: Moved "← Back to [Tab]" to be a top-level menu item (positioned after Help menu) for better visibility and usability
- **Enhanced Navigation**: Added left arrow symbol (←) to "Back to" menu item to make it more visually identifiable as a navigation link

### Improved
- Menu layout in zzTakeoff window is now more intuitive with the back navigation prominently displayed

## [1.3.8] - 2025-11-11

### Added
- **Window Persistence**: zzTakeoff window now remains open when main DBx Connector window is closed
- **Automatic Recreation**: Main window automatically recreates when navigating from zzTakeoff window after it was closed
- **Session Preservation**: zzTakeoff login session is maintained even when main window is closed

### Changed
- Application no longer quits when main window is closed if zzTakeoff window is still open
- Improved window lifecycle management for better user experience

## [1.3.7] - 2025-11-11

### Fixed
- **Templates Tab**: Fixed "Send to zzTakeoff" functionality that was not working
- **Favourites Tab**: Fixed "Send to zzTakeoff" functionality that was not working
- **Recents Tab**: Fixed "Send to zzTakeoff" functionality that was not working

### Added
- **Ctrl+8 Hotkey**: Press `Ctrl+8` from main window to open or focus the zzTakeoff window
- All three tabs now use the new separate BrowserWindow approach for zzTakeoff integration

### Improved
- Two-step process for sending items: First click opens window and asks to login, second click sends data
- Login session is preserved when sending items
- Auto-focus zzTakeoff window after successfully sending items

## [1.3.6] - 2025-11-11

### Added
- **Keyboard Shortcut**: Added `Ctrl+B` hotkey for instant navigation back to last screen from zzTakeoff window
- Hotkey is displayed next to the "Back to [Tab]" menu item

### Improved
- Fastest way to switch between zzTakeoff window and working tab using keyboard
- No need to open menus - just press the hotkey

## [1.3.5] - 2025-11-11

### Added
- **Dynamic Navigation Menu**: "Back to [Last Tab]" menu item that updates automatically based on last visited tab
- **Auto-Focus**: zzTakeoff window automatically comes to focus when sending items
- **One-Click Navigation**: Return to your last-visited tab with a single menu click

### Improved
- Enhanced workflow between zzTakeoff and main window
- Reduced clicks needed for common navigation tasks
- Better visibility of navigation context

## [1.3.4] - 2025-11-11

### Added
- **Navigation Menu**: Added menu bar to zzTakeoff window with navigation options
- "Navigate Main Window" submenu with quick access to all tabs:
  - Catalogue
  - Recipes
  - Suppliers
  - Contacts
  - Templates
  - Favourites
  - Recents
- "Focus Main Window" option to quickly switch back
- View and Window menus for standard window operations

### Improved
- Easy navigation between zzTakeoff and main window without minimizing windows
- Menu bar always visible for quick access

## [1.3.3] - 2025-11-11

### Fixed
- **Catalogue Tab**: Fixed send button that was navigating to wrong tab and using old webview approach
- **Recipes Tab**: Fixed send button that was navigating to wrong tab and using old webview approach
- Both tabs now correctly use the separate BrowserWindow for zzTakeoff integration

### Improved
- All send methods now work consistently across all tabs
- Login session properly preserved when sending from any location

## [1.3.2] - 2025-11-11

### Fixed
- **Session Logout Issue**: Fixed bug where clicking send would close the logged-in zzTakeoff window and ask to login again
- JavaScript execution now works correctly in the already-authenticated session

### Changed
- Modified send flow to preserve login session:
  - First click opens zzTakeoff window and asks to login
  - Subsequent clicks send data to the already-open window
  - No more unwanted navigation that logs users out

### Improved
- Better user experience when sending multiple items
- No need to re-login between sends

## [1.3.1] - 2025-11-11

### Fixed
- **Send to zzTakeoff**: Restored "Send to zzTakeoff" functionality that stopped working after v1.3.0 window architecture changes

### Added
- `executeJavaScript` support for separate zzTakeoff window
- `isOpen` check to determine if zzTakeoff window is already running

### Technical
- Added IPC handlers: `zztakeoff-window:execute-javascript` and `zztakeoff-window:is-open`
- Exposed methods in preload.js and useElectronAPI.js

## [1.3.0] - 2025-11-11

### Changed
- **Major Architecture Change**: Switched from webview tag to separate BrowserWindow for zzTakeoff integration
- Resolved persistent rendering issues with webview that occurred in production builds

### Fixed
- zzTakeoff login screen now renders correctly in production builds
- Fixed ~200px viewport height limitation that prevented proper display

### Technical
- Replaced webview tag with Electron BrowserWindow
- Improved window management and lifecycle handling
- Better separation of concerns between main app and zzTakeoff integration

---

## Version History Summary

- **v1.3.9**: Improved hotkey and menu layout
- **v1.3.8**: Window persistence and session preservation
- **v1.3.7**: Fixed send functionality on Templates, Favourites, and Recents tabs
- **v1.3.6**: Added keyboard shortcut for quick navigation
- **v1.3.5**: Dynamic navigation menu and auto-focus
- **v1.3.4**: Added navigation menu to zzTakeoff window
- **v1.3.3**: Fixed Catalogue and Recipes send buttons
- **v1.3.2**: Fixed session logout issue
- **v1.3.1**: Restored send functionality
- **v1.3.0**: Separate BrowserWindow architecture for zzTakeoff
