const Store = require('electron-store');

// Initialize electron-store for user preferences
// Data is stored in: C:\Users\<username>\AppData\Roaming\dbx-connector-vue\preferences.json
const preferencesStore = new Store({
  name: 'preferences',
  defaults: {
    settings: getDefaultPreferences()
  }
});

console.log('✓ Preferences storage initialized at:', preferencesStore.path);

/**
 * Get default preferences
 * @returns {Object} Default preferences
 */
function getDefaultPreferences() {
  return {
    priceLevel: 1,
    defaultSystemDatabase: 'CROWNESYS',
    costCentreBank: '',
    supplierSubGroups: [2],
    folderStructure: {
      useTemplateName: true,
      useCostCentreFolders: true,
      customFolders: []
    },
    defaultTakeoffTypes: {
      area: 'DBxArea',
      linear: 'DBxLinear',
      count: 'DBxCount',
      segment: 'DBxSegment',
      part: 'DBxPart',
      dragDrop: 'DBxD&D'
    },
    unitTakeoffMappings: {},
    zzTakeoff: {
      enabled: false,
      apiUrl: 'https://api.zztakeoff.com',
      email: '',
      defaultProject: null,
      defaultCostType: 'material',
      autoSendToRecents: true,
      includeFormulas: true
    },
    itemsPerPage: 50,
    theme: 'light'
  };
}

/**
 * Get all preferences
 * @returns {Object} Preferences object
 */
function getPreferences() {
  try {
    const settings = preferencesStore.get('settings');

    // Merge with defaults to ensure all keys exist
    const defaults = getDefaultPreferences();
    return {
      ...defaults,
      ...settings,
      folderStructure: {
        ...defaults.folderStructure,
        ...(settings?.folderStructure || {})
      },
      defaultTakeoffTypes: {
        ...defaults.defaultTakeoffTypes,
        ...(settings?.defaultTakeoffTypes || {})
      },
      zzTakeoff: {
        ...defaults.zzTakeoff,
        ...(settings?.zzTakeoff || {})
      }
    };
  } catch (err) {
    console.error('Error getting preferences:', err);
    return getDefaultPreferences();
  }
}

/**
 * Save preferences
 * @param {Object} preferences - Preferences object
 * @returns {Object} Result object with success status
 */
function savePreferences(preferences) {
  try {
    preferencesStore.set('settings', preferences);

    return {
      success: true,
      message: 'Preferences saved successfully'
    };
  } catch (err) {
    console.error('Error saving preferences:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Reset preferences to default
 * @returns {Object} Result object with success status
 */
function resetPreferences() {
  try {
    const defaults = getDefaultPreferences();
    preferencesStore.set('settings', defaults);

    return {
      success: true,
      message: 'Preferences reset to defaults',
      data: defaults
    };
  } catch (err) {
    console.error('Error resetting preferences:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Update a specific preference key
 * @param {string} key - Preference key (supports dot notation like 'zzTakeoff.enabled')
 * @param {any} value - New value
 * @returns {Object} Result object with success status
 */
function updatePreference(key, value) {
  try {
    const settings = getPreferences();

    // Handle dot notation for nested keys
    const keys = key.split('.');
    let current = settings;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;

    preferencesStore.set('settings', settings);

    return {
      success: true,
      message: 'Preference updated successfully',
      data: settings
    };
  } catch (err) {
    console.error('Error updating preference:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  getPreferences,
  savePreferences,
  resetPreferences,
  updatePreference,
  getDefaultPreferences
};
