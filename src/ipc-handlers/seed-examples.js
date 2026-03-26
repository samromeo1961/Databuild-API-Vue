/**
 * IPC Handlers for Seeding Example Data
 */

const seedExamples = require('../database/seed-examples');

/**
 * Seed both Assets and Partials with examples
 */
async function seedAll(event) {
  try {
    const result = seedExamples.seedAll();
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('Error seeding examples:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Seed only Assets
 */
async function seedAssets(event) {
  try {
    const result = seedExamples.seedAssets();
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('Error seeding assets:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Seed only Partials
 */
async function seedPartials(event) {
  try {
    const result = seedExamples.seedPartials();
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('Error seeding partials:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Clear all example data
 */
async function clearAll(event) {
  try {
    const result = seedExamples.clearAll();
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('Error clearing examples:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Clear only Partials
 */
async function clearPartials(event) {
  try {
    const partialsStore = require('../database/partials-store');
    const partialsCleared = partialsStore.clearAllPartials();
    return {
      success: true,
      result: {
        partialsCleared
      }
    };
  } catch (error) {
    console.error('Error clearing partials:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  seedAll,
  seedAssets,
  seedPartials,
  clearAll,
  clearPartials
};
