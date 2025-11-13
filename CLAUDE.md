# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DBx Connector Vue is an Electron desktop application that connects to Databuild (construction estimating) SQL Server databases. It provides a modern Vue.js + AG Grid interface for viewing and managing catalogue items, recipes, suppliers, contacts, and templates, with integration to zzTakeoff external API.

**Tech Stack:**
- **Backend:** Electron (Node.js) with mssql for SQL Server connectivity
- **Frontend:** Vue 3 (Composition API), Vue Router, Vite dev server
- **UI:** Bootstrap 5, AG Grid Community, Bootstrap Icons
- **IPC:** Electron contextBridge/ipcRenderer for secure renderer-main communication
- **Persistence:** electron-store for local settings (SQLite-like JSON storage)

## Development Commands

### Start Development Server
```bash
npm run dev
```
Starts Electron app in dev mode. The frontend Vite dev server runs on `http://localhost:5173` and automatically opens DevTools.

### Start Development with Chrome DevTools MCP
```bash
npm run dev:chrome
```
Starts the Electron app AND launches Chrome in remote debugging mode on port 9222. This enables Claude Code to connect via Chrome DevTools MCP for live debugging, inspection, and interaction with the running application.

**What it does:**
1. Launches Chrome with `--remote-debugging-port=9222` flag
2. Opens `http://localhost:5173` in Chrome
3. Starts the Electron app in dev mode
4. Enables Claude Code to inspect pages, run scripts, take snapshots, etc.

### Launch Chrome Debug Mode Only
```bash
npm run launch-chrome
```
Only launches Chrome in debug mode without starting the Electron app. Useful if you already have the dev server running and just need to connect Chrome DevTools MCP.

### Start Frontend Dev Server Only
```bash
npm run dev:frontend
# or
cd frontend && npm run dev
```

### Build Application
```bash
npm run build          # Build frontend + create Windows installer
npm run build-frontend # Build frontend only (to frontend/dist)
npm run dist           # Electron builder package for Windows
```

### Production vs Development
- **Development:** Loads from Vite dev server (`http://localhost:5173`)
- **Production:** Loads from `frontend/dist/index.html` after build

## Architecture

### Electron Main Process (Backend)

**Entry Point:** `main.js`

The main process manages:
- Database connection lifecycle (SQL Server via mssql)
- Multiple windows: settings window (database config), main window (app UI), and zzTakeoff window
- IPC handler registration for all frontend-backend communication
- Application menu and keyboard shortcuts
- electron-store configuration for persistent settings

**Key Responsibilities:**
1. On app launch, migrate old database config to Phase 2 schema (if needed)
2. Check for saved database config in electron-store
3. If config exists, attempt connection; if fails, show settings window
4. If no config, show settings window for initial setup
5. Once connected, create main window and load Vue app
6. Register all IPC handlers from `src/ipc-handlers/`

**Database Connection Flow:**
```
app.whenReady()
  → migrateDbConfig() (converts old schema to Phase 2)
  → Check electron-store for dbConfig
  → If exists: connect() → createMainWindow()
  → If not exists or fails: createSettingsWindow()
```

### Databuild Database Architecture

Databuild uses a **three-database architecture**:

1. **Common Database** - User authentication (not used by DBx Connector)
2. **System Database** - Core data (e.g., `CROWNESYS`, `T_Esys`)
   - Contains: PriceList, CostCentres, Supplier, Recipe, Contacts, etc.
   - Used for: Catalogue, Recipes, Suppliers, Contacts tabs
3. **Job Database** - Project-specific data (e.g., `CROWNEJOB`, `T_EJob`)
   - Contains: Bill, Orders, OrderDetails
   - Used for: Templates tab (Job Import feature)

**Phase 2 Implementation:**
The app now supports **dual-database connectivity** (System + Job databases). The config is automatically migrated from Phase 1 format:
- Phase 1: `{ database: "T_Esys" }`
- Phase 2: `{ systemDatabase: "T_Esys", jobDatabase: "T_EJob" }` (or auto-detect)

If `jobDatabase` is not specified, the app attempts to auto-detect it by replacing `SYS` suffix with `JOB` in the System Database name.

### IPC Architecture (Backend ↔ Frontend Communication)

**Three-layer pattern:**

1. **preload.js** - Secure bridge via contextBridge
   - Exposes `window.electronAPI` to renderer
   - Each domain (catalogue, recipes, suppliers, etc.) is a nested object
   - Maps frontend calls to IPC channels

2. **src/ipc-handlers/** - Business logic layer
   - Each file handles one domain (catalogue.js, recipes.js, suppliers.js, etc.)
   - Communicates with database via `src/database/connection.js`
   - Returns structured responses: `{ success: true/false, data/message }`

3. **frontend/src/composables/useElectronAPI.js** - Vue composable
   - Wraps `window.electronAPI` for Vue components
   - Provides type safety and fallback for browser mode
   - Used throughout Vue components as `const api = useElectronAPI()`

**Adding New IPC Endpoints:**
1. Create/update handler in `src/ipc-handlers/[domain].js`
2. Register in `main.js`: `ipcMain.handle('domain:action', handler.function)`
3. Expose in `preload.js`: Add to appropriate domain object
4. Add to `useElectronAPI.js` composable for Vue access

### Frontend Architecture (Vue 3)

**Entry Point:** `frontend/src/main.js`

**Router:** Vue Router with 8 tab-based routes (Catalogue, Recipes, Suppliers, Contacts, Templates, Favourites, Recents, zzTakeoff Web)

**Component Structure:**
```
App.vue (root layout with tabs)
  ├── router-view (tab content)
  │   ├── Catalogue/CatalogueTab_updated.vue
  │   ├── Recipes/RecipesTab_updated.vue
  │   ├── Suppliers/SuppliersTab.vue
  │   ├── Contacts/ContactsTab.vue
  │   ├── Templates/TemplatesTab.vue
  │   ├── Favourites/FavouritesTab.vue
  │   ├── Recents/RecentsTab.vue
  │   └── ZzTakeoff/ZzTakeoffWebTab_Window.vue
  └── Common components:
      ├── common/ColumnManager.vue
      ├── common/SendToZzTakeoffModal.vue
      ├── common/SearchableSelect.vue
      ├── common/SearchableMultiSelect.vue
      ├── Contacts/ContactModal.vue
      ├── Preferences/PreferencesModal.vue
      ├── Templates/JobImportModal.vue
      └── Help/HelpModal.vue
```

**Note on _updated.vue files:** The codebase uses `_updated` versions for Catalogue and Recipes tabs with enhanced column management features (show/hide, reorder, rename, persistence). Check `router/index.js` to see which version is active.

### Database Layer

**src/database/connection.js** - SQL Server connection pool management
- Manages mssql connection pool lifecycle
- `connect(dbConfig)` - Connect with credentials (System Database)
- `testConnection(dbConfig)` - Validate connection and Databuild schema (both System + Job databases)
- `getPool()` - Get active pool for queries
- `getJobDatabaseName(dbConfig)` - Auto-detect or retrieve Job Database name
- `close()` - Close connections on shutdown

**Databuild System Database Tables:**
- `PriceList` - Catalogue items and recipes
- `CostCentres` - Cost centre hierarchy (Tier 1 = main level)
- `Supplier` - Supplier records
- `SupplierGroup` - Supplier categorization
- `Recipe` - Recipe sub-items (ingredients)
- `CCBanks` - Cost centre banks
- `PerCodes` - Unit of measure mappings
- `Contacts` - Contact records with groups
- `Prices` - Price history

**Databuild Job Database Tables:**
- `Bill` - Job line items with quantities and prices
- `Orders` - Job orders with supplier and cost centre sort order
- `OrderDetails` - Order detail descriptions

**Important SQL Query Pattern:**
Use LEFT JOINs starting from PriceList to avoid filtering out items without matching cost centres. The Tier 1 filter should be in the JOIN ON condition, not WHERE clause.

```sql
-- CORRECT
FROM PriceList PL
LEFT JOIN CostCentres CC ON PL.CostCentre = CC.Code AND CC.Tier = 1

-- INCORRECT (filters out items without Tier 1 cost centres)
FROM PriceList PL
INNER JOIN CostCentres CC ON PL.CostCentre = CC.Code
WHERE CC.Tier = 1
```

**Cross-Database Query Pattern (Job Database):**
When querying Job Database tables that need to join with System Database tables, use fully qualified table names:

```sql
SELECT
  b.ItemCode,
  b.CostCentre,
  cc.Name AS CostCentreName,
  b.Quantity,
  pc.Printout AS PerCode
FROM [CROWNEJOB].[dbo].[Bill] b
LEFT JOIN [CROWNESYS].[dbo].[PriceList] pl ON b.ItemCode = pl.PriceCode
LEFT JOIN [CROWNESYS].[dbo].[PerCodes] pc ON pl.PerCode = pc.Code
LEFT JOIN [CROWNESYS].[dbo].[CostCentres] cc ON b.CostCentre = cc.Code AND cc.Tier = 1
WHERE b.JobNo = '1447'
```

### Database Schema Reference

**System Database Name:** Typically `T_Esys` or `[COMPANY]SYS` (e.g., `CROWNESYS`)
**Job Database Name:** Typically `T_EJob` or `[COMPANY]JOB` (e.g., `CROWNEJOB`)

**Core Tables Used in Application:**

#### PriceList (System Database)
Primary table for catalogue items and recipes. Key fields:
- `PriceCode` (PK, nvarchar(30)) - Unique item identifier
- `Description` (nvarchar(120)) - Item description
- `CostCentre` (nvarchar(10)) - Links to CostCentres.Code
- `PerCode` (int) - Links to PerCodes.Code (unit of measure)
- `Recipe` (bit) - 1 if item is a recipe, 0 if standard item
- `RecipeIngredient` (bit) - 1 if item can be used as recipe ingredient
- `Template` (ntext) - Template data for item
- `Specification` (ntext) - Item specifications
- `Master` (bit) - Master item flag
- `Archived` (bit) - Archived status
- `OneOff` (bit) - One-off item flag
- `Hours` (float) - Labor hours
- `Weight` (float) - Item weight

#### CostCentres (System Database)
Hierarchical cost centre structure. Key fields:
- `Code` (PK, nvarchar(10)) - Cost centre code
- `Tier` (PK, nvarchar(8)) - Tier level (1 = main level, 2+ = sub-levels)
- `Name` (nvarchar(32)) - Cost centre name
- `SubGroup` (nvarchar(24)) - Sub-group classification
- `SortOrder` (float) - Display order
- `Master` (bit) - Master cost centre flag
- `Owner` (nvarchar(96)) - Owner/responsible party
- `Markup` (real) - Markup percentage
- `GLAccount` (float) - General ledger account number

**Important:** Always filter for `Tier = 1` to get main cost centres. Use in JOIN condition, not WHERE clause.

#### Recipe (System Database)
Recipe ingredients/sub-items. Key fields:
- `Counter` (PK, int, IDENTITY) - Auto-increment ID
- `Main_Item` (nvarchar(30)) - Parent recipe PriceCode
- `Sub_Item` (nvarchar(30)) - Ingredient PriceCode
- `Quantity` (float) - Quantity of ingredient
- `Formula` (ntext) - Calculation formula for quantity
- `Cost_Centre` (nvarchar(10)) - Override cost centre

**Indexed on:** Main_Item (for efficient recipe expansion)

#### Bill (Job Database)
Job line items with quantities and unit prices. Key fields:
- `JobNo` (nvarchar(10)) - Job number
- `ItemCode` (nvarchar(30)) - Links to PriceList.PriceCode
- `CostCentre` (nvarchar(10)) - Cost centre code
- `BLoad` (int) - Budget load number
- `LineNumber` (int) - Line sequence number
- `Quantity` (float) - Item quantity
- `UnitPrice` (money) - Price per unit
- `XDescription` (ntext) - Extended description (workup)

#### Orders (Job Database)
Job orders with supplier information. Key fields:
- `OrderNumber` (nvarchar(50)) - Format: `JobNo/CostCentre.BLoad`
- `Supplier` (nvarchar(8)) - Supplier code
- `CCSortOrder` (int) - Cost centre sort order

#### OrderDetails (Job Database)
Order detail descriptions. Key fields:
- `Code` (nvarchar(30)) - Item code
- `Description` (nvarchar(120)) - Item description

#### Prices (System Database)
Price history for items. Key fields:
- `Counter` (PK, int, IDENTITY) - Auto-increment ID
- `PriceCode` (nvarchar(30)) - Links to PriceList.PriceCode
- `Price` (money) - Price value
- `Date` (datetime) - Price effective date
- `PriceLevel` (int) - Price level (0 = base, 1+ = alternate levels)

**Indexed on:** PriceCode, Date, PriceLevel

**To get latest price:** Use MAX(Date) grouped by PriceCode and PriceLevel.

#### PerCodes (System Database)
Unit of measure definitions. Key fields:
- `Code` (PK, int) - Unit code
- `Printout` (nvarchar(15)) - Display text (e.g., "m", "m²", "each")
- `Display` (nvarchar(15)) - Alternate display text
- `Divisor` (int) - Divisor for calculations
- `CalculationRoutine` (int) - Calculation method
- `Rounding` (float) - Rounding precision

#### Supplier (System Database)
Supplier/subcontractor records. Key fields:
- `Supplier_Code` (PK, nvarchar(8)) - Supplier unique code
- `SupplierName` (nvarchar(96)) - Supplier name
- `SuppGroup` (int) - Links to SupplierGroup.GroupNumber
- `AccountContact` (nvarchar(32)) - Contact person
- `AccountPhone` (nvarchar(50)) - Phone number
- `AccountEmail` (nvarchar(255)) - Email address
- `AccountAddress` (nvarchar(255)) - Street address
- `AccountCity` (nvarchar(50)) - City
- `AccountState` (nvarchar(20)) - State
- `AccountPostcode` (nvarchar(8)) - Postcode
- `GST` (bit) - GST registered
- `Archived` (bit) - Archived status
- `OSC` (bit) - OSC integration flag

#### SupplierGroup (System Database)
Supplier categorization. Key fields:
- `GroupNumber` (PK, int) - Group ID
- `GroupName` (nvarchar(20)) - Group name
- `Lcolor` (int) - Label color

#### Contacts (System Database)
Contact records. Key fields:
- `Code` (PK, nvarchar(8)) - Contact code
- `Name` (nvarchar(96)) - Contact name
- `Group_` (int) - Links to ContactGroup.Code
- `Contact` (nvarchar(32)) - Contact person
- `Phone` (nvarchar(50)) - Phone number
- `Mobile` (nvarchar(50)) - Mobile number
- `Email` (nvarchar(255)) - Email address
- `Address` (nvarchar(255)) - Street address
- `City` (nvarchar(50)) - City
- `State` (nvarchar(20)) - State
- `Postcode` (nvarchar(8)) - Postcode
- `Supplier` (bit) - Is supplier flag
- `Debtor` (bit) - Is debtor flag
- `Notes` (ntext) - Notes

#### ContactGroup (System Database)
Contact categorization. Key fields:
- `Code` (PK, int) - Group code
- `Name` (nvarchar(20)) - Group name
- `Lcolor` (int) - Label color

#### CCBanks (System Database)
Cost centre banks for budget tracking. Key fields:
- `CCBankCode` (PK, nvarchar(8)) - Bank code
- `CCBankName` (nvarchar(50)) - Bank name
- `IncludeBudgets` (bit) - Include budgets flag
- `IncludeOrders` (bit) - Include orders flag

#### SuppliersPrices (System Database)
Supplier-specific pricing. Key fields:
- `Counter` (PK, int, IDENTITY) - Auto-increment ID
- `Supplier` (nvarchar(9)) - Supplier code
- `ItemCode` (nvarchar(30)) - Item/reference code
- `Reference` (nvarchar(30)) - Supplier's reference
- `Price` (money) - Supplier's price
- `Supp_Date` (datetime) - Price date
- `Area` (nvarchar(24)) - Geographic area
- `PriceLevel` (int) - Price level

**Query Patterns:**

**Get Catalogue with Latest Prices:**
```sql
SELECT
  PL.PriceCode,
  PL.Description,
  PL.CostCentre,
  CC.Name AS CostCentreName,
  CC.SubGroup,
  PC.Printout AS Unit,
  PL.Recipe,
  PL.Template,
  (SELECT TOP 1 Price FROM Prices
   WHERE PriceCode = PL.PriceCode AND PriceLevel = 0
   ORDER BY Date DESC) AS LatestPrice,
  (SELECT TOP 1 Date FROM Prices
   WHERE PriceCode = PL.PriceCode AND PriceLevel = 0
   ORDER BY Date DESC) AS LatestPriceDate
FROM PriceList PL
LEFT JOIN CostCentres CC ON PL.CostCentre = CC.Code AND CC.Tier = 1
LEFT JOIN PerCodes PC ON PL.PerCode = PC.Code
WHERE PL.Archived = 0
ORDER BY ISNULL(CC.SortOrder, 999999), PL.PriceCode
```

**Get Recipe with Sub-Items:**
```sql
SELECT
  R.Main_Item,
  R.Sub_Item,
  R.Quantity,
  R.Formula,
  PL.Description AS SubItemDescription,
  PC.Printout AS Unit,
  PL.CostCentre
FROM Recipe R
INNER JOIN PriceList PL ON R.Sub_Item = PL.PriceCode
LEFT JOIN PerCodes PC ON PL.PerCode = PC.Code
WHERE R.Main_Item = @PriceCode
ORDER BY R.Counter
```

**Get Job Items for Template Import (Cross-Database):**
```sql
WITH OrderDetailsRanked AS (
  SELECT
    Code,
    Description,
    ROW_NUMBER() OVER (PARTITION BY Code ORDER BY (SELECT NULL)) AS RowNum
  FROM [CROWNEJOB].[dbo].[OrderDetails]
)
SELECT
  b.ItemCode,
  b.CostCentre,
  cc.Name AS CostCentreName,
  odr.Description,
  b.XDescription AS Workup,
  b.Quantity,
  pc.Printout AS PerCode,
  b.UnitPrice,
  CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) AS OrderNumber,
  b.LineNumber,
  o.Supplier,
  o.CCSortOrder
FROM [CROWNEJOB].[dbo].[Bill] b
LEFT JOIN [CROWNEJOB].[dbo].[Orders] o ON CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) = o.OrderNumber
LEFT JOIN OrderDetailsRanked odr ON b.ItemCode = odr.Code AND odr.RowNum = 1
LEFT JOIN [CROWNESYS].[dbo].[PriceList] pl ON b.ItemCode = pl.PriceCode
LEFT JOIN [CROWNESYS].[dbo].[PerCodes] pc ON pl.PerCode = pc.Code
LEFT JOIN [CROWNESYS].[dbo].[CostCentres] cc ON b.CostCentre = cc.Code AND cc.Tier = 1
WHERE b.JobNo = '1447'
ORDER BY o.CCSortOrder, b.CostCentre, b.LineNumber
```

### Persistent Storage (electron-store)

**Two types of storage:**

1. **App-level config** - Managed in main.js via `new Store()`
   - `dbConfig` - Database credentials and connection settings
   - Stored in `~\AppData\Roaming\dbx-connector-vue\config.json`

2. **Feature-level stores** - Managed in src/database/*-store.js
   - `history-db.json` - History of items sent to zzTakeoff
   - `preferences.json` - User preferences (theme, defaults, zzType mappings)
   - `templates.json` - Saved templates
   - `favourites.json` - Favorited items
   - `recents.json` - Recently viewed items
   - `column-states.json` - Column configuration per tab (width, order, visibility, aliases)
   - `column-names.json` - Custom column name mappings
   - `filter-state.json` - Filter states per tab
   - `zztype-store.json` - zzTakeoff type mappings

Each store has:
- Database layer: `src/database/[feature]-store.js`
- IPC handlers: `src/ipc-handlers/[feature]-store.js`
- Frontend access: via `useElectronAPI()` composable

### AG Grid Integration

**Column Management Features** (in _updated.vue tabs):
- Show/hide columns via built-in column panel
- Reorder via drag-and-drop headers
- Resize by dragging column edges
- Rename (alias) via custom modal
- State persisted per-tab in electron-store

**IMPORTANT - Column State Persistence:**
ANY change made in the Column Selector (Column Management Modal) MUST persist by saving to electron-store, as implemented on Catalogue and Recipe tabs. This includes:
- Column visibility (show/hide)
- Column order (reordering)
- Column pinning (pin left/right/none)
- Column width
- Column aliases (custom names)

All changes should be automatically saved to `column-states.json` via the `column-states` IPC handlers and restored on tab load.

**Dark Mode Support:**
AG Grid uses `ag-theme-quartz` or `ag-theme-quartz-dark` class based on theme state provided by App.vue.

### Theme System

Managed in App.vue with CSS custom properties:
- Theme state stored in preferences store
- Provided to all child components via Vue `provide/inject`
- Toggle button in app header
- `data-theme="light"` or `data-theme="dark"` attribute on root element

## Common Development Tasks

### Fixing Data Population Issues

If columns aren't populating:
1. Check SQL query in `src/ipc-handlers/[domain].js`
2. Verify using LEFT JOIN from PriceList (not INNER JOIN from CostCentres)
3. Ensure Tier filtering is in JOIN condition: `ON ... AND CC.Tier = 1`
4. Check for ISNULL() wrapping in ORDER BY clauses to handle NULLs

### Adding Column State Persistence to a Tab

If not already integrated, follow these steps:
1. Import columnStates handlers in main.js
2. Register IPC handlers in main.js
3. Add columnStates methods to preload.js
4. Add columnStates to useElectronAPI.js
5. Use columnStates API in Vue component to save/restore state

See `INTEGRATION_STEPS.md` for detailed integration instructions.

### External API Integration (zzTakeoff)

External HTTPS calls are proxied through the main process:
- Frontend calls `api.external.sendToZzTakeoff(data)`
- Main process uses axios to make actual HTTPS request
- This avoids CORS and provides centralized error handling

**Generic HTTP proxy:**
`api.external.httpRequest(config)` accepts axios-compatible config for any external API.

**Important:** When sending properties to zzTakeoff, they must always be in lowercase.

### Working with Job Database (Phase 2)

When implementing features that need to query the Job Database:

1. **Get the Job Database name:**
   ```javascript
   const { getJobDatabaseName } = require('./src/database/connection');
   const jobDbName = getJobDatabaseName(dbConfig);
   ```

2. **Use fully qualified table names in queries:**
   ```sql
   SELECT * FROM [${jobDbName}].[dbo].[Bill]
   ```

3. **Join across databases:**
   ```sql
   FROM [${jobDbName}].[dbo].[Bill] b
   LEFT JOIN [${systemDbName}].[dbo].[PriceList] pl ON b.ItemCode = pl.PriceCode
   ```

4. **Handle Job Database unavailability:**
   The Job Database is optional. Always check if it's available before querying:
   ```javascript
   if (!jobDbName) {
     return { success: false, message: 'Job Database not configured' };
   }
   ```

## File Locations

### Backend (Electron Main Process)
- `main.js` - Electron entry point, window management, IPC registration
- `preload.js` - Context bridge exposing IPC to renderer
- `settings.html` - Database settings window (vanilla HTML/JS)
- `src/database/connection.js` - SQL Server pool management
- `src/database/*-store.js` - electron-store persistence layers
- `src/ipc-handlers/*.js` - IPC handler implementations

### Frontend (Vue)
- `frontend/src/main.js` - Vue app entry point
- `frontend/src/App.vue` - Root layout with tabs
- `frontend/src/router/index.js` - Route definitions
- `frontend/src/composables/useElectronAPI.js` - IPC access composable
- `frontend/src/composables/useColumnNames.js` - Column name management
- `frontend/src/components/**/*.vue` - Tab and modal components
- `frontend/vite.config.js` - Vite configuration
- `frontend/package.json` - Frontend dependencies

### Configuration
- `package.json` - Main project dependencies and Electron builder config
- `.claude.json` - Claude Code MCP server configurations (local scope)

## Important Notes

### Security
- Main window uses `contextIsolation: true` and `nodeIntegration: false`
- Settings window uses `nodeIntegration: true` (less secure, but isolated)
- Always use IPC for database operations, never expose SQL directly to renderer

### Database Connection
- Connection is tested on startup and before settings save
- Failed connections show error dialog and reopen settings window
- Connection pool is shared across all IPC handlers via `getPool()`
- Connection closed gracefully on `before-quit` event
- Old Phase 1 configs are automatically migrated to Phase 2 on startup

### Windows-Specific
- Uses NSIS installer for Windows distribution
- Icon: `assets/icon.ico`
- Builds to `dist/` directory
- Uses `cmd /c` wrapper for npx commands in MCP server configs

### Development Notes
- Vite dev server must be running on port 5173 for development mode
- DevTools automatically open in development mode
- App menu includes shortcuts: Ctrl+, (settings), Ctrl+R (reload), F12 (DevTools)
- Application name in UI: "DBx Connector Vue"
- Product name: "DBx Connector Vue" (Vue.js + AG Grid Edition)

### zzTakeoff Integration
- Default zzTakeoff types: `area`, `linear`, `segment`, `count`
- Properties sent to zzTakeoff must be in lowercase
- zzTakeoff quantity logic: Items with quantity of 1 are set as "Part", otherwise use default takeoff type from preferences
