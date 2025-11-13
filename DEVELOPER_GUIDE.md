# DBx Connector Vue - Developer Guide

**Version:** 1.3.10
**Last Updated:** January 2025

---

## Welcome!

Welcome to DBx Connector Vue development! This guide will help you get started, understand the codebase architecture, and contribute effectively. Whether you're fixing bugs, adding features, or just exploring, this guide has you covered.

**Expected Learning Time:**
- Quick Start: 30 minutes
- Full Understanding: 2-3 days

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Architecture](#project-architecture)
3. [Development Workflow](#development-workflow)
4. [Common Development Tasks](#common-development-tasks)
5. [Code Style & Standards](#code-style--standards)
6. [Debugging & Troubleshooting](#debugging--troubleshooting)
7. [Performance Optimization](#performance-optimization)
8. [Security Considerations](#security-considerations)
9. [Testing Guidelines](#testing-guidelines)
10. [Deployment & Releases](#deployment--releases)

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and npm
- **SQL Server** (Express, Standard, or Enterprise)
- **Databuild database** with test data
- **Git** for version control
- **Visual Studio Code** (recommended IDE)

### Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/samromeo1961/Databuild-API-Vue.git
cd Databuild-API-Vue

# 2. Install main dependencies
npm install

# 3. Install frontend dependencies
cd frontend
npm install
cd ..

# 4. Configure database connection
# On first run, the app will open a settings window
npm run dev
```

### Project Structure Overview

```
Databuild-API-Vue/
├── main.js                     # Electron main process (backend)
├── preload.js                  # IPC bridge (security layer)
├── settings.html               # Database settings window
├── src/
│   ├── database/               # Database connection & stores
│   │   ├── connection.js       # SQL Server pool management
│   │   ├── credentials-store.js
│   │   ├── preferences-store.js
│   │   └── *-store.js          # electron-store persistence layers
│   └── ipc-handlers/           # Backend business logic
│       ├── catalogue.js        # Catalogue operations
│       ├── recipes.js          # Recipe operations
│       ├── suppliers.js        # Supplier operations
│       ├── contacts.js         # Contact operations
│       └── ...                 # More handlers
├── frontend/
│   ├── src/
│   │   ├── main.js             # Vue app entry point
│   │   ├── App.vue             # Root component with tabs
│   │   ├── router/             # Vue Router configuration
│   │   │   └── index.js        # Route definitions
│   │   ├── components/         # Vue components
│   │   │   ├── Catalogue/
│   │   │   │   └── CatalogueTab_updated.vue
│   │   │   ├── Recipes/
│   │   │   │   └── RecipesTab_updated.vue
│   │   │   ├── Suppliers/
│   │   │   ├── Contacts/
│   │   │   ├── Templates/
│   │   │   ├── ZzTakeoff/
│   │   │   ├── Preferences/
│   │   │   ├── common/         # Shared components
│   │   │   └── Help/
│   │   ├── composables/        # Vue composition functions
│   │   │   ├── useElectronAPI.js  # IPC wrapper
│   │   │   └── useColumnNames.js  # Column name utilities
│   │   └── assets/             # CSS, images, icons
│   ├── dist/                   # Built frontend (git-ignored)
│   ├── vite.config.js          # Vite configuration
│   └── package.json            # Frontend dependencies
├── assets/
│   ├── icon.ico                # Windows app icon
│   └── icon.png                # PNG icon
├── dist/                       # Build output (git-ignored)
├── node_modules/               # Dependencies (git-ignored)
├── package.json                # Main project config
├── CLAUDE.md                   # AI assistant context
├── API_REFERENCE.md            # IPC API documentation
├── USER_SETUP_GUIDE.md         # End-user setup guide
└── README.md                   # Project overview
```

---

## Project Architecture

### Architecture Overview

DBx Connector Vue uses a **multi-process architecture** (Electron standard):

```
┌─────────────────────────────────────────────────────────┐
│                    Main Process (Node.js)                │
│  main.js - Window management, IPC registration          │
│  src/database/connection.js - SQL Server pool            │
│  src/ipc-handlers/*.js - Business logic                 │
│  electron-store - Local JSON persistence                │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ IPC (contextBridge)
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Renderer Process (Chromium)              │
│  Vue 3 App - frontend/src/                              │
│  AG Grid - Data grids                                   │
│  Bootstrap 5 - UI framework                             │
│  Vite - Dev server & bundler                            │
└──────────────────────────────────────────────────────────┘
                      │
                      │ HTTP/HTTPS
                      │
┌─────────────────────▼───────────────────────────────────┐
│              External Services                           │
│  SQL Server (Databuild database)                        │
│  zzTakeoff.com (external API)                           │
└──────────────────────────────────────────────────────────┘
```

### Communication Flow

#### 1. Frontend to Backend (IPC)

```
Vue Component Method
    ↓
useElectronAPI() composable
    ↓
window.electronAPI.catalogue.getItems(params)
    ↓
preload.js - contextBridge
    ↓
ipcMain.handle('catalogue:get-items')
    ↓
src/ipc-handlers/catalogue.js - getCatalogueItems()
    ↓
src/database/connection.js - getPool()
    ↓
SQL Server - Execute query
    ↓
Return response { success, data, total }
    ↓
Frontend receives result
```

**Example:**

```javascript
// Frontend: components/Catalogue/CatalogueTab_updated.vue
const api = useElectronAPI();

const loadData = async () => {
  const result = await api.catalogue.getItems({
    searchTerm: 'concrete',
    limit: 50
  });

  if (result.success) {
    items.value = result.data;
  }
};
```

```javascript
// Backend: src/ipc-handlers/catalogue.js
async function getCatalogueItems(event, params) {
  const pool = getPool();
  const result = await pool.request()
    .input('searchTerm', `%${params.searchTerm}%`)
    .query(`SELECT * FROM PriceList WHERE Description LIKE @searchTerm`);

  return {
    success: true,
    data: result.recordset,
    total: result.recordset.length
  };
}
```

#### 2. Backend to SQL Server

```javascript
// src/database/connection.js
const sql = require('mssql');

let dbPool = null;

async function connect(dbConfig) {
  const sqlConfig = {
    user: dbConfig.user,
    password: dbConfig.password,
    server: dbConfig.server,
    database: dbConfig.database,
    options: {
      encrypt: true,
      trustServerCertificate: true
    }
  };

  dbPool = await sql.connect(sqlConfig);
  return dbPool;
}
```

#### 3. External API Calls (zzTakeoff)

```javascript
// Frontend calls backend
await api.zzTakeoffWindow.executeJavaScript(`
  startTakeoffWithProperties({
    type: 'area',
    properties: { name: { value: 'Concrete' } }
  });
`);

// Backend proxies to zzTakeoff window
ipcMain.handle('zztakeoff-window:execute-js', async (event, code) => {
  return await zzTakeoffWindow.webContents.executeJavaScript(code);
});
```

### Key Technologies

#### Backend (Electron Main Process)

| Technology | Purpose | Version |
|------------|---------|---------|
| Electron | Desktop framework | Latest |
| Node.js | JavaScript runtime | 18+ |
| mssql | SQL Server driver | Latest |
| electron-store | Local persistence | Latest |
| axios | HTTP client | Latest |

#### Frontend (Renderer Process)

| Technology | Purpose | Version |
|------------|---------|---------|
| Vue 3 | UI framework | Latest |
| Vue Router | Routing | 4.x |
| AG Grid Community | Data grids | Latest |
| Bootstrap 5 | UI components | 5.3+ |
| Bootstrap Icons | Icons | Latest |
| Vite | Build tool | Latest |

---

## Development Workflow

### Starting Development

```bash
# Option 1: Start full app in dev mode (recommended)
npm run dev

# Option 2: Start with Chrome DevTools MCP (for Claude Code debugging)
npm run dev:chrome

# Option 3: Start frontend only
npm run dev:frontend
```

### Development Mode Features

- **Hot Reload**: Frontend auto-reloads on file changes (Vite HMR)
- **DevTools**: Opens automatically in dev mode (`Ctrl+Shift+I` or `F12`)
- **Source Maps**: Full source maps for debugging
- **Console Logging**: All console.log statements visible
- **Network Tab**: Monitor IPC calls and external requests

### Making Changes

1. **Edit files** - Use VSCode or your preferred editor
2. **Save** - Changes auto-reload (frontend) or require restart (backend)
3. **Test** - Verify changes in the running app
4. **Commit** - Use conventional commit messages

```bash
# Make changes
code frontend/src/components/Catalogue/CatalogueTab_updated.vue

# Test changes (auto-reloads if frontend)
# If backend changes, restart: Ctrl+C then npm run dev

# Commit with conventional commit format
git add .
git commit -m "feat(catalogue): add export to PDF feature"
```

### Building for Production

```bash
# Build frontend and create installer
npm run build

# Output: dist/DBx Connector Vue Setup X.X.X.exe
```

**Build Process:**
1. `npm run build-frontend` - Vite builds Vue app to `frontend/dist/`
2. `npm run dist` - Electron Builder creates Windows installer
3. Output in `dist/` folder

---

## Common Development Tasks

### Task 1: Adding a New Tab

**Goal:** Add a "Projects" tab

**Steps:**

#### 1. Create Vue Component

```bash
# Create directory
mkdir frontend/src/components/Projects

# Create component file
touch frontend/src/components/Projects/ProjectsTab.vue
```

```vue
<!-- frontend/src/components/Projects/ProjectsTab.vue -->
<template>
  <div class="projects-tab">
    <h2>Projects</h2>
    <ag-grid-vue
      :columnDefs="columnDefs"
      :rowData="projects"
      @grid-ready="onGridReady"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '../../composables/useElectronAPI';

const api = useElectronAPI();
const projects = ref([]);
const columnDefs = ref([
  { field: 'id', headerName: 'Project ID' },
  { field: 'name', headerName: 'Project Name' },
  { field: 'status', headerName: 'Status' }
]);

const loadProjects = async () => {
  const result = await api.projects.getList();
  if (result.success) {
    projects.value = result.data;
  }
};

onMounted(() => {
  loadProjects();
});
</script>

<style scoped>
.projects-tab {
  padding: 1rem;
}
</style>
```

#### 2. Add Route

```javascript
// frontend/src/router/index.js
import ProjectsTab from '../components/Projects/ProjectsTab.vue';

const routes = [
  // ... existing routes
  {
    path: '/projects',
    name: 'Projects',
    component: ProjectsTab
  }
];
```

#### 3. Add Navigation Link

```vue
<!-- frontend/src/App.vue -->
<template>
  <div id="app">
    <nav class="navbar">
      <router-link to="/catalogue">Catalogue</router-link>
      <router-link to="/recipes">Recipes</router-link>
      <router-link to="/projects">Projects</router-link> <!-- NEW -->
      <!-- ... other links -->
    </nav>
    <router-view/>
  </div>
</template>
```

#### 4. Create IPC Handler

```javascript
// src/ipc-handlers/projects.js
const { getPool } = require('../database/connection');

async function getProjects(event, params) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const result = await pool.request().query(`
      SELECT id, name, status
      FROM Projects
      WHERE archived = 0
      ORDER BY name
    `);

    return {
      success: true,
      data: result.recordset
    };
  } catch (err) {
    console.error('Error fetching projects:', err);
    return {
      success: false,
      error: 'Failed to fetch projects',
      message: err.message
    };
  }
}

module.exports = {
  getProjects
};
```

#### 5. Register IPC Handler

```javascript
// main.js
const projectsHandlers = require('./src/ipc-handlers/projects');

// ... in app.whenReady()
ipcMain.handle('projects:get-list', projectsHandlers.getProjects);
```

#### 6. Expose in Preload

```javascript
// preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing APIs
  projects: {
    getList: (params) => ipcRenderer.invoke('projects:get-list', params)
  }
});
```

#### 7. Add to useElectronAPI Composable

```javascript
// frontend/src/composables/useElectronAPI.js
export function useElectronAPI() {
  return {
    // ... existing APIs
    projects: {
      getList: (params) => window.electronAPI?.projects.getList(params)
    }
  };
}
```

#### 8. Add Keyboard Shortcut (Optional)

```javascript
// main.js - in menu template
{
  label: 'Tabs',
  submenu: [
    // ... existing shortcuts
    {
      label: 'Projects',
      accelerator: 'Ctrl+9',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('navigate-to', '/projects');
        }
      }
    }
  ]
}
```

**Done!** Your new tab is fully integrated.

---

### Task 2: Adding a New IPC Endpoint

**Goal:** Add endpoint to archive a project

**Steps:**

#### 1. Add Handler Function

```javascript
// src/ipc-handlers/projects.js
async function archiveProject(event, params) {
  try {
    const { projectId, archived } = params;
    const pool = getPool();

    await pool.request()
      .input('id', projectId)
      .input('archived', archived ? 1 : 0)
      .query(`UPDATE Projects SET archived = @archived WHERE id = @id`);

    return {
      success: true,
      message: `Project ${archived ? 'archived' : 'unarchived'} successfully`
    };
  } catch (err) {
    return {
      success: false,
      error: 'Archive operation failed',
      message: err.message
    };
  }
}

module.exports = {
  getProjects,
  archiveProject  // Export new function
};
```

#### 2. Register Handler

```javascript
// main.js
ipcMain.handle('projects:archive', projectsHandlers.archiveProject);
```

#### 3. Expose in Preload

```javascript
// preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  projects: {
    getList: (params) => ipcRenderer.invoke('projects:get-list', params),
    archive: (params) => ipcRenderer.invoke('projects:archive', params)  // NEW
  }
});
```

#### 4. Add to Composable

```javascript
// frontend/src/composables/useElectronAPI.js
projects: {
  getList: (params) => window.electronAPI?.projects.getList(params),
  archive: (params) => window.electronAPI?.projects.archive(params)  // NEW
}
```

#### 5. Use in Component

```javascript
// frontend/src/components/Projects/ProjectsTab.vue
const handleArchive = async (projectId) => {
  const result = await api.projects.archive({
    projectId,
    archived: true
  });

  if (result.success) {
    console.log(result.message);
    loadProjects();  // Reload data
  }
};
```

---

### Task 3: Adding Column Management to a Tab

**Goal:** Add full column management (show/hide, reorder, rename, pin) to your tab

**Reference:** See `CatalogueTab_updated.vue` or `RecipesTab_updated.vue` for complete implementations

**Quick Steps:**

1. **Import Column States API:**
   ```javascript
   const api = useElectronAPI();
   ```

2. **Load Saved State on Mount:**
   ```javascript
   onMounted(async () => {
     const result = await api.columnStates.get('your-tab-name');
     if (result.success && result.data?.columnState) {
       const state = JSON.parse(result.data.columnState);
       gridApi.value.applyColumnState({ state, applyOrder: true });
     }
   });
   ```

3. **Save State on Changes:**
   ```javascript
   const saveColumnState = async () => {
     if (!gridApi.value) return;

     const state = gridApi.value.getColumnState();
     await api.columnStates.save({
       tabName: 'your-tab-name',
       columnState: JSON.stringify(state)
     });
   };

   // Call saveColumnState() after:
   // - Column visibility change
   // - Column reorder
   // - Column resize
   // - Column rename
   // - Column pin
   ```

4. **Add Column Management Modal:**
   See `frontend/src/components/common/ColumnManager.vue` for a reusable component.

**Detailed Guide:** See `INTEGRATION_STEPS.md` for complete column management integration.

---

### Task 4: Adding a New Database Query

**Goal:** Fetch supplier contacts with phone numbers

```javascript
// src/ipc-handlers/suppliers.js
async function getSupplierContacts(event, params) {
  try {
    const { supplierId } = params;
    const pool = getPool();

    const result = await pool.request()
      .input('supplierId', supplierId)
      .query(`
        SELECT
          C.Name,
          C.Contact,
          C.Phone,
          C.Mobile,
          C.Email
        FROM Contacts C
        WHERE C.Supplier = 1
        AND C.Code = @supplierId
        ORDER BY C.Name
      `);

    return {
      success: true,
      data: result.recordset
    };
  } catch (err) {
    console.error('Error fetching supplier contacts:', err);
    return {
      success: false,
      error: 'Failed to fetch supplier contacts',
      message: err.message
    };
  }
}
```

**Best Practices for SQL Queries:**

1. **Use Parameterized Queries** (prevents SQL injection):
   ```javascript
   // GOOD
   .input('search', `%${search}%`)
   .query(`SELECT * FROM Suppliers WHERE Name LIKE @search`)

   // BAD
   .query(`SELECT * FROM Suppliers WHERE Name LIKE '%${search}%'`)
   ```

2. **Use LEFT JOIN for Optional Relations:**
   ```sql
   SELECT PL.*, CC.Name AS CostCentreName
   FROM PriceList PL
   LEFT JOIN CostCentres CC ON PL.CostCentre = CC.Code AND CC.Tier = 1
   -- NOT: INNER JOIN (would filter out items without cost centres)
   ```

3. **Handle NULL values:**
   ```sql
   ORDER BY ISNULL(CC.SortOrder, 999999), PL.PriceCode
   ```

4. **Limit Results:**
   ```sql
   SELECT TOP 1000 *  -- Or use OFFSET/FETCH NEXT for pagination
   FROM PriceList
   ```

---

### Task 5: Adding External API Integration

**Goal:** Call an external REST API

```javascript
// Frontend
const result = await api.external.httpRequest({
  method: 'POST',
  url: 'https://api.example.com/submit',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  data: {
    itemId: '123',
    quantity: 5
  }
});

if (result.success) {
  console.log('Response:', result.data);
}
```

**Backend (already implemented in `src/ipc-handlers/external-api.js`):**
- Proxies HTTP requests through main process
- Avoids CORS issues
- Centralizes error handling
- Provides timeout control

---

## Code Style & Standards

### JavaScript/Vue Style

**Use Composition API (Vue 3):**
```javascript
// GOOD
import { ref, computed, onMounted } from 'vue';

export default {
  setup() {
    const count = ref(0);
    const doubleCount = computed(() => count.value * 2);

    onMounted(() => {
      console.log('Component mounted');
    });

    return { count, doubleCount };
  }
};
```

**Use async/await:**
```javascript
// GOOD
const loadData = async () => {
  try {
    const result = await api.catalogue.getItems();
    items.value = result.data;
  } catch (error) {
    console.error('Error:', error);
  }
};

// BAD
const loadData = () => {
  api.catalogue.getItems().then(result => {
    items.value = result.data;
  }).catch(error => {
    console.error('Error:', error);
  });
};
```

### JSDoc Comments

**Add JSDoc to all functions:**

```javascript
/**
 * Load catalogue data from the database with filtering
 * Fetches all items matching search criteria and applies zzType resolution
 * @param {boolean} resetPage - If true, resets pagination to first page
 * @async
 * @returns {Promise<void>}
 */
const loadData = async (resetPage = false) => {
  // Implementation
};
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `const itemCount = 10;` |
| Constants | UPPER_SNAKE_CASE | `const MAX_ITEMS = 1000;` |
| Functions | camelCase | `function loadData() {}` |
| Components | PascalCase | `CatalogueTab.vue` |
| Files | kebab-case or PascalCase | `catalogue-tab.vue` or `CatalogueTab.vue` |
| IPC Channels | kebab-case with colon | `'catalogue:get-items'` |

### Error Handling

**Always return structured responses:**

```javascript
// IPC Handler
try {
  const result = await pool.request().query('SELECT ...');

  return {
    success: true,
    data: result.recordset,
    total: result.recordset.length
  };
} catch (error) {
  console.error('Error:', error);

  return {
    success: false,
    error: 'Operation failed',
    message: error.message
  };
}
```

**Frontend error handling:**

```javascript
const result = await api.catalogue.getItems();

if (!result.success) {
  console.error('Error:', result.error, result.message);
  showNotification(result.message, 'error');
  return;
}

// Process successful result
items.value = result.data;
```

### File Organization

**Group related code:**
```
components/
  Catalogue/
    CatalogueTab.vue
    CatalogueModal.vue
    CatalogueHelpers.js
  Recipes/
    RecipesTab.vue
    RecipeModal.vue
```

**Keep files focused:**
- One component per file
- Max 500 lines per file (split if longer)
- Separate business logic from UI

---

## Debugging & Troubleshooting

### Frontend Debugging

**Chrome DevTools:**
- Press `F12` or `Ctrl+Shift+I` to open DevTools
- Use Sources tab to set breakpoints
- Use Console tab to view logs
- Use Network tab to monitor IPC calls

**Vue DevTools:**
- Install Vue DevTools browser extension
- Inspect component state and props
- Monitor Vuex/Pinia stores
- Track component hierarchy

**Console Logging:**
```javascript
console.log('[Catalogue] Loading items with filters:', params);
console.error('[Catalogue] Failed to load:', error);
console.warn('[Catalogue] No items found');
```

### Backend Debugging

**Console Logging:**
```javascript
console.log('✓ Database connected successfully');
console.error('✗ Database connection failed:', error.message);
console.log('[IPC] catalogue:get-items called with:', params);
```

**Node.js Debugging:**
```bash
# Start with Node debugger
node --inspect-brk main.js

# Then attach Chrome DevTools to Node process
# Open chrome://inspect in Chrome
```

### Common Issues

#### Issue: IPC Handler Not Found

**Symptom:** `Cannot read property 'X' of undefined`

**Cause:** Method not properly registered

**Solution:**
1. Check `preload.js` - is method exposed via contextBridge?
2. Check `main.js` - is handler registered with ipcMain.handle()?
3. Check `useElectronAPI.js` - is wrapper method present?

#### Issue: Database Connection Lost

**Symptom:** `Database connection not available`

**Solution:**
```javascript
// Test connection
const result = await api.db.testConnection(dbConfig);

// If failed, reconnect
if (!result.success) {
  await api.db.saveConnection(dbConfig);
  // Restart app
}
```

#### Issue: AG Grid Not Updating

**Symptom:** Grid shows stale data after update

**Solution:**
```javascript
// Option 1: Refresh data
gridApi.value.setGridOption('rowData', newData);

// Option 2: Transaction update
gridApi.value.applyTransaction({
  update: [updatedRow]
});

// Option 3: Full refresh
gridApi.value.refreshCells({ force: true });
```

---

## Performance Optimization

### Database Query Optimization

**Use Pagination:**
```javascript
const params = {
  limit: 100,
  offset: page * 100
};
```

**Use Indexes:**
```sql
-- Ensure indexes exist on frequently queried columns
CREATE INDEX IX_PriceList_CostCentre ON PriceList(CostCentre);
CREATE INDEX IX_PriceList_Description ON PriceList(Description);
```

**Avoid SELECT *:**
```sql
-- GOOD
SELECT PriceCode, Description, Unit, LatestPrice
FROM PriceList

-- BAD
SELECT *
FROM PriceList
```

### Frontend Performance

**Debounce Search Input:**
```javascript
let searchDebounce = null;

const onSearchChange = () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    loadData();
  }, 500);  // Wait 500ms after user stops typing
};
```

**Virtual Scrolling (AG Grid):**
```javascript
// Enabled by default in AG Grid
// Renders only visible rows
```

**Lazy Load Sub-Items:**
```javascript
// Don't load all recipe sub-items upfront
// Load on expand
const toggleExpand = async (priceCode) => {
  if (!subItemsCache.has(priceCode)) {
    const result = await api.recipes.getSubItems(priceCode);
    subItemsCache.set(priceCode, result.data);
  }
};
```

---

## Security Considerations

### Input Validation

**Always validate user input:**
```javascript
// Backend validation
if (!priceCode || typeof priceCode !== 'string') {
  return {
    success: false,
    error: 'Invalid priceCode parameter'
  };
}

// Frontend validation
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

### SQL Injection Prevention

**Use parameterized queries:**
```javascript
// GOOD
await pool.request()
  .input('search', search)
  .query('SELECT * FROM Suppliers WHERE Name LIKE @search');

// BAD
await pool.request()
  .query(`SELECT * FROM Suppliers WHERE Name LIKE '${search}'`);
```

### Sensitive Data

**Don't log passwords or tokens:**
```javascript
// GOOD
console.log('User logged in:', { username: user.name });

// BAD
console.log('User logged in:', { username: user.name, password: user.password });
```

**Encrypt stored credentials:**
```javascript
// electron-store automatically encrypts sensitive data
store.set('dbConfig', {
  server: 'localhost',
  user: 'dbx_user',
  password: 'encrypted_by_electron_store'
});
```

---

## Testing Guidelines

> **Note:** Testing framework not yet implemented. This section outlines future testing strategy.

### Unit Testing (Future)

**Recommended:** Jest or Vitest

```javascript
// tests/ipc-handlers/catalogue.test.js
describe('getCatalogueItems', () => {
  it('should return items with search filter', async () => {
    const result = await getCatalogueItems(null, {
      searchTerm: 'concrete',
      limit: 10
    });

    expect(result.success).toBe(true);
    expect(result.data.length).toBeLessThanOrEqual(10);
  });
});
```

### Integration Testing (Future)

**Recommended:** Playwright or Spectron

```javascript
// tests/e2e/catalogue.test.js
test('should load catalogue items', async () => {
  await page.goto('http://localhost:5173/catalogue');
  await page.fill('[data-testid="search-input"]', 'concrete');
  await page.waitForSelector('.ag-row');

  const rows = await page.locator('.ag-row').count();
  expect(rows).toBeGreaterThan(0);
});
```

### Manual Testing Checklist

Before releasing:
- [ ] Test all tabs load correctly
- [ ] Test search and filters work
- [ ] Test pagination
- [ ] Test editing (inline and modal)
- [ ] Test zzTakeoff integration
- [ ] Test column management
- [ ] Test dark mode toggle
- [ ] Test database connection settings
- [ ] Test error handling (disconnect DB)
- [ ] Test with large datasets (1000+ items)

---

## Deployment & Releases

### Version Numbering

**Semantic Versioning:** MAJOR.MINOR.PATCH

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

**Current Version:** 1.3.10

### Creating a Release

```bash
# 1. Update version in package.json
npm version patch  # or minor/major

# 2. Update version in frontend/package.json
cd frontend
npm version patch
cd ..

# 3. Build
npm run build

# 4. Test installer
cd dist
# Run "DBx Connector Vue Setup 1.3.10.exe"

# 5. Commit and tag
git add .
git commit -m "Release v1.3.10"
git tag v1.3.10
git push origin master
git push origin v1.3.10

# 6. Create GitHub Release
# Go to GitHub → Releases → Draft new release
# Upload installer exe file
```

### Distribution

**Methods:**
1. **GitHub Releases** - Attach installer to release
2. **Direct Download** - Host on web server
3. **Network Share** - Company file server
4. **Auto-Update** (Future) - Electron auto-updater

---

## Resources

### Documentation

- [API Reference](API_REFERENCE.md) - Complete IPC API documentation
- [User Setup Guide](USER_SETUP_GUIDE.md) - End-user installation guide
- [CLAUDE.md](CLAUDE.md) - AI assistant context
- [README.md](README.md) - Project overview

### External Links

- [Electron Documentation](https://www.electronjs.org/docs)
- [Vue 3 Documentation](https://vuejs.org/)
- [AG Grid Documentation](https://www.ag-grid.com/vue-data-grid/)
- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.3/)
- [mssql (node-mssql) Documentation](https://github.com/tediousjs/node-mssql)

### Tools

- [Vue DevTools](https://devtools.vuejs.org/)
- [Electron DevTools](https://www.electronjs.org/docs/latest/tutorial/devtools-extension)
- [Postman](https://www.postman.com/) - For testing external APIs

---

## Support & Community

### Getting Help

1. **Check Documentation** - README, API Reference, this guide
2. **Search Issues** - [GitHub Issues](https://github.com/samromeo1961/Databuild-API-Vue/issues)
3. **Ask Questions** - Open a new issue or discussion
4. **Contact Maintainers** - Email or Slack

### Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Quick Contribution Guide:**

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes and add tests
4. Commit: `git commit -m "feat: add my feature"`
5. Push: `git push origin feature/my-feature`
6. Open Pull Request on GitHub

---

## Appendix

### Useful Commands

```bash
# Development
npm run dev                   # Start dev mode
npm run dev:frontend          # Frontend only
npm run dev:chrome            # With Chrome DevTools MCP

# Build
npm run build                 # Full build + installer
npm run build-frontend        # Frontend only
npm run dist                  # Electron builder only

# Maintenance
npm install                   # Install/update dependencies
npm audit fix                 # Fix security vulnerabilities
npm outdated                  # Check for outdated packages

# Git
git status                    # Check status
git log --oneline -10         # View recent commits
git tag -l                    # List tags
git checkout -b feature/xyz   # Create feature branch
```

### VSCode Extensions (Recommended)

- **Vue - Official** - Vue 3 support
- **ESLint** - JavaScript linting
- **Prettier** - Code formatting
- **Path Intellisense** - Autocomplete paths
- **Auto Rename Tag** - Rename HTML tags
- **GitLens** - Git superpowers

### VSCode Settings (Recommended)

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "javascript.updateImportsOnFileMove.enabled": "always",
  "vue.autoInsert.dotValue": true
}
```

---

**Happy Coding!** 🚀

If you have questions or suggestions for improving this guide, please open an issue or pull request.

---

**Last Updated:** January 2025
**Guide Version:** 1.0
**Project Version:** 1.3.10
