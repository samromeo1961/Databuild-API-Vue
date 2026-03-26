/**
 * IPC Handlers for Template Partials Management
 * Handles partial CRUD operations and Handlebars integration
 */

const partialsStore = require('../database/partials-store');

/**
 * Save a partial (create or update)
 */
async function savePartial(event, partialData) {
  try {
    const partial = partialsStore.savePartial(partialData);

    return {
      success: true,
      partial: {
        id: partial.id,
        name: partial.name,
        description: partial.description,
        category: partial.category,
        createdAt: partial.createdAt,
        updatedAt: partial.updatedAt,
        contentLength: partial.content ? partial.content.length : 0
      }
    };
  } catch (error) {
    console.error('Error saving partial:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get all partials (without content)
 */
async function getPartials(event, filters = {}) {
  try {
    const partials = partialsStore.getAllPartials(filters);

    return {
      success: true,
      partials
    };
  } catch (error) {
    console.error('Error getting partials:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get partial by ID (with content)
 */
async function getPartial(event, id) {
  try {
    const partial = partialsStore.getPartialById(id);

    if (!partial) {
      return { success: false, message: 'Partial not found' };
    }

    return {
      success: true,
      partial
    };
  } catch (error) {
    console.error('Error getting partial:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get partial by name (with content)
 * Used for template resolution
 */
async function getPartialByName(event, name) {
  try {
    const partial = partialsStore.getPartialByName(name);

    if (!partial) {
      return { success: false, message: 'Partial not found' };
    }

    return {
      success: true,
      partial
    };
  } catch (error) {
    console.error('Error getting partial by name:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Delete a partial
 */
async function deletePartial(event, id) {
  try {
    const deleted = partialsStore.deletePartial(id);

    if (!deleted) {
      return { success: false, message: 'Partial not found' };
    }

    return {
      success: true,
      message: 'Partial deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting partial:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Update partial metadata
 */
async function updatePartial(event, id, updates) {
  try {
    const partial = partialsStore.updatePartial(id, updates);

    if (!partial) {
      return { success: false, message: 'Partial not found' };
    }

    return {
      success: true,
      partial: {
        id: partial.id,
        name: partial.name,
        description: partial.description,
        category: partial.category,
        createdAt: partial.createdAt,
        updatedAt: partial.updatedAt,
        contentLength: partial.content ? partial.content.length : 0
      }
    };
  } catch (error) {
    console.error('Error updating partial:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get storage statistics
 */
async function getPartialStats(event) {
  try {
    const stats = partialsStore.getStats();

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error getting partial stats:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Clear all partials
 */
async function clearAllPartials(event) {
  try {
    const count = partialsStore.clearAllPartials();

    return {
      success: true,
      message: `Cleared ${count} partials`,
      count
    };
  } catch (error) {
    console.error('Error clearing partials:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get all partials formatted for Handlebars
 * Returns object mapping partial names to content
 */
async function getHandlebarsPartials(event) {
  try {
    const partials = partialsStore.getHandlebarsPartials();

    return {
      success: true,
      partials
    };
  } catch (error) {
    console.error('Error getting Handlebars partials:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Import partials from JSON array
 */
async function importPartials(event, partialsData) {
  try {
    const results = partialsStore.importPartials(partialsData);

    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Error importing partials:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Export all partials to JSON array
 */
async function exportPartials(event) {
  try {
    const partials = partialsStore.exportPartials();

    return {
      success: true,
      partials
    };
  } catch (error) {
    console.error('Error exporting partials:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  savePartial,
  getPartials,
  getPartial,
  getPartialByName,
  deletePartial,
  updatePartial,
  getPartialStats,
  clearAllPartials,
  getHandlebarsPartials,
  importPartials,
  exportPartials
};
