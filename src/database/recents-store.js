const Store = require('electron-store');

const MAX_RECENTS = 100;

// Initialize electron-store for recents
// Data is stored in: C:\Users\<username>\AppData\Roaming\dbx-connector-vue\recents.json
const recentsStore = new Store({
  name: 'recents',
  defaults: {
    recents: {}
  }
});

console.log('✓ Recents storage initialized at:', recentsStore.path);

/**
 * Get recent items
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Maximum number of items to return
 * @returns {Array} Array of recent items
 */
function getRecents(params = {}) {
  try {
    const { limit = MAX_RECENTS } = params;
    const recentsObj = recentsStore.get('recents', {});
    const recents = Object.keys(recentsObj).map(key => ({
      _key: key,
      ...recentsObj[key]
    }));
    // Sort by date used (most recent first)
    return recents
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, limit);
  } catch (err) {
    console.error('Error getting recents:', err);
    return [];
  }
}

/**
 * Add item to recents
 * @param {Object} item - Item to add
 * @returns {Object} Result object with success status
 */
function addToRecents(item) {
  try {
    const key = item.PriceCode || item.priceCode;
    const recentsObj = recentsStore.get('recents', {});

    const recentItem = {
      ...item,
      zzType: item.zzType || recentsObj[key]?.zzType || 'count', // Preserve existing zzType or default to 'count'
      lastUsed: new Date().toISOString(),
      useCount: (recentsObj[key]?.useCount || 0) + 1,
      userId: 'default'
    };

    recentsObj[key] = recentItem;

    // Maintain max limit
    const recentsArray = Object.keys(recentsObj).map(k => ({
      _key: k,
      ...recentsObj[k]
    }));

    if (recentsArray.length > MAX_RECENTS) {
      // Sort by last used and keep only MAX_RECENTS items
      const sortedRecents = recentsArray.sort((a, b) =>
        new Date(b.lastUsed) - new Date(a.lastUsed)
      );

      const keepRecents = sortedRecents.slice(0, MAX_RECENTS);
      const newRecentsObj = {};
      keepRecents.forEach(r => {
        const { _key, ...data } = r;
        newRecentsObj[_key] = data;
      });
      recentsStore.set('recents', newRecentsObj);
    } else {
      recentsStore.set('recents', recentsObj);
    }

    return {
      success: true,
      message: 'Item added to recents'
    };
  } catch (err) {
    console.error('Error adding to recents:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Update a recent item (e.g., to update zzType)
 * @param {Object} updateData - Data to update
 * @param {string} updateData.PriceCode - Item price code
 * @returns {Object} Result object with success status
 */
function updateRecent(updateData) {
  try {
    const { PriceCode, ...updates } = updateData;
    const recentsObj = recentsStore.get('recents', {});

    if (!recentsObj[PriceCode]) {
      return {
        success: false,
        error: 'Item not found in recents'
      };
    }

    // Merge updates with existing item
    recentsObj[PriceCode] = {
      ...recentsObj[PriceCode],
      ...updates
    };

    recentsStore.set('recents', recentsObj);

    return {
      success: true,
      message: 'Recent updated successfully'
    };
  } catch (err) {
    console.error('Error updating recent:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Clear all recents
 * @returns {Object} Result object with success status
 */
function clearRecents() {
  try {
    recentsStore.set('recents', {});

    return {
      success: true,
      message: 'All recents cleared'
    };
  } catch (err) {
    console.error('Error clearing recents:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  getRecents,
  addToRecents,
  updateRecent,
  clearRecents
};
