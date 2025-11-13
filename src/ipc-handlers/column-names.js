const columnNamesStore = require('../database/column-names-store');

/**
 * Get all column names
 */
async function getColumnNames(event) {
  try {
    const columnNames = columnNamesStore.getColumnNames();
    return {
      success: true,
      data: columnNames
    };
  } catch (error) {
    console.error('Error getting column names:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Save column names
 */
async function saveColumnNames(event, columnNames) {
  try {
    const result = columnNamesStore.saveColumnNames(columnNames);
    return result;
  } catch (error) {
    console.error('Error saving column names:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update a specific column name
 */
async function updateColumnName(event, { field, displayName, zzTakeoffProperty }) {
  try {
    const result = columnNamesStore.updateColumnName(field, displayName, zzTakeoffProperty);
    return result;
  } catch (error) {
    console.error('Error updating column name:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Reset column names to defaults
 */
async function resetColumnNames(event) {
  try {
    const result = columnNamesStore.resetColumnNames();
    return result;
  } catch (error) {
    console.error('Error resetting column names:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get display name for a specific field
 */
async function getDisplayName(event, field) {
  try {
    const displayName = columnNamesStore.getDisplayName(field);
    return {
      success: true,
      data: displayName
    };
  } catch (error) {
    console.error('Error getting display name:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get zzTakeoff property name for a specific field
 */
async function getZzTakeoffProperty(event, field) {
  try {
    const zzTakeoffProperty = columnNamesStore.getZzTakeoffProperty(field);
    return {
      success: true,
      data: zzTakeoffProperty
    };
  } catch (error) {
    console.error('Error getting zzTakeoff property:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getColumnNames,
  saveColumnNames,
  updateColumnName,
  resetColumnNames,
  getDisplayName,
  getZzTakeoffProperty
};
