const {
  addSendHistory,
  getSendHistory,
  getSendHistoryById,
  clearSendHistory,
  deleteSendHistory,
  getSendHistoryStats
} = require('../database/history-db');

/**
 * Add a send history entry
 * IPC Handler: 'send-history:add'
 */
async function handleAddSendHistory(event, sendData) {
  try {
    return addSendHistory(sendData);
  } catch (err) {
    console.error('Error adding send history:', err);
    return {
      success: false,
      error: 'Failed to add send history',
      message: err.message
    };
  }
}

/**
 * Get all send history entries
 * IPC Handler: 'send-history:get-list'
 */
async function handleGetSendHistory(event, params) {
  try {
    return getSendHistory(params);
  } catch (err) {
    console.error('Error getting send history:', err);
    return {
      success: false,
      error: 'Failed to get send history',
      message: err.message,
      data: []
    };
  }
}

/**
 * Get a single send history entry by ID
 * IPC Handler: 'send-history:get-by-id'
 */
async function handleGetSendHistoryById(event, { id }) {
  try {
    return getSendHistoryById(id);
  } catch (err) {
    console.error('Error getting send history by ID:', err);
    return {
      success: false,
      error: 'Failed to get send history entry',
      message: err.message
    };
  }
}

/**
 * Clear all send history
 * IPC Handler: 'send-history:clear'
 */
async function handleClearSendHistory(event, params) {
  try {
    return clearSendHistory();
  } catch (err) {
    console.error('Error clearing send history:', err);
    return {
      success: false,
      error: 'Failed to clear send history',
      message: err.message
    };
  }
}

/**
 * Delete a specific send history entry
 * IPC Handler: 'send-history:delete'
 */
async function handleDeleteSendHistory(event, { id }) {
  try {
    return deleteSendHistory(id);
  } catch (err) {
    console.error('Error deleting send history:', err);
    return {
      success: false,
      error: 'Failed to delete send history entry',
      message: err.message
    };
  }
}

/**
 * Get send history statistics
 * IPC Handler: 'send-history:get-stats'
 */
async function handleGetSendHistoryStats(event, params) {
  try {
    return getSendHistoryStats();
  } catch (err) {
    console.error('Error getting send history stats:', err);
    return {
      success: false,
      error: 'Failed to get send history statistics',
      message: err.message
    };
  }
}

module.exports = {
  handleAddSendHistory,
  handleGetSendHistory,
  handleGetSendHistoryById,
  handleClearSendHistory,
  handleDeleteSendHistory,
  handleGetSendHistoryStats
};
