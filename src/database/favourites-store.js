const Store = require('electron-store');

// Initialize electron-store for favourites
// Data is stored in: C:\Users\<username>\AppData\Roaming\dbx-connector-vue\favourites.json
const favouritesStore = new Store({
  name: 'favourites',
  defaults: {
    favourites: {}
  }
});

console.log('✓ Favourites storage initialized at:', favouritesStore.path);

/**
 * Get all favourite items
 * @returns {Array} Array of favourite items
 */
function getFavourites() {
  try {
    const favouritesObj = favouritesStore.get('favourites', {});
    const favourites = Object.keys(favouritesObj).map(key => ({
      _key: key,
      ...favouritesObj[key]
    }));
    // Sort by date added (most recent first)
    return favourites.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  } catch (err) {
    console.error('Error getting favourites:', err);
    return [];
  }
}

/**
 * Add item to favourites
 * @param {Object} item - Item to add
 * @returns {Object} Result object with success status
 */
function addToFavourites(item) {
  try {
    const key = item.PriceCode || item.priceCode;
    const favouriteItem = {
      ...item,
      zzType: item.zzType || 'count', // Default to 'count' if not specified
      dateAdded: new Date().toISOString(),
      userId: 'default'
    };

    const favouritesObj = favouritesStore.get('favourites', {});
    favouritesObj[key] = favouriteItem;
    favouritesStore.set('favourites', favouritesObj);

    return {
      success: true,
      message: 'Item added to favourites'
    };
  } catch (err) {
    console.error('Error adding to favourites:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Remove item from favourites
 * @param {string} priceCode - Item price code
 * @returns {Object} Result object with success status
 */
function removeFromFavourites(priceCode) {
  try {
    const favouritesObj = favouritesStore.get('favourites', {});
    delete favouritesObj[priceCode];
    favouritesStore.set('favourites', favouritesObj);

    return {
      success: true,
      message: 'Item removed from favourites'
    };
  } catch (err) {
    console.error('Error removing from favourites:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Check if item is in favourites
 * @param {string} priceCode - Item price code
 * @returns {Object} Result object with success status and boolean
 */
function isInFavourites(priceCode) {
  try {
    const favouritesObj = favouritesStore.get('favourites', {});
    const exists = favouritesObj.hasOwnProperty(priceCode);

    return {
      success: true,
      isInFavourites: exists
    };
  } catch (err) {
    console.error('Error checking favourites:', err);
    return {
      success: false,
      error: err.message,
      isInFavourites: false
    };
  }
}

/**
 * Update a favourite item (e.g., to update zzType)
 * @param {Object} updateData - Data to update
 * @param {string} updateData.PriceCode - Item price code
 * @returns {Object} Result object with success status
 */
function updateFavourite(updateData) {
  try {
    const { PriceCode, ...updates } = updateData;
    const favouritesObj = favouritesStore.get('favourites', {});

    if (!favouritesObj[PriceCode]) {
      return {
        success: false,
        error: 'Item not found in favourites'
      };
    }

    // Merge updates with existing item
    favouritesObj[PriceCode] = {
      ...favouritesObj[PriceCode],
      ...updates
    };

    favouritesStore.set('favourites', favouritesObj);

    return {
      success: true,
      message: 'Favourite updated successfully'
    };
  } catch (err) {
    console.error('Error updating favourite:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Clear all favourites
 * @returns {Object} Result object with success status
 */
function clearFavourites() {
  try {
    favouritesStore.set('favourites', {});

    return {
      success: true,
      message: 'All favourites cleared'
    };
  } catch (err) {
    console.error('Error clearing favourites:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  getFavourites,
  addToFavourites,
  removeFromFavourites,
  isInFavourites,
  updateFavourite,
  clearFavourites
};
