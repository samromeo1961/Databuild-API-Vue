const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script to safely expose IPC functions to the renderer process
 * This replaces HTTP/axios calls with direct IPC communication
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // Database settings
  db: {
    testConnection: (dbConfig) => ipcRenderer.invoke('db:test-connection', dbConfig),
    saveConnection: (dbConfig) => ipcRenderer.invoke('db:save-connection', dbConfig),
    getSavedConnection: () => ipcRenderer.invoke('db:get-saved-connection'),
    clearSavedConnection: () => ipcRenderer.invoke('db:clear-saved-connection')
  },

  // Catalogue
  catalogue: {
    getItems: (params) => ipcRenderer.invoke('catalogue:get-items', params),
    getItem: (priceCode) => ipcRenderer.invoke('catalogue:get-item', priceCode),
    archiveItem: (params) => ipcRenderer.invoke('catalogue:archive-item', params),
    updateField: (params) => ipcRenderer.invoke('catalogue:update-field', params),
    updatePrice: (params) => ipcRenderer.invoke('catalogue:update-price', params)
  },

  // Recipes
  recipes: {
    getList: (params) => ipcRenderer.invoke('recipes:get-list', params),
    getSubItems: (priceCode) => ipcRenderer.invoke('recipes:get-subitems', priceCode),
    getRecipe: (priceCode) => ipcRenderer.invoke('recipes:get-recipe', priceCode),
    getCostCentres: (params) => ipcRenderer.invoke('recipes:get-cost-centres', params),
    updateRecipe: (params) => ipcRenderer.invoke('recipes:update-recipe', params)
  },

  // Suppliers
  suppliers: {
    getGroups: (params) => ipcRenderer.invoke('suppliers:get-groups', params),
    getList: (params) => ipcRenderer.invoke('suppliers:get-list', params),
    archive: (params) => ipcRenderer.invoke('suppliers:archive', params),
    updateGroup: (params) => ipcRenderer.invoke('suppliers:update-group', params)
  },

  // Preferences
  preferences: {
    getDatabases: (params) => ipcRenderer.invoke('preferences:get-databases', params),
    getUnits: (params) => ipcRenderer.invoke('preferences:get-units', params),
    getCostCentreBanks: (params) => ipcRenderer.invoke('preferences:get-cost-centre-banks', params),
    getPriceLevels: (params) => ipcRenderer.invoke('preferences:get-price-levels', params),
    getSupplierGroups: (params) => ipcRenderer.invoke('preferences:get-supplier-groups', params),
    testConnection: (params) => ipcRenderer.invoke('preferences:test-connection', params),
    switchDatabase: (params) => ipcRenderer.invoke('preferences:switch-database', params)
  },

  // Cost Centres
  costCentres: {
    getList: (params) => ipcRenderer.invoke('cost-centres:get-list', params),
    getItem: (code) => ipcRenderer.invoke('cost-centres:get-item', code)
  },

  // Contacts
  contacts: {
    getGroups: (params) => ipcRenderer.invoke('contacts:get-groups', params),
    getList: (params) => ipcRenderer.invoke('contacts:get-list', params),
    create: (contactData) => ipcRenderer.invoke('contacts:create', contactData),
    update: (data) => ipcRenderer.invoke('contacts:update', data)
  },

  // External API calls (for zzTakeoff integration)
  // These use axios from the main process to call external HTTPS APIs
  external: {
    sendToZzTakeoff: (data) => ipcRenderer.invoke('external:send-to-zztakeoff', data),
    getZzTakeoffProjects: (data) => ipcRenderer.invoke('external:get-zztakeoff-projects', data),
    getZzTakeoffTakeoffTypes: (data) => ipcRenderer.invoke('external:get-zztakeoff-takeoff-types', data),
    getZzTakeoffCostTypes: (data) => ipcRenderer.invoke('external:get-zztakeoff-cost-types', data),
    httpRequest: (config) => ipcRenderer.invoke('external:http-request', config)
  },

  // Send History (electron-store persistent storage)
  sendHistory: {
    add: (sendData) => ipcRenderer.invoke('send-history:add', sendData),
    getList: (params) => ipcRenderer.invoke('send-history:get-list', params),
    getById: (id) => ipcRenderer.invoke('send-history:get-by-id', { id }),
    clear: () => ipcRenderer.invoke('send-history:clear'),
    delete: (id) => ipcRenderer.invoke('send-history:delete', { id }),
    getStats: () => ipcRenderer.invoke('send-history:get-stats')
  },

  // Preferences Store (electron-store persistent storage)
  preferencesStore: {
    get: () => ipcRenderer.invoke('preferences-store:get'),
    save: (preferences) => ipcRenderer.invoke('preferences-store:save', preferences),
    reset: () => ipcRenderer.invoke('preferences-store:reset'),
    update: (key, value) => ipcRenderer.invoke('preferences-store:update', { key, value }),
    getDefaults: () => ipcRenderer.invoke('preferences-store:get-defaults')
  },

  // Templates (database operations)
  templates: {
    updatePrices: (templateId, data) => ipcRenderer.invoke('templates:update-prices', data)
  },

  // Templates Store (electron-store persistent storage)
  templatesStore: {
    getList: (params) => ipcRenderer.invoke('templates-store:get-list', params),
    get: (templateId) => ipcRenderer.invoke('templates-store:get', { templateId }),
    save: (template) => ipcRenderer.invoke('templates-store:save', template),
    delete: (templateId) => ipcRenderer.invoke('templates-store:delete', { templateId }),
    clear: () => ipcRenderer.invoke('templates-store:clear')
  },

  // Favourites Store (electron-store persistent storage)
  favouritesStore: {
    getList: (params) => ipcRenderer.invoke('favourites-store:get-list', params),
    add: (item) => ipcRenderer.invoke('favourites-store:add', item),
    remove: (priceCode) => ipcRenderer.invoke('favourites-store:remove', { priceCode }),
    check: (priceCode) => ipcRenderer.invoke('favourites-store:check', { priceCode }),
    update: (updateData) => ipcRenderer.invoke('favourites-store:update', updateData),
    clear: () => ipcRenderer.invoke('favourites-store:clear')
  },

  // Recents Store (electron-store persistent storage)
  recentsStore: {
    getList: (params) => ipcRenderer.invoke('recents-store:get-list', params),
    add: (item) => ipcRenderer.invoke('recents-store:add', item),
    update: (updateData) => ipcRenderer.invoke('recents-store:update', updateData),
    clear: () => ipcRenderer.invoke('recents-store:clear')
  },

  // Column States (electron-store persistent storage)
  columnStates: {
    get: (tabName) => ipcRenderer.invoke('column-states:get', tabName),
    save: (data) => ipcRenderer.invoke('column-states:save', data),
    delete: (tabName) => ipcRenderer.invoke('column-states:delete', tabName),
    getAll: () => ipcRenderer.invoke('column-states:get-all'),
    clearAll: () => ipcRenderer.invoke('column-states:clear-all')
  },

  // Filter States (electron-store persistent storage)
  filterState: {
    get: (tabName) => ipcRenderer.invoke('filter-state:get', tabName),
    save: (data) => ipcRenderer.invoke('filter-state:save', data),
    delete: (tabName) => ipcRenderer.invoke('filter-state:delete', tabName),
    getAll: () => ipcRenderer.invoke('filter-state:get-all'),
    clearAll: () => ipcRenderer.invoke('filter-state:clear-all')
  },

  // zzType Store (electron-store persistent storage for item-specific zzType overrides)
  zzTypeStore: {
    get: (priceCode) => ipcRenderer.invoke('zztype:get', priceCode),
    set: (priceCode, zzType) => ipcRenderer.invoke('zztype:set', { priceCode, zzType }),
    getAll: () => ipcRenderer.invoke('zztype:get-all'),
    delete: (priceCode) => ipcRenderer.invoke('zztype:delete', priceCode)
  },

  // BrowserView for zzTakeoff Webview
  webview: {
    create: (url, bounds) => ipcRenderer.invoke('webview:create', url, bounds),
    navigate: (url) => ipcRenderer.invoke('webview:navigate', url),
    reload: () => ipcRenderer.invoke('webview:reload'),
    destroy: () => ipcRenderer.invoke('webview:destroy'),
    setBounds: (bounds) => ipcRenderer.invoke('webview:set-bounds', bounds),
    goBack: () => ipcRenderer.invoke('webview:go-back'),
    goForward: () => ipcRenderer.invoke('webview:go-forward'),
    findInPage: (text, options) => ipcRenderer.invoke('webview:find-in-page', text, options),
    stopFindInPage: (action) => ipcRenderer.invoke('webview:stop-find-in-page', action),
    executeJavaScript: (code) => ipcRenderer.invoke('webview:execute-javascript', code),
    // Event listeners for webview events
    onLoading: (callback) => ipcRenderer.on('webview:loading', (event, isLoading) => callback(isLoading)),
    onUrlChanged: (callback) => ipcRenderer.on('webview:url-changed', (event, url) => callback(url)),
    onLoadError: (callback) => ipcRenderer.on('webview:load-error', (event, error) => callback(error)),
    onFoundInPage: (callback) => ipcRenderer.on('webview:found-in-page', (event, result) => callback(result))
  },

  // Event listeners
  onShowHelp: (callback) => ipcRenderer.on('show-help', callback),
  onNavigateTo: (callback) => ipcRenderer.on('navigate-to', (event, path) => callback(path)),
  onShowPreferences: (callback) => ipcRenderer.on('show-preferences', callback)
});
