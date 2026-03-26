/**
 * IPC Handlers for Assets Management
 * Handles asset upload, retrieval, and deletion
 */

const assetsStore = require('../database/assets-store');

/**
 * Upload a new asset
 */
async function uploadAsset(event, assetData) {
  try {
    const asset = assetsStore.addAsset(assetData);

    // Return without content for list view
    return {
      success: true,
      asset: {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        category: asset.category,
        size: asset.size,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt
      }
    };
  } catch (error) {
    console.error('Error uploading asset:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get all assets (without content)
 */
async function getAssets(event, filters = {}) {
  try {
    const assets = assetsStore.getAllAssets(filters);

    return {
      success: true,
      assets
    };
  } catch (error) {
    console.error('Error getting assets:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get asset by ID (with content)
 */
async function getAsset(event, id) {
  try {
    const asset = assetsStore.getAssetById(id);

    if (!asset) {
      return { success: false, message: 'Asset not found' };
    }

    return {
      success: true,
      asset
    };
  } catch (error) {
    console.error('Error getting asset:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get asset by name (with content)
 */
async function getAssetByName(event, name) {
  try {
    const asset = assetsStore.getAssetByName(name);

    if (!asset) {
      return { success: false, message: 'Asset not found' };
    }

    return {
      success: true,
      asset
    };
  } catch (error) {
    console.error('Error getting asset by name:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Delete an asset
 */
async function deleteAsset(event, id) {
  try {
    const deleted = assetsStore.deleteAsset(id);

    if (!deleted) {
      return { success: false, message: 'Asset not found' };
    }

    return {
      success: true,
      message: 'Asset deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting asset:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Update asset metadata
 */
async function updateAsset(event, id, updates) {
  try {
    const asset = assetsStore.updateAsset(id, updates);

    if (!asset) {
      return { success: false, message: 'Asset not found' };
    }

    return {
      success: true,
      asset: {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        category: asset.category,
        size: asset.size,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt
      }
    };
  } catch (error) {
    console.error('Error updating asset:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get storage statistics
 */
async function getAssetStats(event) {
  try {
    const stats = assetsStore.getStats();

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error getting asset stats:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Clear all assets
 */
async function clearAllAssets(event) {
  try {
    const count = assetsStore.clearAllAssets();

    return {
      success: true,
      message: `Cleared ${count} assets`,
      count
    };
  } catch (error) {
    console.error('Error clearing assets:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  uploadAsset,
  getAssets,
  getAsset,
  getAssetByName,
  deleteAsset,
  updateAsset,
  getAssetStats,
  clearAllAssets
};
