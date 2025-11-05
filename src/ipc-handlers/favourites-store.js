const {
  getFavourites,
  addToFavourites,
  removeFromFavourites,
  isInFavourites,
  updateFavourite,
  clearFavourites
} = require('../database/favourites-store');

/**
 * Get all favourites
 * IPC Handler: 'favourites-store:get-list'
 */
async function handleGetFavourites(event, params) {
  try {
    const favourites = getFavourites();
    return {
      success: true,
      data: favourites
    };
  } catch (err) {
    console.error('Error getting favourites:', err);
    return {
      success: false,
      error: 'Failed to get favourites',
      message: err.message,
      data: []
    };
  }
}

/**
 * Add to favourites
 * IPC Handler: 'favourites-store:add'
 */
async function handleAddToFavourites(event, item) {
  try {
    return addToFavourites(item);
  } catch (err) {
    console.error('Error adding to favourites:', err);
    return {
      success: false,
      error: 'Failed to add to favourites',
      message: err.message
    };
  }
}

/**
 * Remove from favourites
 * IPC Handler: 'favourites-store:remove'
 */
async function handleRemoveFromFavourites(event, params) {
  try {
    const { priceCode } = params;
    return removeFromFavourites(priceCode);
  } catch (err) {
    console.error('Error removing from favourites:', err);
    return {
      success: false,
      error: 'Failed to remove from favourites',
      message: err.message
    };
  }
}

/**
 * Check if in favourites
 * IPC Handler: 'favourites-store:check'
 */
async function handleIsInFavourites(event, params) {
  try {
    const { priceCode } = params;
    return isInFavourites(priceCode);
  } catch (err) {
    console.error('Error checking favourites:', err);
    return {
      success: false,
      error: 'Failed to check favourites',
      message: err.message,
      isInFavourites: false
    };
  }
}

/**
 * Update a favourite
 * IPC Handler: 'favourites-store:update'
 */
async function handleUpdateFavourite(event, updateData) {
  try {
    return updateFavourite(updateData);
  } catch (err) {
    console.error('Error updating favourite:', err);
    return {
      success: false,
      error: 'Failed to update favourite',
      message: err.message
    };
  }
}

/**
 * Clear all favourites
 * IPC Handler: 'favourites-store:clear'
 */
async function handleClearFavourites(event, params) {
  try {
    return clearFavourites();
  } catch (err) {
    console.error('Error clearing favourites:', err);
    return {
      success: false,
      error: 'Failed to clear favourites',
      message: err.message
    };
  }
}

module.exports = {
  handleGetFavourites,
  handleAddToFavourites,
  handleRemoveFromFavourites,
  handleIsInFavourites,
  handleUpdateFavourite,
  handleClearFavourites
};
