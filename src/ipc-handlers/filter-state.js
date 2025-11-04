const filterStateDB = require('../database/filter-state');

/**
 * Get filter state for a specific tab
 * @param {Event} event - IPC event
 * @param {string} tabName - Name of the tab
 * @returns {Promise<Object>} Filter state object
 */
async function handleGetFilterState(event, tabName) {
  try {
    const filterState = filterStateDB.getFilterState(tabName);

    return {
      success: true,
      data: filterState
    };
  } catch (err) {
    console.error('Error in handleGetFilterState:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Save filter state for a specific tab
 * @param {Event} event - IPC event
 * @param {Object} params - Parameters object
 * @param {string} params.tabName - Name of the tab
 * @param {Object} params.filterState - Filter state object to save
 * @returns {Promise<Object>} Result object
 */
async function handleSaveFilterState(event, { tabName, filterState }) {
  try {
    if (!tabName) {
      return {
        success: false,
        error: 'Tab name is required'
      };
    }

    if (!filterState || typeof filterState !== 'object') {
      return {
        success: false,
        error: 'Filter state must be an object'
      };
    }

    const result = filterStateDB.saveFilterState(tabName, filterState);

    return result;
  } catch (err) {
    console.error('Error in handleSaveFilterState:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Delete filter state for a specific tab
 * @param {Event} event - IPC event
 * @param {string} tabName - Name of the tab
 * @returns {Promise<Object>} Result object
 */
async function handleDeleteFilterState(event, tabName) {
  try {
    if (!tabName) {
      return {
        success: false,
        error: 'Tab name is required'
      };
    }

    const result = filterStateDB.deleteFilterState(tabName);

    return result;
  } catch (err) {
    console.error('Error in handleDeleteFilterState:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Get all filter states
 * @param {Event} event - IPC event
 * @returns {Promise<Object>} All filter states
 */
async function handleGetAllFilterStates(event) {
  try {
    const allStates = filterStateDB.getAllFilterStates();

    return {
      success: true,
      data: allStates
    };
  } catch (err) {
    console.error('Error in handleGetAllFilterStates:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Clear all filter states
 * @param {Event} event - IPC event
 * @returns {Promise<Object>} Result object
 */
async function handleClearAllFilterStates(event) {
  try {
    const result = filterStateDB.clearAllFilterStates();

    return result;
  } catch (err) {
    console.error('Error in handleClearAllFilterStates:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  handleGetFilterState,
  handleSaveFilterState,
  handleDeleteFilterState,
  handleGetAllFilterStates,
  handleClearAllFilterStates
};
