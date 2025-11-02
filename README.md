# DBx Connector Vue

> **Electron desktop application for Databuild SQL Server database management with Vue 3 + AG Grid interface**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-beta-yellow)
![Platform](https://img.shields.io/badge/platform-windows-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

## Overview

DBx Connector Vue is a modern Electron desktop application that provides a powerful interface for managing Databuild (construction estimating) SQL Server databases. Built with Vue 3, AG Grid, and Bootstrap 5, it offers a feature-rich experience for catalogue management, recipe handling, supplier/contact management, and seamless integration with zzTakeoff.

## Key Features

- **Modern UI**: Clean, responsive interface with dark mode support
- **Catalogue Management**: View, edit, and manage catalogue items with inline editing
- **Recipe Management**: Create and manage recipes with ingredient/sub-item tracking
- **Supplier & Contact Management**: Comprehensive supplier and contact database
- **Template System**: Save and reuse templates for common tasks
- **zzTakeoff Integration**: Direct integration with zzTakeoff external API
- **Favourites & Recents**: Quick access to frequently used items
- **Archive Management**: Archive/unarchive functionality for items and recipes
- **Column Customization**: Full control over column visibility, order, size, and naming
- **Persistent State**: All preferences and column states saved locally
- **SQL Server Connectivity**: Direct connection to Databuild SQL Server databases

## Screenshots

*(Add screenshots here)*

## Beta Testing

**We're looking for beta testers!**

Download the latest release and help us improve DBx Connector Vue. See the [Beta Testing Guide](BETA_TESTING.md) for detailed instructions on installation, testing, and providing feedback.

### Quick Start for Beta Testers

1. Download `DBx Connector Vue Setup 1.0.0.exe` from [Releases](https://github.com/samromeo1961/Databuild-API-Vue/releases)
2. Run the installer
3. Configure your Databuild SQL Server connection
4. Start using the app!
5. Report bugs and request features via [GitHub Issues](https://github.com/samromeo1961/Databuild-API-Vue/issues)

## System Requirements

- **OS**: Windows 10 or later (x64)
- **Database**: Databuild SQL Server database access
- **RAM**: 4 GB recommended
- **Disk**: ~200 MB

## Tech Stack

### Backend (Electron Main Process)
- **Electron**: Cross-platform desktop framework
- **Node.js**: JavaScript runtime
- **mssql**: SQL Server connectivity
- **electron-store**: Local data persistence
- **axios**: HTTP client for external API calls

### Frontend (Renderer Process)
- **Vue 3**: Progressive JavaScript framework (Composition API)
- **Vue Router**: Client-side routing
- **AG Grid Community**: High-performance data grid
- **Bootstrap 5**: UI framework
- **Bootstrap Icons**: Icon library
- **Vite**: Fast build tool and dev server

## Development

### Prerequisites

- Node.js 18+ and npm
- SQL Server with Databuild database
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/samromeo1961/Databuild-API-Vue.git
cd Databuild-API-Vue

# Install main dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Development Mode

```bash
# Start Electron app in dev mode (with Vite dev server)
npm run dev

# Or start frontend dev server only
npm run dev:frontend
```

### Building for Production

```bash
# Build frontend and create Windows installer
npm run build

# Build frontend only
npm run build-frontend

# Create Windows package (after building frontend)
npm run dist
```

The installer will be created in the `dist/` directory.

## Project Structure

```
Databuild-API-Vue/
├── main.js                    # Electron main process entry point
├── preload.js                 # Context bridge for IPC
├── settings.html              # Database settings window
├── src/
│   ├── database/
│   │   ├── connection.js      # SQL Server connection pool
│   │   └── *-store.js         # electron-store persistence
│   └── ipc-handlers/          # IPC handler implementations
│       ├── catalogue.js
│       ├── recipes.js
│       ├── suppliers.js
│       └── ...
├── frontend/
│   ├── src/
│   │   ├── main.js            # Vue app entry point
│   │   ├── App.vue            # Root component
│   │   ├── router/            # Vue Router config
│   │   ├── components/        # Vue components
│   │   │   ├── CatalogueTab.vue
│   │   │   ├── RecipesTab.vue
│   │   │   └── ...
│   │   └── composables/
│   │       └── useElectronAPI.js  # IPC wrapper
│   └── dist/                  # Built frontend (git-ignored)
├── assets/
│   ├── icon.ico               # Windows app icon
│   └── icon.png
└── dist/                      # Build output (git-ignored)
```

## Architecture

### IPC Communication Flow

```
Frontend (Vue)
  ↓ useElectronAPI() composable
window.electronAPI (preload.js)
  ↓ contextBridge
ipcMain handlers (main.js)
  ↓ src/ipc-handlers/*.js
SQL Server (mssql)
```

### Database Schema

DBx Connector Vue expects a standard Databuild SQL Server schema with tables:
- `PriceList` - Catalogue items and recipes
- `CostCentres` - Cost centre hierarchy
- `Recipe` - Recipe ingredients/sub-items
- `Supplier` - Supplier records
- `Contacts` - Contact records
- `Prices` - Price history
- `PerCodes` - Unit of measure definitions
- And more...

See [CLAUDE.md](CLAUDE.md) for detailed schema documentation.

## Configuration

### Database Connection

On first launch, configure your SQL Server connection:
- **Server**: SQL Server hostname or IP
- **Database**: Database name (e.g., `T_Esys`)
- **Username**: SQL Server username
- **Password**: SQL Server password
- **Port**: SQL Server port (default: 1433)

Connection details are stored securely in:
`%APPDATA%\dbx-connector-vue\config.json`

### Preferences

User preferences and column states are stored locally in:
`%APPDATA%\dbx-connector-vue\`

## Contributing

We welcome contributions! Here's how you can help:

1. **Report Bugs**: Use [GitHub Issues](https://github.com/samromeo1961/Databuild-API-Vue/issues)
2. **Request Features**: Open a feature request issue
3. **Submit Pull Requests**: Fork, branch, code, test, and submit PR
4. **Improve Documentation**: Help us improve docs and guides
5. **Beta Testing**: Test the app and provide feedback

## Roadmap

- [ ] macOS and Linux support
- [ ] Multi-language support
- [ ] Advanced reporting features
- [ ] Import/export functionality (CSV, Excel)
- [ ] Offline mode with sync
- [ ] Auto-update mechanism
- [ ] Code signing for Windows installer
- [ ] Performance optimizations for large datasets
- [ ] Enhanced zzTakeoff integration features
- [ ] Backup and restore functionality

## Known Issues

- Windows only (no macOS/Linux builds yet)
- Installer not code-signed (security warning on install)
- Performance may degrade with 10,000+ items
- No multi-user concurrency handling

See [BETA_TESTING.md](BETA_TESTING.md) for full list of known issues.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- **Documentation**: See [CLAUDE.md](CLAUDE.md) for technical docs
- **Beta Testing**: See [BETA_TESTING.md](BETA_TESTING.md)
- **Issues**: [GitHub Issues](https://github.com/samromeo1961/Databuild-API-Vue/issues)
- **Discussions**: [GitHub Discussions](https://github.com/samromeo1961/Databuild-API-Vue/discussions)

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Powered by [Vue.js](https://vuejs.org/)
- Data grids by [AG Grid](https://www.ag-grid.com/)
- UI by [Bootstrap](https://getbootstrap.com/)
- Icons by [Bootstrap Icons](https://icons.getbootstrap.com/)

---

**Made with ❤️ for the construction estimating community**

*DBx Connector Vue - Modern interface for Databuild SQL Server databases*
