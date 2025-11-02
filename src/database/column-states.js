const Store = require('electron-store');

// Initialize electron-store for column states
// Data is stored in: C:\Users\<username>\AppData\Roaming\dbx-connector-vue\column-states.json
const columnStatesStore = new Store({
  name: 'column-states',
  defaults: {
    states: {}
  }
});

console.log('✓ Column states storage initialized at:', columnStatesStore.path);

/**
 * Get column state for a specific tab
 * @param {string} tabName - Tab name (e.g., 'catalogue', 'recipes', 'suppliers')
 * @returns {Object|null} Column state object or null if not found
 */
function getColumnState(tabName) {
  try {
    console.log(`[DEBUG BACKEND] getColumnState: Getting state for tab: ${tabName}`);
    const states = columnStatesStore.get('states', {});
    console.log('[DEBUG BACKEND] getColumnState: All states:', states);
    const tabState = states[tabName] || null;
    console.log(`[DEBUG BACKEND] getColumnState: State for ${tabName}:`, tabState);
    return tabState;
  } catch (err) {
    console.error(`[DEBUG BACKEND] Error getting column state for ${tabName}:`, err);
    return null;
  }
}

/**
 * Save column state for a specific tab
 * @param {string} tabName - Tab name
 * @param {string} columnState - JSON string of column state
 * @returns {Object} Result object with success status
 */
function saveColumnState(tabName, columnState) {
  try {
    console.log(`[DEBUG BACKEND] saveColumnState: Saving state for tab: ${tabName}`);
    console.log('[DEBUG BACKEND] saveColumnState: Column state data:', columnState);
    console.log('[DEBUG BACKEND] saveColumnState: Column state length:', columnState?.length);

    const states = columnStatesStore.get('states', {});
    states[tabName] = {
      columnState,
      updatedAt: new Date().toISOString()
    };
    columnStatesStore.set('states', states);

    console.log('[DEBUG BACKEND] saveColumnState: State saved successfully');
    console.log('[DEBUG BACKEND] saveColumnState: File location:', columnStatesStore.path);

    return {
      success: true,
      message: `Column state saved for ${tabName}`
    };
  } catch (err) {
    console.error(`[DEBUG BACKEND] Error saving column state for ${tabName}:`, err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Delete column state for a specific tab
 * @param {string} tabName - Tab name
 * @returns {Object} Result object with success status
 */
function deleteColumnState(tabName) {
  try {
    const states = columnStatesStore.get('states', {});
    delete states[tabName];
    columnStatesStore.set('states', states);

    return {
      success: true,
      message: `Column state deleted for ${tabName}`
    };
  } catch (err) {
    console.error(`Error deleting column state for ${tabName}:`, err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Get all column states
 * @returns {Object} All column states
 */
function getAllColumnStates() {
  try {
    return columnStatesStore.get('states', {});
  } catch (err) {
    console.error('Error getting all column states:', err);
    return {};
  }
}

/**
 * Clear all column states
 * @returns {Object} Result object with success status
 */
function clearAllColumnStates() {
  try {
    columnStatesStore.set('states', {});

    return {
      success: true,
      message: 'All column states cleared'
    };
  } catch (err) {
    console.error('Error clearing all column states:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  getColumnState,
  saveColumnState,
  deleteColumnState,
  getAllColumnStates,
  clearAllColumnStates
};
