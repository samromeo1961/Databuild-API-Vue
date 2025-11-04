const zzTypeStore = require('../database/zztype-store');

/**
 * Get zzType for an item
 */
async function getZzType(event, priceCode) {
  try {
    const zzType = zzTypeStore.getZzType(priceCode);
    return { success: true, zzType };
  } catch (error) {
    console.error('Error getting zzType:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Set zzType for an item
 */
async function setZzType(event, { priceCode, zzType }) {
  try {
    zzTypeStore.setZzType(priceCode, zzType);
    return { success: true };
  } catch (error) {
    console.error('Error setting zzType:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get all zzType preferences
 */
async function getAllZzTypes(event) {
  try {
    const allTypes = zzTypeStore.getAllZzTypes();
    return { success: true, types: allTypes };
  } catch (error) {
    console.error('Error getting all zzTypes:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Delete zzType for an item
 */
async function deleteZzType(event, priceCode) {
  try {
    zzTypeStore.deleteZzType(priceCode);
    return { success: true };
  } catch (error) {
    console.error('Error deleting zzType:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  getZzType,
  setZzType,
  getAllZzTypes,
  deleteZzType
};
