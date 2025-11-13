const { getDatabase, isSqliteAvailable } = require('./local-db');
const Store = require('electron-store');
const fs = require('fs');

// Electron-store (used as fallback if SQLite is not available, or as primary if SQLite migration hasn't happened)
const store = new Store({ name: 'column-names', defaults: { columnNames: {} } });

// Track if migration has been performed
let migrationCompleted = false;
let usingSqlite = false;

/**
 * Get default column name mappings
 * Maps database field names to display names and zzTakeoff property names
 * @returns {Object} Default column name mappings
 */
function getDefaultColumnNames() {
  return {
    // Database Field Name -> { displayName: 'Column Header', zzTakeoffProperty: 'property name for zzTakeoff' }
    PriceCode: {
      displayName: 'Code',
      zzTakeoffProperty: 'sku'
    },
    ItemCode: {
      displayName: 'Code',
      zzTakeoffProperty: 'sku'
    },
    Description: {
      displayName: 'Description',
      zzTakeoffProperty: 'name'
    },
    Unit: {
      displayName: 'Unit',
      zzTakeoffProperty: 'unit'
    },
    Price: {
      displayName: 'Price',
      zzTakeoffProperty: 'Cost Each'
    },
    LatestPrice: {
      displayName: 'Price',
      zzTakeoffProperty: 'Cost Each'
    },
    CostCentre: {
      displayName: 'Cost Centre',
      zzTakeoffProperty: 'cost centre'
    },
    CostCentreName: {
      displayName: 'Cost Centre Name',
      zzTakeoffProperty: 'cost centre name'
    },
    SubGroup: {
      displayName: 'Sub Group',
      zzTakeoffProperty: 'sub group'
    },
    Recipe: {
      displayName: 'Recipe',
      zzTakeoffProperty: 'recipe'
    },
    Archived: {
      displayName: 'Archived',
      zzTakeoffProperty: 'archived'
    },
    zzType: {
      displayName: 'zzType',
      zzTakeoffProperty: 'type'
    },
    DateAdded: {
      displayName: 'Date Added',
      zzTakeoffProperty: 'date added'
    },
    LastAccessed: {
      displayName: 'Last Accessed',
      zzTakeoffProperty: 'last accessed'
    },
    Quantity: {
      displayName: 'Quantity',
      zzTakeoffProperty: 'quantity'
    },
    SupplierName: {
      displayName: 'Supplier Name',
      zzTakeoffProperty: 'supplier name'
    },
    Supplier_Code: {
      displayName: 'Supplier Code',
      zzTakeoffProperty: 'supplier code'
    },
    ContactName: {
      displayName: 'Contact Name',
      zzTakeoffProperty: 'contact name'
    },
    Phone: {
      displayName: 'Phone',
      zzTakeoffProperty: 'phone'
    },
    Email: {
      displayName: 'Email',
      zzTakeoffProperty: 'email'
    }
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

    // Check if old column-names.json exists
    const oldStorePath = store.path;
    if (!fs.existsSync(oldStorePath)) {
      console.log('✓ No existing column-names.json to migrate');
      migrationCompleted = true;
      usingSqlite = true;
      return;
    }

    // Get column names from old store
    const columnNames = store.get('columnNames');

    if (!columnNames || Object.keys(columnNames).length === 0) {
      console.log('✓ No column names to migrate');
      migrationCompleted = true;
      usingSqlite = true;
      return;
    }

    console.log('⚙ Migrating column names from JSON to SQLite...');

    // Insert or update column names in SQLite
    const upsert = db.prepare(`
      INSERT INTO preferences (key, value, dateModified)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        dateModified = excluded.dateModified
    `);

    const now = new Date().toISOString();
    upsert.run('columnNames', JSON.stringify(columnNames), now);

    console.log('✓ Successfully migrated column names to SQLite');

    // Backup old JSON file
    const backupPath = oldStorePath.replace('.json', '.backup.json');
    fs.copyFileSync(oldStorePath, backupPath);
    console.log(`✓ Backed up old column-names.json to: ${backupPath}`);

    migrationCompleted = true;
    usingSqlite = true;
  } catch (err) {
    console.error('Error migrating column names:', err);
    migrationCompleted = true;
    usingSqlite = false;
  }
}

/**
 * Get all column names
 * @returns {Object} Column names object mapping field names to display names and zzTakeoff properties
 */
function getColumnNames() {
  try {
    // Ensure migration is complete
    migrateFromElectronStore();

    let columnNames = {};

    if (usingSqlite) {
      const db = getDatabase();
      if (db) {
        const row = db.prepare(`
          SELECT value FROM preferences WHERE key = ?
        `).get('columnNames');

        if (row) {
          columnNames = JSON.parse(row.value);
        }
      }
    } else {
      // Use electron-store
      columnNames = store.get('columnNames', {});
    }

    // Merge with defaults to ensure all keys exist
    const defaults = getDefaultColumnNames();
    const merged = { ...defaults };

    // Override defaults with user customizations
    Object.keys(columnNames).forEach(field => {
      if (defaults[field]) {
        merged[field] = {
          ...defaults[field],
          ...columnNames[field]
        };
      } else {
        // User added a custom field not in defaults
        merged[field] = columnNames[field];
      }
    });

    return merged;
  } catch (err) {
    console.error('Error getting column names:', err);
    return getDefaultColumnNames();
  }
}

/**
 * Save column names
 * @param {Object} columnNames - Column names object
 * @returns {Object} Result object with success status
 */
function saveColumnNames(columnNames) {
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

        upsert.run('columnNames', JSON.stringify(columnNames), now);
      }
    } else {
      // Use electron-store
      store.set('columnNames', columnNames);
    }

    return {
      success: true,
      message: 'Column names saved successfully'
    };
  } catch (err) {
    console.error('Error saving column names:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Update a specific column name mapping
 * @param {string} field - Database field name
 * @param {string} displayName - Display name for column header
 * @param {string} zzTakeoffProperty - Property name for zzTakeoff integration
 * @returns {Object} Result object with success status
 */
function updateColumnName(field, displayName, zzTakeoffProperty) {
  try {
    const columnNames = getColumnNames();

    // Update the specific field
    columnNames[field] = {
      displayName: displayName || columnNames[field]?.displayName || field,
      zzTakeoffProperty: zzTakeoffProperty || columnNames[field]?.zzTakeoffProperty || field.toLowerCase()
    };

    // Save back
    const result = saveColumnNames(columnNames);

    return {
      success: result.success,
      message: result.success ? `Column name for ${field} updated successfully` : result.error,
      data: columnNames
    };
  } catch (err) {
    console.error('Error updating column name:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Reset column names to default
 * @returns {Object} Result object with success status
 */
function resetColumnNames() {
  try {
    migrateFromElectronStore();

    const defaults = getDefaultColumnNames();

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

        upsert.run('columnNames', JSON.stringify(defaults), now);
      }
    } else {
      // Use electron-store
      store.set('columnNames', defaults);
    }

    return {
      success: true,
      message: 'Column names reset to defaults',
      data: defaults
    };
  } catch (err) {
    console.error('Error resetting column names:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Get display name for a field
 * @param {string} field - Database field name
 * @returns {string} Display name
 */
function getDisplayName(field) {
  const columnNames = getColumnNames();
  return columnNames[field]?.displayName || field;
}

/**
 * Get zzTakeoff property name for a field
 * @param {string} field - Database field name
 * @returns {string} zzTakeoff property name
 */
function getZzTakeoffProperty(field) {
  const columnNames = getColumnNames();
  return columnNames[field]?.zzTakeoffProperty || field.toLowerCase();
}

module.exports = {
  getColumnNames,
  saveColumnNames,
  updateColumnName,
  resetColumnNames,
  getDisplayName,
  getZzTakeoffProperty,
  getDefaultColumnNames,
  migrateFromElectronStore
};
