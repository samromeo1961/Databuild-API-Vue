/**
 * Vue composable for accessing Electron IPC API
 * This wraps window.electronAPI exposed by preload.js
 */

export function useElectronAPI() {
  // Check if running in Electron environment
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  if (!isElectron) {
    console.warn('Electron API not available - running in browser mode');
  }

  return {
    // Database operations
    db: {
      testConnection: (dbConfig) => window.electronAPI?.db.testConnection(dbConfig),
      saveConnection: (dbConfig) => window.electronAPI?.db.saveConnection(dbConfig),
      getSavedConnection: () => window.electronAPI?.db.getSavedConnection(),
      clearSavedConnection: () => window.electronAPI?.db.clearSavedConnection()
    },

    // Catalogue
    catalogue: {
      getItems: (params) => window.electronAPI?.catalogue.getItems(params),
      getItem: (priceCode) => window.electronAPI?.catalogue.getItem(priceCode),
      archiveItem: (params) => window.electronAPI?.catalogue.archiveItem(params),
      updateField: (params) => window.electronAPI?.catalogue.updateField(params),
      updatePrice: (params) => window.electronAPI?.catalogue.updatePrice(params),
      getAllTemplates: () => window.electronAPI?.catalogue.getAllTemplates()
    },

    // Recipes
    recipes: {
      getList: (params) => window.electronAPI?.recipes.getList(params),
      getSubItems: (priceCode) => window.electronAPI?.recipes.getSubItems(priceCode),
      getRecipe: (priceCode) => window.electronAPI?.recipes.getRecipe(priceCode),
      getCostCentres: (params) => window.electronAPI?.recipes.getCostCentres(params),
      updateRecipe: (params) => window.electronAPI?.recipes.updateRecipe(params)
    },

    // Suppliers
    suppliers: {
      getGroups: (params) => window.electronAPI?.suppliers.getGroups(params),
      getList: (params) => window.electronAPI?.suppliers.getList(params),
      archive: (params) => window.electronAPI?.suppliers.archive(params),
      updateGroup: (params) => window.electronAPI?.suppliers.updateGroup(params)
    },

    // Preferences
    preferences: {
      getDatabases: (params) => window.electronAPI?.preferences.getDatabases(params),
      getUnits: (params) => window.electronAPI?.preferences.getUnits(params),
      getCostCentreBanks: (params) => window.electronAPI?.preferences.getCostCentreBanks(params),
      getPriceLevels: (params) => window.electronAPI?.preferences.getPriceLevels(params),
      getSupplierGroups: (params) => window.electronAPI?.preferences.getSupplierGroups(params),
      testConnection: (params) => window.electronAPI?.preferences.testConnection(params),
      switchDatabase: (params) => window.electronAPI?.preferences.switchDatabase(params)
    },

    // Cost Centres
    costCentres: {
      getList: (params) => window.electronAPI?.costCentres.getList(params),
      getItem: (code) => window.electronAPI?.costCentres.getItem(code)
    },

    // Contacts
    contacts: {
      getGroups: (params) => window.electronAPI?.contacts.getGroups(params),
      getList: (params) => window.electronAPI?.contacts.getList(params),
      create: (contactData) => window.electronAPI?.contacts.create(contactData),
      update: (data) => window.electronAPI?.contacts.update(data)
    },

    // External API (zzTakeoff integration)
    external: {
      sendToZzTakeoff: (data) => window.electronAPI?.external.sendToZzTakeoff(data),
      getZzTakeoffProjects: (data) => window.electronAPI?.external.getZzTakeoffProjects(data),
      getZzTakeoffTakeoffTypes: (data) => window.electronAPI?.external.getZzTakeoffTakeoffTypes(data),
      getZzTakeoffCostTypes: (data) => window.electronAPI?.external.getZzTakeoffCostTypes(data),
      httpRequest: (config) => window.electronAPI?.external.httpRequest(config)
    },

    // Send History (electron-store persistence)
    sendHistory: {
      add: (sendData) => window.electronAPI?.sendHistory.add(sendData),
      getList: (params) => window.electronAPI?.sendHistory.getList(params),
      getById: (id) => window.electronAPI?.sendHistory.getById(id),
      clear: () => window.electronAPI?.sendHistory.clear(),
      delete: (id) => window.electronAPI?.sendHistory.delete(id),
      getStats: () => window.electronAPI?.sendHistory.getStats()
    },

    // Preferences Store (electron-store persistence)
    preferencesStore: {
      get: () => window.electronAPI?.preferencesStore.get(),
      save: (preferences) => window.electronAPI?.preferencesStore.save(preferences),
      reset: () => window.electronAPI?.preferencesStore.reset(),
      update: (key, value) => window.electronAPI?.preferencesStore.update(key, value),
      getDefaults: () => window.electronAPI?.preferencesStore.getDefaults()
    },

    // Templates (database operations)
    templates: {
      updatePrices: (templateId, data) => window.electronAPI?.templates.updatePrices(templateId, data)
    },

    // Jobs (Job Database operations)
    jobs: {
      searchJob: (jobNumber, defaultZzType) => window.electronAPI?.jobs.searchJob(jobNumber, defaultZzType),
      getSummary: (jobNumber) => window.electronAPI?.jobs.getSummary(jobNumber),
      getList: () => window.electronAPI?.jobs.getList(),
      getOrdersColumns: () => window.electronAPI?.jobs.getOrdersColumns(),
      getDatabaseTables: () => window.electronAPI?.jobs.getDatabaseTables()
    },

    // Templates Store (electron-store persistence)
    templatesStore: {
      getList: (params) => window.electronAPI?.templatesStore.getList(params),
      get: (templateId) => window.electronAPI?.templatesStore.get(templateId),
      save: (template) => window.electronAPI?.templatesStore.save(template),
      delete: (templateId) => window.electronAPI?.templatesStore.delete(templateId),
      clear: () => window.electronAPI?.templatesStore.clear()
    },

    // Favourites Store (electron-store persistence)
    favouritesStore: {
      getList: (params) => window.electronAPI?.favouritesStore.getList(params),
      add: (item) => window.electronAPI?.favouritesStore.add(item),
      remove: (priceCode) => window.electronAPI?.favouritesStore.remove(priceCode),
      check: (priceCode) => window.electronAPI?.favouritesStore.check(priceCode),
      update: (updateData) => window.electronAPI?.favouritesStore.update(updateData),
      clear: () => window.electronAPI?.favouritesStore.clear()
    },

    // Recents Store (electron-store persistence)
    recentsStore: {
      getList: (params) => window.electronAPI?.recentsStore.getList(params),
      add: (item) => window.electronAPI?.recentsStore.add(item),
      update: (updateData) => window.electronAPI?.recentsStore.update(updateData),
      clear: () => window.electronAPI?.recentsStore.clear()
    },

    // Notes Store (electron-store persistence, user-specific)
    notesStore: {
      getAll: () => window.electronAPI?.notesStore.getAll(),
      get: (priceCode) => window.electronAPI?.notesStore.get(priceCode),
      save: (priceCode, noteText) => window.electronAPI?.notesStore.save(priceCode, noteText),
      delete: (priceCode) => window.electronAPI?.notesStore.delete(priceCode),
      saveMultiple: (notesObj, merge) => window.electronAPI?.notesStore.saveMultiple(notesObj, merge),
      clearAll: () => window.electronAPI?.notesStore.clearAll(),
      getCount: () => window.electronAPI?.notesStore.getCount()
    },

    // Column States (electron-store persistence)
    columnStates: {
      get: (tabName) => window.electronAPI?.columnStates.get(tabName),
      save: (data) => window.electronAPI?.columnStates.save(data),
      delete: (tabName) => window.electronAPI?.columnStates.delete(tabName),
      getAll: () => window.electronAPI?.columnStates.getAll(),
      clearAll: () => window.electronAPI?.columnStates.clearAll()
    },

    // Filter States (electron-store persistence)
    filterState: {
      get: (tabName) => window.electronAPI?.filterState?.get(tabName),
      save: (data) => window.electronAPI?.filterState?.save(data),
      delete: (tabName) => window.electronAPI?.filterState?.delete(tabName),
      getAll: () => window.electronAPI?.filterState?.getAll(),
      clearAll: () => window.electronAPI?.filterState?.clearAll()
    },

    // Column Names (electron-store persistence for custom column names)
    columnNames: {
      get: () => window.electronAPI?.columnNames?.get(),
      save: (columnNames) => window.electronAPI?.columnNames?.save(columnNames),
      update: (field, displayName, zzTakeoffProperty) => window.electronAPI?.columnNames?.update(field, displayName, zzTakeoffProperty),
      reset: () => window.electronAPI?.columnNames?.reset(),
      getDisplayName: (field) => window.electronAPI?.columnNames?.getDisplayName(field),
      getZzTakeoffProperty: (field) => window.electronAPI?.columnNames?.getZzTakeoffProperty(field)
    },

    // zzType Store (electron-store persistence for item-specific zzType overrides)
    zzTypeStore: {
      get: (priceCode) => window.electronAPI?.zzTypeStore.get(priceCode),
      set: (priceCode, zzType) => window.electronAPI?.zzTypeStore.set(priceCode, zzType),
      getAll: () => window.electronAPI?.zzTypeStore.getAll(),
      delete: (priceCode) => window.electronAPI?.zzTypeStore.delete(priceCode)
    },

    // zzTakeoff Window (Separate BrowserWindow for zzTakeoff integration)
    zzTakeoffWindow: {
      open: (url) => window.electronAPI?.zzTakeoffWindow.open(url),
      executeJavaScript: (code) => window.electronAPI?.zzTakeoffWindow.executeJavaScript(code),
      isOpen: () => window.electronAPI?.zzTakeoffWindow.isOpen()
    },

    // Main window navigation tracking
    mainWindow: {
      trackNavigation: (tabName, tabPath) => window.electronAPI?.mainWindow.trackNavigation(tabName, tabPath)
    },

    // BrowserView for zzTakeoff Webview
    webview: {
      create: (url, bounds) => window.electronAPI?.webview.create(url, bounds),
      navigate: (url) => window.electronAPI?.webview.navigate(url),
      reload: () => window.electronAPI?.webview.reload(),
      destroy: () => window.electronAPI?.webview.destroy(),
      setBounds: (bounds) => window.electronAPI?.webview.setBounds(bounds),
      goBack: () => window.electronAPI?.webview.goBack(),
      goForward: () => window.electronAPI?.webview.goForward(),
      findInPage: (text, options) => window.electronAPI?.webview.findInPage(text, options),
      stopFindInPage: (action) => window.electronAPI?.webview.stopFindInPage(action),
      executeJavaScript: (code) => window.electronAPI?.webview.executeJavaScript(code),
      onLoading: (callback) => window.electronAPI?.webview.onLoading(callback),
      onUrlChanged: (callback) => window.electronAPI?.webview.onUrlChanged(callback),
      onLoadError: (callback) => window.electronAPI?.webview.onLoadError(callback),
      onFoundInPage: (callback) => window.electronAPI?.webview.onFoundInPage(callback)
    },

    // Utility
    isElectron
  };
}
