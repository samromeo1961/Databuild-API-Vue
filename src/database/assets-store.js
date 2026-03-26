/**
 * Assets Store - Manages shared assets (logos, CSS, fonts, images)
 * Used across all report templates
 *
 * Stored in: ~\AppData\Roaming\dbx-connector-vue\assets.json
 */

const Store = require('electron-store');
const crypto = require('crypto');

// Initialize electron-store for assets
const assetsStore = new Store({
  name: 'assets',
  defaults: {
    assets: []
  }
});

/**
 * Add a new asset
 * @param {Object} asset - Asset data
 * @param {string} asset.name - Asset filename
 * @param {string} asset.type - MIME type (image/png, text/css, etc.)
 * @param {string} asset.content - Base64 encoded content
 * @param {string} asset.category - Category (logo, css, font, image, other)
 * @param {number} asset.size - File size in bytes
 * @returns {Object} Created asset with ID
 */
function addAsset(asset) {
  const assets = assetsStore.get('assets', []);

  // Check if asset with same name exists
  const existingIndex = assets.findIndex(a => a.name === asset.name);

  const assetData = {
    id: crypto.randomUUID(),
    name: asset.name,
    type: asset.type,
    content: asset.content,
    category: asset.category || 'other',
    size: asset.size || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    // Update existing asset
    assetData.id = assets[existingIndex].id;
    assetData.createdAt = assets[existingIndex].createdAt;
    assets[existingIndex] = assetData;
  } else {
    // Add new asset
    assets.push(assetData);
  }

  assetsStore.set('assets', assets);
  console.log(`✓ Asset saved: ${assetData.name} (${assetData.id})`);

  return assetData;
}

/**
 * Get all assets
 * @param {Object} filters - Optional filters
 * @param {string} filters.category - Filter by category
 * @returns {Array} List of assets (without content for performance)
 */
function getAllAssets(filters = {}) {
  const assets = assetsStore.get('assets', []);

  let filtered = assets;

  // Filter by category if specified
  if (filters.category) {
    filtered = filtered.filter(a => a.category === filters.category);
  }

  // Return without content for list view (performance)
  return filtered.map(asset => ({
    id: asset.id,
    name: asset.name,
    type: asset.type,
    category: asset.category,
    size: asset.size,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt
  }));
}

/**
 * Get asset by ID (with content)
 * @param {string} id - Asset ID
 * @returns {Object|null} Asset with content or null if not found
 */
function getAssetById(id) {
  const assets = assetsStore.get('assets', []);
  return assets.find(a => a.id === id) || null;
}

/**
 * Get asset by name (with content)
 * @param {string} name - Asset filename
 * @returns {Object|null} Asset with content or null if not found
 */
function getAssetByName(name) {
  const assets = assetsStore.get('assets', []);
  return assets.find(a => a.name === name) || null;
}

/**
 * Delete asset by ID
 * @param {string} id - Asset ID
 * @returns {boolean} True if deleted, false if not found
 */
function deleteAsset(id) {
  const assets = assetsStore.get('assets', []);
  const index = assets.findIndex(a => a.id === id);

  if (index === -1) {
    return false;
  }

  const deletedAsset = assets[index];
  assets.splice(index, 1);
  assetsStore.set('assets', assets);

  console.log(`✓ Asset deleted: ${deletedAsset.name} (${id})`);
  return true;
}

/**
 * Update asset metadata (not content)
 * @param {string} id - Asset ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated asset or null if not found
 */
function updateAsset(id, updates) {
  const assets = assetsStore.get('assets', []);
  const index = assets.findIndex(a => a.id === id);

  if (index === -1) {
    return null;
  }

  // Don't allow changing ID or content via update
  const allowedUpdates = {
    name: updates.name,
    category: updates.category
  };

  // Remove undefined values
  Object.keys(allowedUpdates).forEach(key => {
    if (allowedUpdates[key] === undefined) {
      delete allowedUpdates[key];
    }
  });

  assets[index] = {
    ...assets[index],
    ...allowedUpdates,
    updatedAt: new Date().toISOString()
  };

  assetsStore.set('assets', assets);
  console.log(`✓ Asset updated: ${assets[index].name} (${id})`);

  return assets[index];
}

/**
 * Clear all assets
 * @returns {number} Number of assets deleted
 */
function clearAllAssets() {
  const assets = assetsStore.get('assets', []);
  const count = assets.length;

  assetsStore.set('assets', []);
  console.log(`✓ Cleared ${count} assets`);

  return count;
}

/**
 * Get storage stats
 * @returns {Object} Storage statistics
 */
function getStats() {
  const assets = assetsStore.get('assets', []);

  const stats = {
    totalAssets: assets.length,
    totalSize: assets.reduce((sum, a) => sum + (a.size || 0), 0),
    byCategory: {}
  };

  // Count by category
  assets.forEach(asset => {
    const category = asset.category || 'other';
    if (!stats.byCategory[category]) {
      stats.byCategory[category] = { count: 0, size: 0 };
    }
    stats.byCategory[category].count++;
    stats.byCategory[category].size += asset.size || 0;
  });

  return stats;
}

module.exports = {
  addAsset,
  getAllAssets,
  getAssetById,
  getAssetByName,
  deleteAsset,
  updateAsset,
  clearAllAssets,
  getStats
};
