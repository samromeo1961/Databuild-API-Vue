const { app, BrowserWindow, BrowserView, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const packageJson = require('./package.json');

// ============================================================
// Electron Configuration & Diagnostics
// ============================================================

// NOTE: Hardware acceleration is REQUIRED for BrowserView to work
// Disabling it causes ERR_ABORTED errors when loading external sites
// app.disableHardwareAcceleration(); // DISABLED - breaks BrowserView

// Enable GPU rasterization for better BrowserView performance
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

// Disable disk cache to fix Windows permissions errors
app.commandLine.appendSwitch('disk-cache-size', '0');
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

// Enable verbose logging for diagnostics (production & development)
app.commandLine.appendSwitch('enable-logging');
app.commandLine.appendSwitch('v', '1'); // Verbose level 1

console.log('============================================================');
console.log('ELECTRON DIAGNOSTICS - STARTUP');
console.log('============================================================');
console.log('Electron Version:', process.versions.electron);
console.log('Chrome Version:', process.versions.chrome);
console.log('Node Version:', process.versions.node);
console.log('App Version:', packageJson.version);
console.log('Is Packaged:', app.isPackaged);
console.log('App Path:', app.getAppPath());
console.log('User Data Path:', app.getPath('userData'));
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('============================================================');

// Import database connection modules
const db = require('./src/database/connection');
const localDb = require('./src/database/local-db');

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
const templatesHandlers = require('./src/ipc-handlers/templates');
const templatesStoreHandlers = require('./src/ipc-handlers/templates-store');
const favouritesStoreHandlers = require('./src/ipc-handlers/favourites-store');
const recentsStoreHandlers = require('./src/ipc-handlers/recents-store');
const columnStatesHandlers = require('./src/ipc-handlers/column-states');
const zzTypeStoreHandlers = require('./src/ipc-handlers/zztype-store');
const filterStateHandlers = require('./src/ipc-handlers/filter-state');
const columnNamesHandlers = require('./src/ipc-handlers/column-names');
const jobsHandlers = require('./src/ipc-handlers/jobs');
const credentialsStore = require('./src/database/credentials-store');
const { getPreferences } = require('./src/database/preferences-store');

// Initialize electron-store for secure settings storage
const store = new Store();

/**
 * Migrate old dbConfig to Phase 2 schema
 * Converts { database } → { systemDatabase, jobDatabase }
 * This ensures backward compatibility with existing configs
 */
function migrateDbConfig() {
  const config = store.get('dbConfig');

  if (!config) {
    return; // No config to migrate
  }

  // Check if migration needed (has 'database' but not 'systemDatabase')
  if (config.database && !config.systemDatabase) {
    console.log('🔄 Migrating database config to Phase 2 schema...');

    const migratedConfig = {
      ...config,
      systemDatabase: config.database,
      // Keep database field for backward compatibility
      database: config.database,
      // jobDatabase will be auto-detected by getJobDatabaseName() if not set
      jobDatabase: config.jobDatabase || null
    };

    store.set('dbConfig', migratedConfig);
    console.log('✓ Database config migrated successfully');
    console.log('  System Database:', migratedConfig.systemDatabase);
    console.log('  Job Database:', migratedConfig.jobDatabase || 'AUTO-DETECT');
  }
}

// Migrate config on startup
migrateDbConfig();

let mainWindow = null;
let settingsWindow = null;
let webView = null; // BrowserView for zzTakeoff webview
let zzTakeoffWindow = null; // Separate window for zzTakeoff integration
let lastNavigatedTab = { name: 'Catalogue', path: '/catalogue' }; // Track last navigated tab

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
 * Helper function to navigate to a tab and update last navigated tab
 * If main window is closed, recreate it first
 */
function navigateToTab(tabName, tabPath) {
  lastNavigatedTab = { name: tabName, path: tabPath };

  // If main window doesn't exist or is destroyed, recreate it
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log('[Navigation] Main window closed, recreating...');
    createMainWindow();
    // Give the window time to load before sending navigation
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('navigate-to', tabPath);
        mainWindow.restore(); // Restore if minimized
        mainWindow.show(); // Ensure window is visible
        mainWindow.focus(); // Bring to front
      }
    }, 1000);
  } else {
    // Main window exists - restore, show, and focus it
    console.log('[Navigation] Main window exists, focusing and navigating to:', tabPath);
    if (mainWindow.isMinimized()) {
      mainWindow.restore(); // Restore if minimized
    }
    mainWindow.show(); // Ensure window is visible
    mainWindow.focus(); // Bring to front
    mainWindow.webContents.send('navigate-to', tabPath);
  }

  // Update the menu to reflect the new "Back to" option
  if (zzTakeoffWindow && !zzTakeoffWindow.isDestroyed()) {
    updateZzTakeoffWindowMenu();
  }
}

/**
 * Build and set the zzTakeoff window menu
 */
function updateZzTakeoffWindowMenu() {
  if (!zzTakeoffWindow || zzTakeoffWindow.isDestroyed()) return;

  const zzTakeoffMenu = Menu.buildFromTemplate([
    {
      label: 'Navigate Main Window',
      submenu: [
        {
          label: 'Catalogue',
          click: () => navigateToTab('Catalogue', '/catalogue')
        },
        {
          label: 'Recipes',
          click: () => navigateToTab('Recipes', '/recipes')
        },
        {
          label: 'Suppliers',
          click: () => navigateToTab('Suppliers', '/suppliers')
        },
        {
          label: 'Contacts',
          click: () => navigateToTab('Contacts', '/contacts')
        },
        {
          label: 'Templates',
          click: () => navigateToTab('Templates', '/templates')
        },
        {
          label: 'Favourites',
          click: () => navigateToTab('Favourites', '/favourites')
        },
        {
          label: 'Recents',
          click: () => navigateToTab('Recents', '/recents')
        },
        { type: 'separator' },
        {
          label: 'Focus Main Window',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              if (mainWindow.isMinimized()) {
                mainWindow.restore();
              }
              mainWindow.show();
              mainWindow.focus();
            }
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About zzTakeoff',
          click: () => {
            require('electron').shell.openExternal('https://www.zztakeoff.com');
          }
        }
      ]
    },
    {
      label: `← Back to ${lastNavigatedTab.name}`,
      accelerator: 'Ctrl+Shift+B',
      click: () => {
        // Use navigateToTab helper which handles all window states correctly
        navigateToTab(lastNavigatedTab.name, lastNavigatedTab.path);
      }
    }
  ]);

  zzTakeoffWindow.setMenu(zzTakeoffMenu);
}

/**
 * Open zzTakeoff in a separate BrowserWindow
 */
function openZzTakeoffWindow(url) {
  console.log('🚀 openZzTakeoffWindow() called with URL:', url);

  // If window already exists, focus it and optionally navigate
  if (zzTakeoffWindow && !zzTakeoffWindow.isDestroyed()) {
    console.log('zzTakeoff window already exists, focusing...');
    zzTakeoffWindow.focus();
    // Only navigate if URL is provided
    if (url && zzTakeoffWindow.webContents) {
      console.log('Navigating to:', url);
      zzTakeoffWindow.webContents.loadURL(url);
      return { success: true, message: 'zzTakeoff window focused and navigated' };
    }
    return { success: true, message: 'zzTakeoff window focused (no navigation)' };
  }

  // If no URL provided and window doesn't exist, use default
  if (!url) {
    url = 'https://www.zztakeoff.com/login';
    console.log('No URL provided, using default:', url);
  }

  try {
    // Create new window
    zzTakeoffWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // Disable sandbox for compatibility
        partition: 'persist:zztakeoff', // Persistent session
        webSecurity: true,
        enableRemoteModule: false
      },
      icon: path.join(__dirname, 'assets', 'icon.png'),
      title: 'zzTakeoff - DBx Connector',
      autoHideMenuBar: false // Show menu bar for navigation
    });

    // Set up the custom menu with dynamic "Back to [Tab]" option
    updateZzTakeoffWindowMenu();

    // Load the URL
    zzTakeoffWindow.loadURL(url);

    // Open DevTools in development
    if (!app.isPackaged) {
      zzTakeoffWindow.webContents.openDevTools();
    }

    // Clean up reference when closed
    zzTakeoffWindow.on('closed', () => {
      console.log('zzTakeoff window closed');
      zzTakeoffWindow = null;
    });

    // Log when ready
    zzTakeoffWindow.webContents.on('did-finish-load', () => {
      console.log('zzTakeoff window loaded:', zzTakeoffWindow.webContents.getURL());
    });

    // Log navigation
    zzTakeoffWindow.webContents.on('did-navigate', (event, url) => {
      console.log('zzTakeoff window navigated to:', url);
    });

    // Error handling
    zzTakeoffWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('zzTakeoff window failed to load:', errorCode, errorDescription);
    });

    console.log('zzTakeoff window created successfully');
    return { success: true, message: 'zzTakeoff window opened' };

  } catch (error) {
    console.error('Error creating zzTakeoff window:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Create the main application window
 */
function createMainWindow() {
  console.log('🚀 createMainWindow() function called');

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true, // Enable <webview> tag for zzTakeoff integration
      offscreen: false // Ensure onscreen rendering for BrowserView
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false // Don't show until ready to avoid flash
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
          label: 'Toggle Developer Tools (Main Window)',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        },
        {
          label: 'Toggle Developer Tools (BrowserView)',
          accelerator: 'Ctrl+Shift+I',
          click: () => {
            if (webView && webView.webContents) {
              if (webView.webContents.isDevToolsOpened()) {
                webView.webContents.closeDevTools();
              } else {
                webView.webContents.openDevTools({ mode: 'detach' });
              }
            } else {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'BrowserView Not Available',
                message: 'BrowserView has not been created yet. Please navigate to the zzTakeoff Web tab first.'
              });
            }
          }
        }
      ]
    },
    {
      label: 'Tabs',
      submenu: [
        {
          label: 'Catalogue',
          accelerator: 'Ctrl+1',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate-to', '/catalogue');
            }
          }
        },
        {
          label: 'Recipes',
          accelerator: 'Ctrl+2',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate-to', '/recipes');
            }
          }
        },
        {
          label: 'Suppliers',
          accelerator: 'Ctrl+3',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate-to', '/suppliers');
            }
          }
        },
        {
          label: 'Contacts',
          accelerator: 'Ctrl+4',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate-to', '/contacts');
            }
          }
        },
        {
          label: 'Templates',
          accelerator: 'Ctrl+5',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate-to', '/templates');
            }
          }
        },
        {
          label: 'Favourites',
          accelerator: 'Ctrl+6',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate-to', '/favourites');
            }
          }
        },
        {
          label: 'Recents',
          accelerator: 'Ctrl+7',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate-to', '/recents');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'zzTakeoff Window',
          accelerator: 'Ctrl+8',
          click: () => {
            // Open or focus the separate zzTakeoff window
            if (zzTakeoffWindow && !zzTakeoffWindow.isDestroyed()) {
              zzTakeoffWindow.focus();
            } else {
              openZzTakeoffWindow('https://www.zztakeoff.com/login');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: 'Ctrl+P',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-preferences');
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Show Help',
          accelerator: 'F1',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-help');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About DBx Connector Vue',
              message: 'DBx Connector Vue',
              detail: `Version: ${packageJson.version}\nVue.js + AG Grid Edition\n\n© 2025 Takeoff and Estimating Pty Ltd`
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
  } else {
    // Production mode - load built files from dist
    startUrl = `file://${path.join(__dirname, 'frontend/dist/index.html')}`;
    console.log('Loading from production build:', startUrl);
  }

  // TEMPORARILY DISABLED: Open DevTools in detached mode for debugging (separate window)
  // Testing if DevTools interferes with BrowserView in production
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  console.log('Attempting to load URL:', startUrl);
  mainWindow.loadURL(startUrl);

  // Log load success/failure
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✓ Page loaded successfully');
    // Show window after content is loaded
    mainWindow.show();
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
// Create switch database handler with access to saved config
ipcMain.handle('preferences:switch-database', preferencesHandlers.createSwitchDatabaseHandler(() => {
  return store.get('dbConfig');
}));

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
// IPC Handlers for Filter States (Persistent)
// ============================================================

ipcMain.handle('filter-state:get', filterStateHandlers.handleGetFilterState);
ipcMain.handle('filter-state:save', filterStateHandlers.handleSaveFilterState);
ipcMain.handle('filter-state:delete', filterStateHandlers.handleDeleteFilterState);
ipcMain.handle('filter-state:get-all', filterStateHandlers.handleGetAllFilterStates);
ipcMain.handle('filter-state:clear-all', filterStateHandlers.handleClearAllFilterStates);

// ============================================================
// IPC Handlers for Column Names (Persistent)
// ============================================================

ipcMain.handle('column-names:get', columnNamesHandlers.getColumnNames);
ipcMain.handle('column-names:save', columnNamesHandlers.saveColumnNames);
ipcMain.handle('column-names:update', columnNamesHandlers.updateColumnName);
ipcMain.handle('column-names:reset', columnNamesHandlers.resetColumnNames);
ipcMain.handle('column-names:get-display-name', columnNamesHandlers.getDisplayName);
ipcMain.handle('column-names:get-zztakeoff-property', columnNamesHandlers.getZzTakeoffProperty);

// ============================================================
// IPC Handlers for Templates (Database Operations)
// ============================================================

ipcMain.handle('templates:update-prices', templatesHandlers.updatePrices);

// ============================================================
// IPC Handlers for Jobs (Database Operations)
// ============================================================

ipcMain.handle('jobs:search-job', async (event, jobNumber, defaultZzType) => {
  const savedConfig = store.get('dbConfig');
  return await jobsHandlers.searchJob(jobNumber, defaultZzType, savedConfig);
});

ipcMain.handle('jobs:get-summary', async (event, jobNumber) => {
  const savedConfig = store.get('dbConfig');
  return await jobsHandlers.getJobSummary(jobNumber, savedConfig);
});

ipcMain.handle('jobs:get-list', async (event) => {
  const savedConfig = store.get('dbConfig');
  return await jobsHandlers.getJobsList(savedConfig);
});

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
ipcMain.handle('favourites-store:update', favouritesStoreHandlers.handleUpdateFavourite);
ipcMain.handle('favourites-store:clear', favouritesStoreHandlers.handleClearFavourites);

// ============================================================
// IPC Handlers for Recents Store (Persistent)
// ============================================================

ipcMain.handle('recents-store:get-list', recentsStoreHandlers.handleGetRecents);
ipcMain.handle('recents-store:add', recentsStoreHandlers.handleAddToRecents);
ipcMain.handle('recents-store:update', recentsStoreHandlers.handleUpdateRecent);
ipcMain.handle('recents-store:clear', recentsStoreHandlers.handleClearRecents);

// ============================================================
// IPC Handlers for zzType Store (Persistent)
// ============================================================

ipcMain.handle('zztype:get', zzTypeStoreHandlers.getZzType);
ipcMain.handle('zztype:set', zzTypeStoreHandlers.setZzType);
ipcMain.handle('zztype:get-all', zzTypeStoreHandlers.getAllZzTypes);

// ============================================================
// IPC Handlers for zzTakeoff Window (Separate BrowserWindow)
// ============================================================

ipcMain.handle('zztakeoff-window:open', async (event, url) => {
  return openZzTakeoffWindow(url);
});

ipcMain.handle('zztakeoff-window:execute-javascript', async (event, code) => {
  if (!zzTakeoffWindow || zzTakeoffWindow.isDestroyed()) {
    return { success: false, message: 'zzTakeoff window is not open' };
  }

  try {
    const result = await zzTakeoffWindow.webContents.executeJavaScript(code);

    // After successfully executing (which means we sent data), focus the zzTakeoff window
    if (result && result.success !== false) {
      zzTakeoffWindow.focus();
      console.log('Auto-focused zzTakeoff window after sending data');
    }

    return { success: true, result };
  } catch (error) {
    console.error('Error executing JavaScript in zzTakeoff window:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('zztakeoff-window:is-open', () => {
  return { isOpen: zzTakeoffWindow && !zzTakeoffWindow.isDestroyed() };
});

// Track when user navigates in main window to update "Back to [Tab]" menu
ipcMain.handle('main-window:track-navigation', (event, tabName, tabPath) => {
  lastNavigatedTab = { name: tabName, path: tabPath };
  updateZzTakeoffWindowMenu();
  return { success: true };
});
ipcMain.handle('zztype:delete', zzTypeStoreHandlers.deleteZzType);

// ============================================================
// IPC Handlers for BrowserView (zzTakeoff Webview)
// ============================================================

ipcMain.handle('webview:create', async (event, url, bounds) => {
  try {
    if (!mainWindow) {
      return { success: false, message: 'Main window not found' };
    }

    // If BrowserView already exists, just restore it instead of recreating
    if (webView) {
      console.log('BrowserView already exists, restoring...');
      // Remove from window first to ensure clean re-add
      if (mainWindow.getBrowserViews().includes(webView)) {
        mainWindow.removeBrowserView(webView);
      }

      // Add back to window
      mainWindow.addBrowserView(webView);

      // Set bounds to make it visible (must be after addBrowserView)
      webView.setBounds(bounds);
      webView.setAutoResize({ width: true, height: true });

      // When restoring an existing BrowserView, preserve the current URL and session
      // Don't navigate based on the passed URL parameter - that would log the user out!
      const currentURL = webView.webContents.getURL();
      console.log('BrowserView restored, preserving current URL:', currentURL);

      // Only load the requested URL if the BrowserView has no page loaded yet
      if (!currentURL || currentURL === '' || currentURL === 'about:blank') {
        console.log('BrowserView has no URL, loading:', url);
        await webView.webContents.loadURL(url);
      } else {
        console.log('BrowserView has existing session, keeping current page to preserve login');
        // Force webContents to repaint by triggering a zoom reset
        // This forces the rendering pipeline to refresh without reloading the page
        const currentZoom = webView.webContents.getZoomFactor();
        webView.webContents.setZoomFactor(currentZoom);
        // Also invalidate to force repaint
        webView.webContents.invalidate();
      }

      // Ensure WebContents is visible and focused
      if (webView.webContents.isOffscreen()) {
        console.log('WebContents is offscreen, making visible...');
      }
      webView.webContents.focus();

      // Explicitly set as top BrowserView
      mainWindow.setTopBrowserView(webView);

      console.log('BrowserView restored with bounds:', bounds);
      console.log('BrowserView visible:', !webView.webContents.isOffscreen());
      console.log('BrowserView actual bounds:', webView.getBounds());
      console.log('MainWindow bounds:', mainWindow.getBounds());
      console.log('BrowserViews count:', mainWindow.getBrowserViews().length);
      console.log('Set as top BrowserView');
      return { success: true, url: webView.webContents.getURL(), restored: true };
    }

    // Create new BrowserView with persistent session (first time only)
    console.log('============================================================');
    console.log('BROWSERVIEW CREATION - DIAGNOSTICS');
    console.log('============================================================');
    console.log('Creating new BrowserView with persistent session...');
    console.log('Received bounds from frontend:', bounds);
    console.log('MainWindow content bounds:', mainWindow.getContentBounds());

    const browserViewConfig = {
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // CRITICAL: Disable sandbox to fix rendering in packaged apps
        partition: 'persist:zztakeoff', // Persistent session storage
        webSecurity: true,
        enableRemoteModule: false,
        backgroundThrottling: false,
        offscreen: false, // Ensure onscreen rendering
        enableWebSQL: false,
        v8CacheOptions: 'none' // Disable V8 code caching for production debugging
      }
    };

    console.log('BrowserView webPreferences:', JSON.stringify(browserViewConfig.webPreferences, null, 2));

    webView = new BrowserView(browserViewConfig);

    // Set background color to white to ensure visibility
    webView.setBackgroundColor('#ffffff');

    mainWindow.addBrowserView(webView);
    webView.setBounds(bounds);
    webView.setAutoResize({ width: true, height: true });

    console.log('BrowserView added to window');
    console.log('BrowserView bounds set to:', webView.getBounds());
    console.log('BrowserView webContents ID:', webView.webContents.id);
    console.log('BrowserViews in window:', mainWindow.getBrowserViews().length);

    // Force visibility settings
    if (webView.webContents) {
      webView.webContents.setBackgroundThrottling(false);
      // Ensure painting is enabled
      if (!webView.webContents.isPainting()) {
        console.log('[WARNING] WebContents is not painting! Forcing paint...');
        webView.webContents.invalidate();
      }
    }

    // Load URL (only for first-time creation)
    console.log('Loading URL in BrowserView:', url);
    await webView.webContents.loadURL(url);
    console.log('URL loaded in BrowserView');

    // Force paint after load
    webView.webContents.invalidate();

    // Force webContents to be visible and bring to front
    webView.webContents.focus();

    // Remove and re-add BrowserView to ensure it's on top
    mainWindow.removeBrowserView(webView);
    mainWindow.addBrowserView(webView);
    webView.setBounds(bounds);

    // Explicitly set as top BrowserView
    mainWindow.setTopBrowserView(webView);

    console.log('BrowserView re-added and set as top view');
    console.log('Final BrowserView bounds:', webView.getBounds());
    console.log('BrowserViews in window after setup:', mainWindow.getBrowserViews().map(bv => bv.webContents.id));
    console.log('============================================================');
    console.log('BROWSERVIEW CONFIGURATION SUMMARY');
    console.log('============================================================');
    console.log('WebContents ID:', webView.webContents.id);
    console.log('Background Color:', '#ffffff');
    console.log('Session Partition:', 'persist:zztakeoff');
    console.log('Sandbox Enabled:', false);
    console.log('Context Isolation:', true);
    console.log('Node Integration:', false);
    console.log('WebContents isOffscreen:', webView.webContents.isOffscreen());
    console.log('WebContents isPainting:', webView.webContents.isPainting());
    console.log('============================================================');

    // ============================================================
    // BrowserView Diagnostic Logging & Event Forwarding
    // ============================================================

    // Forward console messages from BrowserView to main process console
    webView.webContents.on('console-message', (event, level, message, line, sourceId) => {
      const levelMap = { 0: 'INFO', 1: 'WARN', 2: 'ERROR' };
      const levelName = levelMap[level] || 'LOG';
      console.log(`[BrowserView Console ${levelName}] ${message} (${sourceId}:${line})`);
    });

    // Lifecycle Events - Send navigation events back to renderer
    webView.webContents.on('did-start-loading', () => {
      console.log('[BrowserView Lifecycle] did-start-loading');
      mainWindow.webContents.send('webview:loading', true);
    });

    webView.webContents.on('did-stop-loading', () => {
      console.log('[BrowserView Lifecycle] did-stop-loading');
      mainWindow.webContents.send('webview:loading', false);
    });

    webView.webContents.on('did-navigate', (event, url) => {
      console.log('[BrowserView Lifecycle] did-navigate to:', url);
      mainWindow.webContents.send('webview:url-changed', url);
    });

    webView.webContents.on('did-navigate-in-page', (event, url) => {
      console.log('[BrowserView Lifecycle] did-navigate-in-page to:', url);
      mainWindow.webContents.send('webview:url-changed', url);
    });

    webView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('[BrowserView Lifecycle] did-fail-load:', {
        errorCode,
        errorDescription,
        url: validatedURL
      });
      mainWindow.webContents.send('webview:load-error', {
        errorCode,
        errorDescription,
        url: validatedURL
      });
    });

    webView.webContents.on('did-finish-load', () => {
      console.log('[BrowserView Lifecycle] did-finish-load');
      console.log('[BrowserView Lifecycle] Current URL:', webView.webContents.getURL());
      console.log('[BrowserView Lifecycle] Title:', webView.webContents.getTitle());
    });

    webView.webContents.on('dom-ready', () => {
      console.log('[BrowserView Lifecycle] dom-ready');
    });

    webView.webContents.on('crashed', (event, killed) => {
      console.error('[BrowserView Lifecycle] CRASHED! Killed:', killed);
    });

    webView.webContents.on('render-process-gone', (event, details) => {
      console.error('[BrowserView Lifecycle] render-process-gone:', details);
    });

    webView.webContents.on('unresponsive', () => {
      console.error('[BrowserView Lifecycle] unresponsive');
    });

    webView.webContents.on('responsive', () => {
      console.log('[BrowserView Lifecycle] responsive');
    });

    // Listen for find-in-page results
    webView.webContents.on('found-in-page', (event, result) => {
      mainWindow.webContents.send('webview:found-in-page', result);
    });

    // Session diagnostics
    console.log('[BrowserView Session] Partition:', webView.webContents.session.getUserAgent());
    console.log('[BrowserView Session] Cache enabled:', !webView.webContents.session.getCacheSize);

    return { success: true, url };
  } catch (error) {
    console.error('Error creating BrowserView:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('webview:navigate', async (event, url) => {
  try {
    if (!webView) {
      return { success: false, message: 'Webview not initialized' };
    }

    await webView.webContents.loadURL(url);
    return { success: true, url };
  } catch (error) {
    console.error('Error navigating BrowserView:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('webview:reload', async (event) => {
  try {
    if (!webView) {
      return { success: false, message: 'Webview not initialized' };
    }

    webView.webContents.reload();
    return { success: true };
  } catch (error) {
    console.error('Error reloading BrowserView:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('webview:destroy', async (event) => {
  try {
    // Don't actually destroy the BrowserView, just hide it to preserve session
    // This allows the user to stay logged in when navigating back to zzTakeoff Web
    if (webView && mainWindow) {
      console.log('Hiding BrowserView (preserving session)...');
      // Hide by setting bounds to 0
      webView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      // Remove from window but don't destroy the WebContents
      mainWindow.removeBrowserView(webView);
    }
    return { success: true };
  } catch (error) {
    console.error('Error hiding BrowserView:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('webview:set-bounds', async (event, bounds) => {
  try {
    console.log('[Main] webview:set-bounds called with:', bounds);
    if (!webView) {
      console.error('[Main] webview:set-bounds failed: Webview not initialized');
      return { success: false, message: 'Webview not initialized' };
    }

    console.log('[Main] Current BrowserView bounds before update:', webView.getBounds());
    webView.setBounds(bounds);
    console.log('[Main] BrowserView bounds after update:', webView.getBounds());
    console.log('[Main] BrowserView is visible:', mainWindow.getBrowserViews().includes(webView));
    return { success: true };
  } catch (error) {
    console.error('[Main] Error setting BrowserView bounds:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('webview:go-back', async (event) => {
  try {
    if (!webView) {
      return { success: false, message: 'Webview not initialized' };
    }

    if (webView.webContents.canGoBack()) {
      webView.webContents.goBack();
      return { success: true, canGoBack: true };
    }
    return { success: true, canGoBack: false };
  } catch (error) {
    console.error('Error going back in BrowserView:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('webview:go-forward', async (event) => {
  try {
    if (!webView) {
      return { success: false, message: 'Webview not initialized' };
    }

    if (webView.webContents.canGoForward()) {
      webView.webContents.goForward();
      return { success: true, canGoForward: true };
    }
    return { success: true, canGoForward: false };
  } catch (error) {
    console.error('Error going forward in BrowserView:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('webview:find-in-page', async (event, text, options) => {
  try {
    if (!webView) {
      return { success: false, message: 'Webview not initialized' };
    }

    const requestId = webView.webContents.findInPage(text, options);
    return { success: true, requestId };
  } catch (error) {
    console.error('Error in find-in-page:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('webview:stop-find-in-page', async (event, action) => {
  try {
    if (!webView) {
      return { success: false, message: 'Webview not initialized' };
    }

    webView.webContents.stopFindInPage(action);
    return { success: true };
  } catch (error) {
    console.error('Error stopping find-in-page:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('webview:execute-javascript', async (event, code) => {
  try {
    if (!webView) {
      return { success: false, message: 'Webview not initialized' };
    }

    console.log('[executeJavaScript] Executing code in BrowserView:', code);
    const result = await webView.webContents.executeJavaScript(code);
    console.log('[executeJavaScript] Result:', result);
    return { success: true, result };
  } catch (error) {
    console.error('Error executing JavaScript in BrowserView:', error);
    return { success: false, message: error.message };
  }
});


// ============================================================
// App Lifecycle
// ============================================================

app.whenReady().then(async () => {
  console.log('🚀 App ready, starting initialization...');

  // Initialize local SQLite database for templates and preferences
  try {
    localDb.initDatabase();
    console.log('✓ Local SQLite database initialized');
  } catch (err) {
    console.error('✗ Failed to initialize local database:', err);
  }

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
  // Don't quit if zzTakeoff window is still open
  if (zzTakeoffWindow && !zzTakeoffWindow.isDestroyed()) {
    console.log('[App] Main window closed but zzTakeoff window still open - keeping app alive');
    return;
  }

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
  localDb.closeDatabase();
});
