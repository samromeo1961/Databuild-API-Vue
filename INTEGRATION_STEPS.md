# Integration Steps for Recipes Tab Column Management

## Overview
I've created the RecipesTab_updated.vue with all required columns and column management features (show/hide, reorder, rename/alias) with persistence in electron-store. The backend infrastructure is also created.

## Files Created
1. ✅ `frontend/src/components/Recipes/RecipesTab_updated.vue` - Enhanced Recipes tab with all required columns
2. ✅ `src/database/column-states.js` - Database layer for column state persistence
3. ✅ `src/ipc-handlers/column-states.js` - IPC handlers for column states

## Required Integration Steps

### 1. Update main.js (C:/Users/User/OneDrive/Desktop/Databuild-API-Vue/main.js)

**Add import after line 20:**
```javascript
const columnStatesHandlers = require('./src/ipc-handlers/column-states');
```

**Add IPC handler registrations after line 296 (after preferences-store handlers):**
```javascript
// ============================================================
// IPC Handlers for Column States (Persistent)
// ============================================================

ipcMain.handle('column-states:get', columnStatesHandlers.handleGetColumnState);
ipcMain.handle('column-states:save', columnStatesHandlers.handleSaveColumnState);
ipcMain.handle('column-states:delete', columnStatesHandlers.handleDeleteColumnState);
ipcMain.handle('column-states:get-all', columnStatesHandlers.handleGetAllColumnStates);
ipcMain.handle('column-states:clear-all', columnStatesHandlers.handleClearAllColumnStates);
```

### 2. Update preload.js (C:/Users/User/OneDrive/Desktop/Databuild-API-Vue/preload.js)

**Add after the recentsStore section (after line 112):**
```javascript
  // Column States (electron-store persistent storage)
  columnStates: {
    get: (tabName) => ipcRenderer.invoke('column-states:get', tabName),
    save: (data) => ipcRenderer.invoke('column-states:save', data),
    delete: (tabName) => ipcRenderer.invoke('column-states:delete', tabName),
    getAll: () => ipcRenderer.invoke('column-states:get-all'),
    clearAll: () => ipcRenderer.invoke('column-states:clear-all')
  }
```

### 3. Update useElectronAPI composable (frontend/src/composables/useElectronAPI.js)

**Add after the recentsStore section (before the Utility section):**
```javascript
    // Column States (electron-store persistence)
    columnStates: {
      get: (tabName) => window.electronAPI?.columnStates.get(tabName),
      save: (data) => window.electronAPI?.columnStates.save(data),
      delete: (tabName) => window.electronAPI?.columnStates.delete(tabName),
      getAll: () => window.electronAPI?.columnStates.getAll(),
      clearAll: () => window.electronAPI?.columnStates.clearAll()
    },
```

### 4. Update App.vue to use RecipesTab_updated.vue

Find where RecipesTab is imported and update to use RecipesTab_updated:

**Current:**
```javascript
import RecipesTab from './components/Recipes/RecipesTab.vue';
```

**Updated:**
```javascript
import RecipesTab from './components/Recipes/RecipesTab_updated.vue';
```

### 5. Update ContactModal.vue import (if needed)

The app should be using the ContactModal.vue file at:
`frontend/src/components/Contacts/ContactModal.vue`

This file is already correctly implemented with all required fields and functionality.

### 6. Ensure CatalogueTab_updated.vue is being used

The CatalogueTab_updated.vue file already has the correct columns:
- ✅ Cost Centre
- ✅ CC Name (not "CC Description")
- ✅ Item Code
- ✅ Description
- ✅ Unit
- ✅ Sub Group (not "Supplier")
- ✅ Price
- ✅ Price Date

Verify that App.vue imports CatalogueTab_updated.vue, not the old CatalogueTab.vue:

**Should be:**
```javascript
import CatalogueTab from './components/Catalogue/CatalogueTab_updated.vue';
```

## Features Implemented in RecipesTab_updated.vue

### All Required Columns
- ✅ Price Code
- ✅ Description
- ✅ Qty (for sub-items)
- ✅ Formula (CalculationRoutine for main items, Formula for sub-items)
- ✅ Unit
- ✅ Cost Centre
- ✅ CC Name (CostCentreName)
- ✅ Sub Group
- ✅ Price (LatestPrice)
- ✅ Price Date
- ✅ Template
- ✅ Actions

### Column Management Features
- ✅ Show/Hide columns via AG Grid's built-in column panel
- ✅ Reorder columns via drag-and-drop
- ✅ Resize columns
- ✅ Rename columns (alias) via modal dialog
- ✅ Column state persistence in electron-store (SQLite-like storage)
- ✅ Automatic state restoration on component mount

### Additional Features
- ✅ Expand/collapse recipe sub-items
- ✅ Tree view with parent recipes and ingredients
- ✅ Per-row actions (Add to Template, Send to zzTakeoff)
- ✅ Bulk actions for selected rows
- ✅ Export to CSV/Excel
- ✅ Search functionality
- ✅ Dark mode support
- ✅ Pagination with configurable page size

## Column State Persistence

Column states are persisted using electron-store in:
`C:\Users\<username>\AppData\Roaming\dbx-connector-serverless\column-states.json`

The state includes:
- Column width
- Column order
- Column visibility (show/hide)
- Column header names (aliases)
- Pinned columns

## Testing Steps

After making the above changes:

1. Restart the Electron app
2. Navigate to Recipes tab
3. Test column management:
   - Click "Columns" button to show/hide columns
   - Drag column headers to reorder
   - Resize columns by dragging edges
   - Right-click column header to rename (if implemented in UI)
4. Reload app and verify column state is restored
5. Test expand/collapse of recipe sub-items
6. Test search and filtering
7. Test Add to Template and Send to zzTakeoff actions

## Notes

- Column state is stored per-tab (catalogue, recipes, suppliers, etc.)
- Each tab's column configuration is independent
- Column states can be reset by deleting the specific tab's state
- All column states can be cleared with `clearAll()` function

## Catalogue Tab - Column Clarification

The user mentioned: "On the Catalogue Page there is not a supplier Column however there should be a columns Sub Group and the CC Description should be CC Name"

**Current Status:** ✅ Already correct in CatalogueTab_updated.vue
- The file has "Sub Group" (field: Category) - NOT "Supplier"
- The file has "CC Name" (field: CostCentreName) - NOT "CC Description"

If the user is seeing incorrect columns, they may be viewing the old CatalogueTab.vue instead of CatalogueTab_updated.vue. Ensure App.vue imports the _updated version.
