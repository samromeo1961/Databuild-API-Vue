const Store = require('electron-store');

// Initialize electron-store for filter states
// Data is stored in: C:\Users\<username>\AppData\Roaming\dbx-connector-vue\filter-states.json
const filterStateStore = new Store({
  name: 'filter-states',
  defaults: {}
});

console.log('✓ Filter state storage initialized at:', filterStateStore.path);

/**
 * Get filter state for a specific tab
 * @param {string} tabName - Name of the tab (e.g., 'catalogue', 'recipes', 'suppliers')
 * @returns {Object|null} Filter state object or null if not found
 */
function getFilterState(tabName) {
  try {
    return filterStateStore.get(tabName, null);
  } catch (err) {
    console.error(`Error getting filter state for ${tabName}:`, err);
    return null;
  }
}

/**
 * Save filter state for a specific tab
 * @param {string} tabName - Name of the tab
 * @param {Object} filterState - Filter state object
 * @returns {Object} Result object with success status
 */
function saveFilterState(tabName, filterState) {
  try {
    filterStateStore.set(tabName, filterState);
    console.log(`✓ Filter state saved for ${tabName}:`, filterState);

    return {
      success: true,
      message: `Filter state saved for ${tabName}`
    };
  } catch (err) {
    console.error(`Error saving filter state for ${tabName}:`, err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Delete filter state for a specific tab
 * @param {string} tabName - Name of the tab
 * @returns {Object} Result object with success status
 */
function deleteFilterState(tabName) {
  try {
    filterStateStore.delete(tabName);

    return {
      success: true,
      message: `Filter state deleted for ${tabName}`
    };
  } catch (err) {
    console.error(`Error deleting filter state for ${tabName}:`, err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Get all filter states
 * @returns {Object} All filter states
 */
function getAllFilterStates() {
  try {
    return filterStateStore.store;
  } catch (err) {
    console.error('Error getting all filter states:', err);
    return {};
  }
}

/**
 * Clear all filter states
 * @returns {Object} Result object with success status
 */
function clearAllFilterStates() {
  try {
    filterStateStore.clear();

    return {
      success: true,
      message: 'All filter states cleared'
    };
  } catch (err) {
    console.error('Error clearing all filter states:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  getFilterState,
  saveFilterState,
  deleteFilterState,
  getAllFilterStates,
  clearAllFilterStates
};
