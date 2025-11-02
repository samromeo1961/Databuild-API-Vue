# DBx Connector Vue - Beta Testing Guide

Welcome to the beta testing program for **DBx Connector Vue**! This is an Electron desktop application that provides a modern interface for managing Databuild SQL Server databases with integration to zzTakeoff.

## What is DBx Connector Vue?

DBx Connector Vue is a desktop application that connects to Databuild (construction estimating) SQL Server databases. It provides:

- **Modern UI**: Vue.js + AG Grid interface with dark mode support
- **Catalogue Management**: View and edit items with inline editing capabilities
- **Recipe Management**: Manage recipes and their ingredients/sub-items
- **Supplier & Contact Management**: Track suppliers, contacts, and groups
- **Template System**: Save and reuse templates
- **zzTakeoff Integration**: Send items directly to zzTakeoff external API
- **Favourites & Recents**: Quick access to frequently used items
- **Archive Management**: Archive/unarchive items and recipes
- **Column Customization**: Show/hide, reorder, resize, and rename columns
- **Persistent State**: All column configurations and preferences saved locally

## System Requirements

- **Operating System**: Windows 10 or later (x64)
- **Database**: Access to a Databuild SQL Server database
  - SQL Server (any version supported by mssql npm package)
  - Database credentials (server, username, password, database name)
  - Network access to SQL Server (local or remote)
- **Disk Space**: ~200 MB for installation
- **Memory**: 4 GB RAM recommended

## Installation

1. **Download** the installer:
   - Go to the [Releases page](https://github.com/samromeo1961/Databuild-API-Vue/releases)
   - Download `DBx Connector Vue Setup 1.0.0.exe`

2. **Run** the installer:
   - Double-click the downloaded `.exe` file
   - Choose installation directory (default: `C:\Users\{User}\AppData\Local\Programs\dbx-connector-vue`)
   - Select whether to create desktop and start menu shortcuts
   - Click "Install"

3. **First Launch**:
   - On first launch, you'll see a database settings window
   - Enter your Databuild SQL Server connection details:
     - **Server**: SQL Server hostname or IP (e.g., `localhost` or `192.168.1.100`)
     - **Database**: Database name (typically `T_Esys` or similar)
     - **Username**: SQL Server username
     - **Password**: SQL Server password
     - **Port**: SQL Server port (default: 1433)
   - Click "Test Connection" to verify
   - Click "Save" to connect

4. **Using the App**:
   - Once connected, the main application window opens with tabs for:
     - Catalogue
     - Recipes
     - Suppliers
     - Contacts
     - Templates
     - Favourites
     - Recents
     - zzTakeoff
     - Preferences

## Features to Test

### High Priority
- [ ] Database connection with your SQL Server instance
- [ ] Catalogue tab loads items correctly
- [ ] Inline editing (Description, Unit, Price) works
- [ ] Archive/unarchive functionality
- [ ] Recipe tab loads recipes and shows sub-items
- [ ] Supplier and Contact management
- [ ] Column show/hide, reorder, resize, and rename
- [ ] Column state persists after app restart
- [ ] Dark mode toggle
- [ ] Favourites and Recents tracking

### Medium Priority
- [ ] Template saving and loading
- [ ] zzTakeoff integration (send items to external API)
- [ ] Preferences (theme, defaults)
- [ ] Keyboard shortcuts (Ctrl+, for settings, F12 for DevTools)
- [ ] Date filtering for prices

### Low Priority
- [ ] Application performance with large datasets (10,000+ items)
- [ ] Multi-window behavior
- [ ] Window resize/maximize behavior

## Known Issues & Limitations

- **Windows Only**: Currently only builds for Windows x64
- **SQL Server Required**: Requires direct SQL Server access (not SQL Express LocalDB)
- **Single User**: No multi-user concurrency handling (use database-level locking)
- **No Code Signing**: Installer is not code-signed (Windows may show security warning)
- **Large Datasets**: Performance may degrade with 10,000+ catalogue items
- **zzTakeoff API**: Requires valid zzTakeoff API credentials to send items

## How to Provide Feedback

We need your feedback! Please report:

### Bugs & Issues
- Go to [GitHub Issues](https://github.com/samromeo1961/Databuild-API-Vue/issues)
- Click "New Issue"
- Use the **Bug Report** template
- Include:
  - Steps to reproduce
  - Expected behavior
  - Actual behavior
  - Screenshots (if applicable)
  - Your Windows version
  - SQL Server version
  - Database size (approximate number of catalogue items)

### Feature Requests
- Go to [GitHub Issues](https://github.com/samromeo1961/Databuild-API-Vue/issues)
- Click "New Issue"
- Use the **Feature Request** template
- Describe:
  - What feature you'd like
  - Why it would be useful
  - How you envision it working

### General Feedback
- Use [GitHub Discussions](https://github.com/samromeo1961/Databuild-API-Vue/discussions)
- Share your experience, suggestions, or questions

## Troubleshooting

### "Cannot connect to database"
- Verify SQL Server is running
- Check server name/IP is correct
- Verify SQL Server authentication is enabled (not just Windows auth)
- Check firewall allows port 1433 (or your custom port)
- Ensure user has read/write permissions on the database

### "Application won't start"
- Check Windows Event Viewer for errors
- Try running as Administrator
- Ensure Windows Defender/antivirus isn't blocking
- Reinstall the application

### "Data not loading"
- Check DevTools console (F12) for errors
- Verify database schema matches Databuild structure
- Ensure tables exist: `PriceList`, `CostCentres`, `Recipe`, `Supplier`, `Contacts`, etc.

### "Changes not saving"
- Check user has write permissions on database
- Look for SQL errors in DevTools console (F12)
- Verify database isn't read-only

### "zzTakeoff integration not working"
- Verify zzTakeoff API credentials in Preferences
- Check network connectivity
- Look for errors in DevTools console (F12)

## Development & Technical Info

For developers and technical users:

- **Built with**: Electron, Vue 3, Node.js, Bootstrap 5, AG Grid Community
- **Database**: mssql npm package for SQL Server connectivity
- **Local Storage**: electron-store for preferences and column states
- **Source Code**: [GitHub Repository](https://github.com/samromeo1961/Databuild-API-Vue)
- **License**: MIT

## Privacy & Data Security

- All database connections are direct (client → SQL Server)
- No data is sent to external servers (except zzTakeoff when explicitly requested)
- Database credentials stored locally in `%APPDATA%\dbx-connector-vue\config.json`
- Column states and preferences stored locally in `%APPDATA%\dbx-connector-vue\`

## Contact

- **GitHub**: [samromeo1961/Databuild-API-Vue](https://github.com/samromeo1961/Databuild-API-Vue)
- **Issues**: [Report bugs or request features](https://github.com/samromeo1961/Databuild-API-Vue/issues)

Thank you for participating in our beta testing program! Your feedback is invaluable in making DBx Connector Vue better.

---

**Version**: 1.0.0
**Last Updated**: January 2025
**Status**: Beta
