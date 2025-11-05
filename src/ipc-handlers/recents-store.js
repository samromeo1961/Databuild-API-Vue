const {
  getRecents,
  addToRecents,
  updateRecent,
  clearRecents
} = require('../database/recents-store');

/**
 * Get all recents
 * IPC Handler: 'recents-store:get-list'
 */
async function handleGetRecents(event, params) {
  try {
    const recents = getRecents(params);
    return {
      success: true,
      data: recents
    };
  } catch (err) {
    console.error('Error getting recents:', err);
    return {
      success: false,
      error: 'Failed to get recents',
      message: err.message,
      data: []
    };
  }
}

/**
 * Add to recents
 * IPC Handler: 'recents-store:add'
 */
async function handleAddToRecents(event, item) {
  try {
    return addToRecents(item);
  } catch (err) {
    console.error('Error adding to recents:', err);
    return {
      success: false,
      error: 'Failed to add to recents',
      message: err.message
    };
  }
}

/**
 * Update a recent
 * IPC Handler: 'recents-store:update'
 */
async function handleUpdateRecent(event, updateData) {
  try {
    return updateRecent(updateData);
  } catch (err) {
    console.error('Error updating recent:', err);
    return {
      success: false,
      error: 'Failed to update recent',
      message: err.message
    };
  }
}

/**
 * Clear all recents
 * IPC Handler: 'recents-store:clear'
 */
async function handleClearRecents(event, params) {
  try {
    return clearRecents();
  } catch (err) {
    console.error('Error clearing recents:', err);
    return {
      success: false,
      error: 'Failed to clear recents',
      message: err.message
    };
  }
}

module.exports = {
  handleGetRecents,
  handleAddToRecents,
  handleUpdateRecent,
  handleClearRecents
};
