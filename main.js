const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Import database connection module
const db = require('./src/database/connection');

// Import IPC handlers
const catalogueHandlers = require('./src/ipc-handlers/catalogue');
const recipesHandlers = require('./src/ipc-handlers/recipes');
const suppliersHandlers = require('./src/ipc-handlers/suppliers');
const preferencesHandlers = require('./src/ipc-handlers/preferences');
const costCentresHandlers = require('./src/ipc-handlers/cost-centres');
const contactsHandlers = require('./src/ipc-handlers/contacts');
const externalApiHandlers = require('./src/ipc-handlers/external-api');
const sendHistoryHandlers = require('./src/ipc-handlers/send-history');
const preferencesStoreHandlers = require('./src/ipc-handlers/preferences-store');
const templatesStoreHandlers = require('./src/ipc-handlers/templates-store');
const favouritesStoreHandlers = require('./src/ipc-handlers/favourites-store');
const recentsStoreHandlers = require('./src/ipc-handlers/recents-store');
const columnStatesHandlers = require('./src/ipc-handlers/column-states');

// Initialize electron-store for secure settings storage
const store = new Store();

let mainWindow = null;
let settingsWindow = null;

/**
 * Create the database settings window
 */
function createSettingsWindow() {
  settingsWindow = new BrowserWindow({
    width: 600,
    height: 700,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
    // If settings window is closed without saving and no saved settings exist, quit
    if (!mainWindow && !store.get('dbConfig')) {
      app.quit();
    }
  });
}

/**
 * Create the main application window
 */
function createMainWindow() {
  console.log('🚀 createMainWindow() function called');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // Create application menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Database Settings',
          accelerator: 'Ctrl+,',
          click: () => {
            if (!settingsWindow) {
              createSettingsWindow();
            } else {
              settingsWindow.focus();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'Ctrl+R',
          click: () => {
            if (mainWindow) {
              mainWindow.reload();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About DBx Connector Vue',
              message: 'DBx Connector Vue',
              detail: 'Version: 1.0.0\nVue.js + AG Grid Edition\n\n© 2025 Takeoff and Estimating Pty Ltd'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Load Vue app
  // In development: load from Vite dev server
  // In production: load from built files
  let startUrl;

  console.log('app.isPackaged:', app.isPackaged);
  console.log('__dirname:', __dirname);

  if (!app.isPackaged) {
    // Development mode - Vite dev server runs on port 5173
    startUrl = 'http://localhost:5173';
    console.log('Loading from Vite dev server:', startUrl);
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode - load built files from dist
    startUrl = `file://${path.join(__dirname, 'frontend/dist/index.html')}`;
    console.log('Loading from production build:', startUrl);
  }

  console.log('Attempting to load URL:', startUrl);
  mainWindow.loadURL(startUrl);

  // Log load success/failure
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✓ Page loaded successfully');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('✗ Page failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================
// IPC Handlers for Database Settings
// ============================================================

ipcMain.handle('db:test-connection', async (event, dbConfig) => {
  return await db.testConnection(dbConfig);
});

ipcMain.handle('db:save-connection', async (event, dbConfig) => {
  try {
    // Save settings
    store.set('dbConfig', dbConfig);

    // Connect to database
    await db.connect(dbConfig);

    // Close settings window
    if (settingsWindow) {
      settingsWindow.close();
    }

    // Create main window
    createMainWindow();

    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('db:get-saved-connection', () => {
  return store.get('dbConfig', null);
});

ipcMain.handle('db:clear-saved-connection', () => {
  store.delete('dbConfig');
  return { success: true };
});

// ============================================================
// IPC Handlers for Catalogue
// ============================================================

ipcMain.handle('catalogue:get-items', catalogueHandlers.getCatalogueItems);
ipcMain.handle('catalogue:get-item', catalogueHandlers.getCatalogueItem);
ipcMain.handle('catalogue:archive-item', catalogueHandlers.archiveItem);
ipcMain.handle('catalogue:update-field', catalogueHandlers.updateField);
ipcMain.handle('catalogue:update-price', catalogueHandlers.updatePrice);

// ============================================================
// IPC Handlers for Recipes
// ============================================================

ipcMain.handle('recipes:get-list', recipesHandlers.getRecipesList);
ipcMain.handle('recipes:get-subitems', recipesHandlers.getRecipeSubItems);
ipcMain.handle('recipes:get-recipe', recipesHandlers.getRecipe);
ipcMain.handle('recipes:get-cost-centres', recipesHandlers.getRecipeCostCentres);
ipcMain.handle('recipes:update-recipe', recipesHandlers.updateRecipe);

// ============================================================
// IPC Handlers for Suppliers
// ============================================================

ipcMain.handle('suppliers:get-groups', suppliersHandlers.getSupplierGroups);
ipcMain.handle('suppliers:get-list', suppliersHandlers.getSuppliersList);
ipcMain.handle('suppliers:archive', suppliersHandlers.archiveSupplier);
ipcMain.handle('suppliers:update-group', suppliersHandlers.updateSupplierGroup);

// ============================================================
// IPC Handlers for Preferences
// ============================================================

ipcMain.handle('preferences:get-databases', preferencesHandlers.getDatabases);
ipcMain.handle('preferences:get-units', preferencesHandlers.getUnits);
ipcMain.handle('preferences:get-cost-centre-banks', preferencesHandlers.getCostCentreBanks);
ipcMain.handle('preferences:get-price-levels', preferencesHandlers.getPriceLevels);
ipcMain.handle('preferences:get-supplier-groups', preferencesHandlers.getSupplierGroupsList);
ipcMain.handle('preferences:test-connection', preferencesHandlers.testConnection);

// ============================================================
// IPC Handlers for Cost Centres
// ============================================================

ipcMain.handle('cost-centres:get-list', costCentresHandlers.getCostCentresList);
ipcMain.handle('cost-centres:get-item', costCentresHandlers.getCostCentre);

// ============================================================
// IPC Handlers for Contacts
// ============================================================

ipcMain.handle('contacts:get-groups', contactsHandlers.getContactGroups);
ipcMain.handle('contacts:get-list', contactsHandlers.getContactsList);
ipcMain.handle('contacts:create', contactsHandlers.createContact);
ipcMain.handle('contacts:update', contactsHandlers.updateContact);

// ============================================================
// IPC Handlers for External APIs (zzTakeoff, etc.)
// ============================================================

ipcMain.handle('external:send-to-zztakeoff', externalApiHandlers.sendToZzTakeoff);
ipcMain.handle('external:get-zztakeoff-projects', externalApiHandlers.getZzTakeoffProjects);
ipcMain.handle('external:get-zztakeoff-takeoff-types', externalApiHandlers.getZzTakeoffTakeoffTypes);
ipcMain.handle('external:get-zztakeoff-cost-types', externalApiHandlers.getZzTakeoffCostTypes);
ipcMain.handle('external:http-request', externalApiHandlers.makeHttpRequest);

// ============================================================
// IPC Handlers for Send History
// ============================================================

ipcMain.handle('send-history:add', sendHistoryHandlers.handleAddSendHistory);
ipcMain.handle('send-history:get-list', sendHistoryHandlers.handleGetSendHistory);
ipcMain.handle('send-history:get-by-id', sendHistoryHandlers.handleGetSendHistoryById);
ipcMain.handle('send-history:clear', sendHistoryHandlers.handleClearSendHistory);
ipcMain.handle('send-history:delete', sendHistoryHandlers.handleDeleteSendHistory);
ipcMain.handle('send-history:get-stats', sendHistoryHandlers.handleGetSendHistoryStats);

// ============================================================
// IPC Handlers for Preferences Store (Persistent)
// ============================================================

ipcMain.handle('preferences-store:get', preferencesStoreHandlers.handleGetPreferences);
ipcMain.handle('preferences-store:save', preferencesStoreHandlers.handleSavePreferences);
ipcMain.handle('preferences-store:reset', preferencesStoreHandlers.handleResetPreferences);
ipcMain.handle('preferences-store:update', preferencesStoreHandlers.handleUpdatePreference);
ipcMain.handle('preferences-store:get-defaults', preferencesStoreHandlers.handleGetDefaultPreferences);

// ============================================================
// IPC Handlers for Column States (Persistent)
// ============================================================

ipcMain.handle('column-states:get', columnStatesHandlers.handleGetColumnState);
ipcMain.handle('column-states:save', columnStatesHandlers.handleSaveColumnState);
ipcMain.handle('column-states:delete', columnStatesHandlers.handleDeleteColumnState);
ipcMain.handle('column-states:get-all', columnStatesHandlers.handleGetAllColumnStates);
ipcMain.handle('column-states:clear-all', columnStatesHandlers.handleClearAllColumnStates);

// ============================================================
// IPC Handlers for Templates Store (Persistent)
// ============================================================

ipcMain.handle('templates-store:get-list', templatesStoreHandlers.handleGetTemplates);
ipcMain.handle('templates-store:get', templatesStoreHandlers.handleGetTemplate);
ipcMain.handle('templates-store:save', templatesStoreHandlers.handleSaveTemplate);
ipcMain.handle('templates-store:delete', templatesStoreHandlers.handleDeleteTemplate);
ipcMain.handle('templates-store:clear', templatesStoreHandlers.handleClearTemplates);

// ============================================================
// IPC Handlers for Favourites Store (Persistent)
// ============================================================

ipcMain.handle('favourites-store:get-list', favouritesStoreHandlers.handleGetFavourites);
ipcMain.handle('favourites-store:add', favouritesStoreHandlers.handleAddToFavourites);
ipcMain.handle('favourites-store:remove', favouritesStoreHandlers.handleRemoveFromFavourites);
ipcMain.handle('favourites-store:check', favouritesStoreHandlers.handleIsInFavourites);
ipcMain.handle('favourites-store:clear', favouritesStoreHandlers.handleClearFavourites);

// ============================================================
// IPC Handlers for Recents Store (Persistent)
// ============================================================

ipcMain.handle('recents-store:get-list', recentsStoreHandlers.handleGetRecents);
ipcMain.handle('recents-store:add', recentsStoreHandlers.handleAddToRecents);
ipcMain.handle('recents-store:clear', recentsStoreHandlers.handleClearRecents);

// ============================================================
// App Lifecycle
// ============================================================

app.whenReady().then(async () => {
  console.log('🚀 App ready, starting initialization...');

  const savedConfig = store.get('dbConfig');
  console.log('Saved config:', savedConfig ? 'Found' : 'Not found');

  if (savedConfig) {
    console.log('Attempting to connect with saved config...');
    try {
      // Try to connect with saved settings
      await db.connect(savedConfig);
      console.log('✓ Database connected, creating main window...');
      createMainWindow();
    } catch (error) {
      console.log('✗ Database connection failed:', error.message);
      // If saved settings don't work, show settings window
      dialog.showErrorBox(
        'Connection Failed',
        `Failed to connect to database with saved settings:\n\n${error.message}\n\nPlease update your connection settings.`
      );
      createSettingsWindow();
    }
  } else {
    console.log('No saved config, showing settings window...');
    // No saved settings, show settings window
    createSettingsWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (store.get('dbConfig')) {
        createMainWindow();
      } else {
        createSettingsWindow();
      }
    }
  });
});

app.on('window-all-closed', () => {
  // Close database connection
  db.close();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle shutdown gracefully
app.on('before-quit', async () => {
  console.log('Shutting down gracefully...');
  await db.close();
});
