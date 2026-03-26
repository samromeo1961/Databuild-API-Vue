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
      switchDatabase: (params) => window.electronAPI?.preferences.switchDatabase(params),
      // Convenience methods for getting/setting individual preference keys
      get: async (key) => {
        const result = await window.electronAPI?.preferencesStore.get();
        if (result && result.success) {
          return { success: true, value: result.preferences?.[key] };
        }
        return { success: false, value: null };
      },
      set: async (key, value) => {
        return await window.electronAPI?.preferencesStore.update(key, value);
      }
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

    // Bill of Quantities (BOQ)
    boq: {
      getJobBill: (jobNo, costCentre, bLoad) => window.electronAPI?.boq.getJobBill(jobNo, costCentre, bLoad),
      addItem: (billItem) => window.electronAPI?.boq.addItem(billItem),
      updateItem: (billItem) => window.electronAPI?.boq.updateItem(billItem),
      deleteItem: (jobNo, costCentre, bLoad, lineNumber) => window.electronAPI?.boq.deleteItem(jobNo, costCentre, bLoad, lineNumber),
      getCostCentresWithBudgets: (jobNo) => window.electronAPI?.boq.getCostCentresWithBudgets(jobNo),
      repriceBill: (jobNo, priceLevel, billDate) => window.electronAPI?.boq.repriceBill(jobNo, priceLevel, billDate),
      explodeRecipe: (jobNo, costCentre, bLoad, priceCode, quantity, options) => window.electronAPI?.boq.explodeRecipe(jobNo, costCentre, bLoad, priceCode, quantity, options),
      getLoads: (jobNo, costCentre) => window.electronAPI?.boq.getLoads(jobNo, costCentre),
      createLoad: (jobNo, costCentre) => window.electronAPI?.boq.createLoad(jobNo, costCentre),
      generateReport: (reportType, jobNo, costCentre) => window.electronAPI?.boq.generateReport(reportType, jobNo, costCentre)
    },

    // BOQ Options Store (electron-store persistence)
    boqOptions: {
      get: () => window.electronAPI?.boqOptions.get(),
      save: (options) => window.electronAPI?.boqOptions.save(options),
      update: (key, value) => window.electronAPI?.boqOptions.update(key, value),
      reset: () => window.electronAPI?.boqOptions.reset(),
      getDefaults: () => window.electronAPI?.boqOptions.getDefaults(),
      saveLastUsed: (lastUsed) => window.electronAPI?.boqOptions.saveLastUsed(lastUsed)
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

    // Purchase Order Templates
    poTemplates: {
      getAll: () => window.electronAPI?.poTemplates.getAll(),
      getBuiltIn: () => window.electronAPI?.poTemplates.getBuiltIn(),
      getCustom: () => window.electronAPI?.poTemplates.getCustom(),
      getById: (templateId) => window.electronAPI?.poTemplates.getById(templateId),
      save: (templateData) => window.electronAPI?.poTemplates.save(templateData),
      update: (templateId, updates) => window.electronAPI?.poTemplates.update(templateId, updates),
      delete: (templateId) => window.electronAPI?.poTemplates.delete(templateId),
      export: (templateId) => window.electronAPI?.poTemplates.export(templateId),
      import: () => window.electronAPI?.poTemplates.import(),
      getDefaultId: () => window.electronAPI?.poTemplates.getDefaultId(),
      getDefault: () => window.electronAPI?.poTemplates.getDefault(),
      setDefault: (templateId) => window.electronAPI?.poTemplates.setDefault(templateId),
      loadHTML: (templateId) => window.electronAPI?.poTemplates.loadHTML(templateId),
      createCustomized: (baseTemplateId, customizations, newName) =>
        window.electronAPI?.poTemplates.createCustomized(baseTemplateId, customizations, newName),
      getCategories: () => window.electronAPI?.poTemplates.getCategories(),
      getByCategory: (category) => window.electronAPI?.poTemplates.getByCategory(category),
      search: (query) => window.electronAPI?.poTemplates.search(query),
      preview: (templateId, settings) => window.electronAPI?.poTemplates.preview(templateId, settings),
      getSampleData: () => window.electronAPI?.poTemplates.getSampleData(),
      previewCustomHTML: (html) => window.electronAPI?.poTemplates.previewCustomHTML(html)
    },

    // Purchase Orders
    purchaseOrders: {
      getJobs: () => window.electronAPI?.purchaseOrders.getJobs(),
      getJobsWithOrderCounts: () => window.electronAPI?.purchaseOrders.getJobsWithOrderCounts(),
      getOrdersForJob: (jobNo) => window.electronAPI?.purchaseOrders.getOrdersForJob(jobNo),
      getOrderLineItems: (orderNumber) => window.electronAPI?.purchaseOrders.getOrderLineItems(orderNumber),
      getOrderSummary: (orderNumber) => window.electronAPI?.purchaseOrders.getOrderSummary(orderNumber),
      renderPreview: (orderNumber, settings) => window.electronAPI?.purchaseOrders.renderPreview(orderNumber, settings),
      renderPDF: (orderNumber, settings) => window.electronAPI?.purchaseOrders.renderPDF(orderNumber, settings),
      getCostCentres: () => window.electronAPI?.purchaseOrders.getCostCentres(),
      getPreferredSuppliers: (costCentre) => window.electronAPI?.purchaseOrders.getPreferredSuppliers(costCentre),
      getSuppliersForCostCentre: (costCentre) => window.electronAPI?.purchaseOrders.getSuppliersForCostCentre(costCentre),
      updateOrder: (orderNumber, updates) => window.electronAPI?.purchaseOrders.updateOrder(orderNumber, updates),
      logOrder: (orderNumber, supplier, delDate, note) => window.electronAPI?.purchaseOrders.logOrder(orderNumber, supplier, delDate, note),
      getOrderDetails: (orderNumber) => window.electronAPI?.purchaseOrders.getOrderDetails(orderNumber),
      batchRenderPDF: (orderNumbers, settings) => window.electronAPI?.purchaseOrders.batchRenderPDF(orderNumbers, settings),
      batchPrint: (orderNumbers, settings) => window.electronAPI?.purchaseOrders.batchPrint(orderNumbers, settings),
      batchEmail: (orderNumbers, settings) => window.electronAPI?.purchaseOrders.batchEmail(orderNumbers, settings),
      batchSavePDF: (orderNumbers, settings) => window.electronAPI?.purchaseOrders.batchSavePDF(orderNumbers, settings),
      getAllSuppliers: () => window.electronAPI?.purchaseOrders.getAllSuppliers(),
      addNominatedSupplier: (costCentre, supplierCode) => window.electronAPI?.purchaseOrders.addNominatedSupplier(costCentre, supplierCode),
      removeNominatedSupplier: (costCentre, supplierCode) => window.electronAPI?.purchaseOrders.removeNominatedSupplier(costCentre, supplierCode)
    },

    // Purchase Order Printing and PDF
    poPrint: {
      printOrder: (orderNumber, settings) => window.electronAPI?.poPrint.printOrder(orderNumber, settings),
      saveAsPDF: (orderNumber, settings) => window.electronAPI?.poPrint.saveAsPDF(orderNumber, settings),
      generatePDF: (orderNumber, settings) => window.electronAPI?.poPrint.generatePDF(orderNumber, settings),
      getPDFSettings: () => window.electronAPI?.poPrint.getPDFSettings()
    },

    // Assets Library
    assets: {
      upload: (assetData) => window.electronAPI?.assets.upload(assetData),
      getAll: (filters) => window.electronAPI?.assets.getAll(filters),
      get: (id) => window.electronAPI?.assets.get(id),
      getByName: (name) => window.electronAPI?.assets.getByName(name),
      delete: (id) => window.electronAPI?.assets.delete(id),
      update: (id, updates) => window.electronAPI?.assets.update(id, updates),
      getStats: () => window.electronAPI?.assets.getStats(),
      clearAll: () => window.electronAPI?.assets.clearAll()
    },

    // Template Partials
    partials: {
      save: (partialData) => window.electronAPI?.partials.save(partialData),
      getAll: (filters) => window.electronAPI?.partials.getAll(filters),
      get: (id) => window.electronAPI?.partials.get(id),
      getByName: (name) => window.electronAPI?.partials.getByName(name),
      delete: (id) => window.electronAPI?.partials.delete(id),
      update: (id, updates) => window.electronAPI?.partials.update(id, updates),
      getStats: () => window.electronAPI?.partials.getStats(),
      clearAll: () => window.electronAPI?.partials.clearAll(),
      getHandlebars: () => window.electronAPI?.partials.getHandlebars(),
      import: (partialsData) => window.electronAPI?.partials.import(partialsData),
      export: () => window.electronAPI?.partials.export()
    },

    // Seed Example Data
    seed: {
      all: () => window.electronAPI?.seed.all(),
      assets: () => window.electronAPI?.seed.assets(),
      partials: () => window.electronAPI?.seed.partials(),
      clearAll: () => window.electronAPI?.seed.clearAll(),
      clearPartials: () => window.electronAPI?.seed.clearPartials()
    },

    // Utility
    isElectron
  };
}
