const {
  getColumnState,
  saveColumnState,
  deleteColumnState,
  getAllColumnStates,
  clearAllColumnStates
} = require('../database/column-states');

/**
 * Get column state for a specific tab
 * IPC Handler: 'column-states:get'
 */
async function handleGetColumnState(event, tabName) {
  try {
    const columnState = getColumnState(tabName);

    if (columnState) {
      return {
        success: true,
        data: columnState
      };
    } else {
      return {
        success: false,
        message: `No column state found for ${tabName}`
      };
    }
  } catch (err) {
    console.error('Error getting column state:', err);
    return {
      success: false,
      error: 'Failed to get column state',
      message: err.message
    };
  }
}

/**
 * Save column state for a specific tab
 * IPC Handler: 'column-states:save'
 */
async function handleSaveColumnState(event, { tabName, columnState }) {
  try {
    return saveColumnState(tabName, columnState);
  } catch (err) {
    console.error('Error saving column state:', err);
    return {
      success: false,
      error: 'Failed to save column state',
      message: err.message
    };
  }
}

/**
 * Delete column state for a specific tab
 * IPC Handler: 'column-states:delete'
 */
async function handleDeleteColumnState(event, tabName) {
  try {
    return deleteColumnState(tabName);
  } catch (err) {
    console.error('Error deleting column state:', err);
    return {
      success: false,
      error: 'Failed to delete column state',
      message: err.message
    };
  }
}

/**
 * Get all column states
 * IPC Handler: 'column-states:get-all'
 */
async function handleGetAllColumnStates(event, params) {
  try {
    const states = getAllColumnStates();

    return {
      success: true,
      data: states
    };
  } catch (err) {
    console.error('Error getting all column states:', err);
    return {
      success: false,
      error: 'Failed to get all column states',
      message: err.message
    };
  }
}

/**
 * Clear all column states
 * IPC Handler: 'column-states:clear-all'
 */
async function handleClearAllColumnStates(event, params) {
  try {
    return clearAllColumnStates();
  } catch (err) {
    console.error('Error clearing all column states:', err);
    return {
      success: false,
      error: 'Failed to clear all column states',
      message: err.message
    };
  }
}

module.exports = {
  handleGetColumnState,
  handleSaveColumnState,
  handleDeleteColumnState,
  handleGetAllColumnStates,
  handleClearAllColumnStates
};
