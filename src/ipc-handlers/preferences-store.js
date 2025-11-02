const {
  getPreferences,
  savePreferences,
  resetPreferences,
  updatePreference,
  getDefaultPreferences
} = require('../database/preferences-store');

/**
 * Get all preferences
 * IPC Handler: 'preferences-store:get'
 */
async function handleGetPreferences(event, params) {
  try {
    const preferences = getPreferences();
    return {
      success: true,
      data: preferences
    };
  } catch (err) {
    console.error('Error getting preferences:', err);
    return {
      success: false,
      error: 'Failed to get preferences',
      message: err.message,
      data: getDefaultPreferences()
    };
  }
}

/**
 * Save preferences
 * IPC Handler: 'preferences-store:save'
 */
async function handleSavePreferences(event, preferences) {
  try {
    return savePreferences(preferences);
  } catch (err) {
    console.error('Error saving preferences:', err);
    return {
      success: false,
      error: 'Failed to save preferences',
      message: err.message
    };
  }
}

/**
 * Reset preferences to default
 * IPC Handler: 'preferences-store:reset'
 */
async function handleResetPreferences(event, params) {
  try {
    return resetPreferences();
  } catch (err) {
    console.error('Error resetting preferences:', err);
    return {
      success: false,
      error: 'Failed to reset preferences',
      message: err.message
    };
  }
}

/**
 * Update a specific preference key
 * IPC Handler: 'preferences-store:update'
 */
async function handleUpdatePreference(event, { key, value }) {
  try {
    return updatePreference(key, value);
  } catch (err) {
    console.error('Error updating preference:', err);
    return {
      success: false,
      error: 'Failed to update preference',
      message: err.message
    };
  }
}

/**
 * Get default preferences
 * IPC Handler: 'preferences-store:get-defaults'
 */
async function handleGetDefaultPreferences(event, params) {
  try {
    return {
      success: true,
      data: getDefaultPreferences()
    };
  } catch (err) {
    console.error('Error getting default preferences:', err);
    return {
      success: false,
      error: 'Failed to get default preferences',
      message: err.message
    };
  }
}

module.exports = {
  handleGetPreferences,
  handleSavePreferences,
  handleResetPreferences,
  handleUpdatePreference,
  handleGetDefaultPreferences
};
