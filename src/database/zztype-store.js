const Store = require('electron-store');

// Create store for zzType preferences
// Maps PriceCode -> zzType ('area', 'linear', 'segment', 'count')
const zzTypeStore = new Store({
  name: 'zztype-preferences',
  defaults: {}
});

console.log('✓ zzType preferences storage initialized at:', zzTypeStore.path);

/**
 * Get zzType for a specific item
 * @param {string} priceCode - The item's PriceCode
 * @returns {string|null} - The zzType or null if not set
 */
function getZzType(priceCode) {
  return zzTypeStore.get(priceCode, null);
}

/**
 * Set zzType for a specific item
 * @param {string} priceCode - The item's PriceCode
 * @param {string} zzType - The type: 'area', 'linear', 'segment', or 'count'
 */
function setZzType(priceCode, zzType) {
  const validTypes = ['area', 'linear', 'segment', 'count'];

  if (!validTypes.includes(zzType.toLowerCase())) {
    throw new Error(`Invalid zzType: ${zzType}. Must be one of: ${validTypes.join(', ')}`);
  }

  zzTypeStore.set(priceCode, zzType.toLowerCase());
}

/**
 * Get all zzType preferences
 * @returns {Object} - Map of PriceCode -> zzType
 */
function getAllZzTypes() {
  return zzTypeStore.store;
}

/**
 * Delete zzType for a specific item
 * @param {string} priceCode - The item's PriceCode
 */
function deleteZzType(priceCode) {
  zzTypeStore.delete(priceCode);
}

/**
 * Clear all zzType preferences
 */
function clearAllZzTypes() {
  zzTypeStore.clear();
}

module.exports = {
  getZzType,
  setZzType,
  getAllZzTypes,
  deleteZzType,
  clearAllZzTypes
};
