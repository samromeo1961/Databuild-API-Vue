const { getDatabase, isSqliteAvailable } = require('./local-db');
const Store = require('electron-store');
const fs = require('fs');

// Electron-store (used as fallback if SQLite is not available, or as primary if SQLite migration hasn't happened)
const store = new Store({ name: 'preferences', defaults: { settings: {} } });

// Track if migration has been performed
let migrationCompleted = false;
let usingSqlite = false;

/**
 * Get default preferences
 * @returns {Object} Default preferences
 */
function getDefaultPreferences() {
  return {
    priceLevel: 0,
    defaultSystemDatabase: 'CROWNESYS',
    costCentreBank: '',
    supplierSubGroups: [2],
    folderStructure: {
      useTemplateName: true,
      useCostCentreFolders: true,
      customFolders: []
    },
    defaultTakeoffTypes: {
      area: 'area',
      linear: 'linear',
      count: 'count',
      segment: 'segment',
      part: 'item',
      dragDrop: 'item'
    },
    unitTakeoffMappings: {
      // Default unit to zzType mappings
      // Format: 'unit': 'zzType' where zzType is 'area', 'linear', 'segment', or 'count'
      'm²': 'area',
      'm2': 'area',
      'sqm': 'area',
      'm': 'linear',
      'lm': 'linear',
      'metre': 'linear',
      'no': 'count',
      'each': 'count',
      'nr': 'count'
    },
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
    theme: 'light',
    // Application Settings
    openExpanded: false,
    defaultTab: '/catalogue',
    // zzTakeoff Settings
    persistZzTakeoffSession: false
  };
}

/**
 * Try to migrate existing JSON data from electron-store to SQLite
 * Only runs if SQLite is available
 */
function migrateFromElectronStore() {
  if (migrationCompleted) return;

  if (!isSqliteAvailable()) {
    migrationCompleted = true;
    usingSqlite = false;
    return;
  }

  try {
    const db = getDatabase();
    if (!db) {
      migrationCompleted = true;
      usingSqlite = false;
      return;
    }

    // Check if old preferences.json exists
    const oldStorePath = store.path;
    if (!fs.existsSync(oldStorePath)) {
      console.log('✓ No existing preferences.json to migrate');
      migrationCompleted = true;
      usingSqlite = true;
      return;
    }

    // Get settings from old store
    const settings = store.get('settings');

    if (!settings || Object.keys(settings).length === 0) {
      console.log('✓ No preferences to migrate');
      migrationCompleted = true;
      usingSqlite = true;
      return;
    }

    console.log('⚙ Migrating preferences from JSON to SQLite...');

    // Insert or update preferences in SQLite
    const upsert = db.prepare(`
      INSERT INTO preferences (key, value, dateModified)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        dateModified = excluded.dateModified
    `);

    const now = new Date().toISOString();
    upsert.run('settings', JSON.stringify(settings), now);

    console.log('✓ Successfully migrated preferences to SQLite');

    // Backup old JSON file
    const backupPath = oldStorePath.replace('.json', '.backup.json');
    fs.copyFileSync(oldStorePath, backupPath);
    console.log(`✓ Backed up old preferences.json to: ${backupPath}`);

    migrationCompleted = true;
    usingSqlite = true;
  } catch (err) {
    console.error('Error migrating preferences:', err);
    migrationCompleted = true;
    usingSqlite = false;
  }
}

/**
 * Get all preferences
 * @returns {Object} Preferences object
 */
function getPreferences() {
  try {
    // Ensure migration is complete
    migrateFromElectronStore();

    let settings = {};

    if (usingSqlite) {
      const db = getDatabase();
      if (db) {
        const row = db.prepare(`
          SELECT value FROM preferences WHERE key = ?
        `).get('settings');

        if (row) {
          settings = JSON.parse(row.value);
        }
      }
    } else {
      // Use electron-store
      settings = store.get('settings', {});
    }

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
      unitTakeoffMappings: {
        ...defaults.unitTakeoffMappings,
        ...(settings?.unitTakeoffMappings || {})
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
    migrateFromElectronStore();

    if (usingSqlite) {
      const db = getDatabase();
      if (db) {
        const now = new Date().toISOString();

        const upsert = db.prepare(`
          INSERT INTO preferences (key, value, dateModified)
          VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            dateModified = excluded.dateModified
        `);

        upsert.run('settings', JSON.stringify(preferences), now);
      }
    } else {
      // Use electron-store
      store.set('settings', preferences);
    }

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
    migrateFromElectronStore();

    const defaults = getDefaultPreferences();

    if (usingSqlite) {
      const db = getDatabase();
      if (db) {
        const now = new Date().toISOString();

        const upsert = db.prepare(`
          INSERT INTO preferences (key, value, dateModified)
          VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            dateModified = excluded.dateModified
        `);

        upsert.run('settings', JSON.stringify(defaults), now);
      }
    } else {
      // Use electron-store
      store.set('settings', defaults);
    }

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

    // Save back to SQLite
    const result = savePreferences(settings);

    return {
      success: result.success,
      message: result.success ? 'Preference updated successfully' : result.error,
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
  getDefaultPreferences,
  migrateFromElectronStore
};
