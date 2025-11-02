const Store = require('electron-store');

// Initialize electron-store for send history
// Data is stored in: C:\Users\<username>\AppData\Roaming\dbx-connector-vue\send-history.json
const historyStore = new Store({
  name: 'send-history',
  defaults: {
    history: []
  }
});

console.log('✓ Send history storage initialized at:', historyStore.path);

/**
 * Add a send history entry
 * @param {Object} sendData - Send history data
 * @returns {Object} Result object with success status
 */
function addSendHistory(sendData) {
  try {
    const timestamp = Date.now();
    const id = `send_${timestamp}`;

    const historyEntry = {
      id,
      timestamp,
      date: new Date().toISOString(),
      projectId: sendData.projectId,
      projectName: sendData.projectName,
      itemCount: sendData.itemCount,
      items: sendData.items || [],
      status: sendData.status || 'success',
      message: sendData.message
    };

    // Get current history
    const history = historyStore.get('history', []);

    // Add new entry at the beginning
    history.unshift(historyEntry);

    // Save back to store
    historyStore.set('history', history);

    return {
      success: true,
      id: id
    };
  } catch (err) {
    console.error('Error adding send history:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Get all send history entries
 * @param {Object} params - Query parameters (limit, offset, projectId)
 * @returns {Object} Result object with history data
 */
function getSendHistory(params = {}) {
  try {
    const { limit, offset = 0, projectId } = params;

    // Get all history
    let history = historyStore.get('history', []);

    // Filter by project if specified
    if (projectId) {
      history = history.filter(entry => entry.projectId === projectId);
    }

    // Sort by timestamp (most recent first) - should already be sorted but ensure it
    history.sort((a, b) => b.timestamp - a.timestamp);

    // Get total before pagination
    const total = history.length;

    // Apply pagination if limit specified
    if (limit) {
      history = history.slice(offset, offset + limit);
    }

    return {
      success: true,
      data: history,
      pagination: {
        total,
        offset,
        limit: limit || total
      }
    };
  } catch (err) {
    console.error('Error getting send history:', err);
    return {
      success: false,
      error: err.message,
      data: []
    };
  }
}

/**
 * Get a single send history entry by ID
 * @param {string} id - History entry ID
 * @returns {Object} Result object with history entry
 */
function getSendHistoryById(id) {
  try {
    const history = historyStore.get('history', []);
    const entry = history.find(item => item.id === id);

    if (!entry) {
      return {
        success: false,
        error: 'History entry not found'
      };
    }

    return {
      success: true,
      data: entry
    };
  } catch (err) {
    console.error('Error getting send history by ID:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Clear all send history
 * @returns {Object} Result object with success status
 */
function clearSendHistory() {
  try {
    const history = historyStore.get('history', []);
    const count = history.length;

    historyStore.set('history', []);

    return {
      success: true,
      message: 'Send history cleared successfully',
      deletedCount: count
    };
  } catch (err) {
    console.error('Error clearing send history:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Delete a specific send history entry
 * @param {string} id - History entry ID
 * @returns {Object} Result object with success status
 */
function deleteSendHistory(id) {
  try {
    const history = historyStore.get('history', []);
    const initialLength = history.length;

    const filteredHistory = history.filter(entry => entry.id !== id);

    if (filteredHistory.length === initialLength) {
      return {
        success: false,
        error: 'History entry not found'
      };
    }

    historyStore.set('history', filteredHistory);

    return {
      success: true,
      message: 'Send history entry deleted successfully',
      deletedCount: 1
    };
  } catch (err) {
    console.error('Error deleting send history:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Get send history statistics
 * @returns {Object} Statistics about send history
 */
function getSendHistoryStats() {
  try {
    const history = historyStore.get('history', []);

    const totalSends = history.length;
    const successfulSends = history.filter(entry => entry.status === 'success').length;
    const failedSends = totalSends - successfulSends;
    const totalItemsSent = history.reduce((sum, entry) => sum + (entry.itemCount || 0), 0);
    const uniqueProjects = new Set(history.map(entry => entry.projectId)).size;

    return {
      success: true,
      stats: {
        totalSends,
        successfulSends,
        failedSends,
        totalItemsSent,
        uniqueProjects
      }
    };
  } catch (err) {
    console.error('Error getting send history stats:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  addSendHistory,
  getSendHistory,
  getSendHistoryById,
  clearSendHistory,
  deleteSendHistory,
  getSendHistoryStats
};
