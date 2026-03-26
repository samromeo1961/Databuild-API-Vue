const Store = require('electron-store');

/**
 * BOQ Options Store
 * Persistent storage for Bill of Quantities user preferences and options
 * Uses electron-store to save settings locally
 */

const boqOptionsStore = new Store({
  name: 'boq-options',
  defaults: {
    // View Settings
    view: {
      showBudgetColumn: true,
      showSubGroupGrid: false
    },

    // New Items Settings
    newItems: {
      defaultPriceLevel: 0,
      zeroToManual: true,
      defaultQuantity: 1,
      insertionPoint: 'end' // 'before' | 'after' | 'end'
    },

    // General Options
    general: {
      closeOtherFunctions: false,
      autoSaveBudgets: true,
      autoRepriceOnLoad: false,
      autoHog: false,
      blockEditLoggedOrders: true,
      supplierAreaPricing: false,
      promptWholeCatalogue: true,
      lockPreferredSupplier: false,
      removeUnexplodedRecipes: false,
      explodeZeroQtyRecipes: false,
      snapshotInterval: 0, // 0 = disabled
      retainCostCentre: true
    },

    // Order Options
    orders: {
      logOrders: true,
      checkingCriteria: {},
      manualPricesOverride: true,
      forceOrderNumberFormat: true,
      autoInsertTodaysDate: true
    },

    // Order Display Settings
    orderDisplay: {
      gstDisplay: 'totalThenGst', // 'none' | 'perLine' | 'totalThenGst'
      itemReference: 'both', // 'none' | 'ourCode' | 'supplierRef' | 'both' | 'ourIfNoSupplier'
      priceDisplay: 'all', // 'supplierDefault' | 'all' | 'totalOnly' | 'none' | 'supplierOnly'
      printPictures: false
    },

    // Last used values (convenience)
    lastUsed: {
      job: null,
      priceLevel: 0,
      costCentre: null,
      load: 1
    }
  }
});

/**
 * Get all BOQ options
 * @returns {Object} Result with options object
 */
function getOptions() {
  try {
    return {
      success: true,
      options: boqOptionsStore.store
    };
  } catch (error) {
    console.error('Error getting BOQ options:', error);
    return {
      success: false,
      message: error.message,
      options: null
    };
  }
}

/**
 * Save BOQ options
 * @param {Object} options - Complete options object
 * @returns {Object} Result with success flag
 */
function saveOptions(options) {
  try {
    boqOptionsStore.store = options;
    console.log('✓ BOQ Options saved successfully');
    return {
      success: true,
      message: 'Options saved successfully'
    };
  } catch (error) {
    console.error('Error saving BOQ options:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Update a specific option key
 * @param {string} key - Dot-notation key (e.g., 'view.showBudgetColumn')
 * @param {*} value - New value
 * @returns {Object} Result with success flag
 */
function updateOption(key, value) {
  try {
    boqOptionsStore.set(key, value);
    console.log(`✓ BOQ Option updated: ${key} = ${value}`);
    return {
      success: true,
      message: 'Option updated successfully'
    };
  } catch (error) {
    console.error('Error updating BOQ option:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Reset BOQ options to defaults
 * @returns {Object} Result with success flag
 */
function resetOptions() {
  try {
    boqOptionsStore.clear();
    console.log('✓ BOQ Options reset to defaults');
    return {
      success: true,
      message: 'Options reset to defaults'
    };
  } catch (error) {
    console.error('Error resetting BOQ options:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get default options structure
 * @returns {Object} Default options
 */
function getDefaults() {
  return {
    success: true,
    defaults: boqOptionsStore.defaultValues
  };
}

/**
 * Save last used values for convenience
 * @param {Object} lastUsed - { job?, priceLevel?, costCentre?, load? }
 * @returns {Object} Result with success flag
 */
function saveLastUsed(lastUsed) {
  try {
    const current = boqOptionsStore.get('lastUsed', {});
    boqOptionsStore.set('lastUsed', { ...current, ...lastUsed });
    return {
      success: true,
      message: 'Last used values saved'
    };
  } catch (error) {
    console.error('Error saving last used values:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  getOptions,
  saveOptions,
  updateOption,
  resetOptions,
  getDefaults,
  saveLastUsed
};
