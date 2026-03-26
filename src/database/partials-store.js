/**
 * Template Partials Store
 * Manages reusable template fragments using electron-store
 */

const Store = require('electron-store');
const crypto = require('crypto');

// Initialize electron-store for partials
const partialsStore = new Store({
  name: 'template-partials',
  defaults: {
    partials: []
  }
});

/**
 * Add or update a partial
 * @param {Object} partial - Partial data { name, description, content, category }
 * @returns {Object} - Created/updated partial with id
 */
function savePartial(partial) {
  const partials = partialsStore.get('partials', []);

  // If partial has an ID, update existing
  if (partial.id) {
    const index = partials.findIndex(p => p.id === partial.id);

    if (index === -1) {
      throw new Error('Partial not found');
    }

    // Update existing partial
    partials[index] = {
      ...partials[index],
      name: partial.name,
      description: partial.description || '',
      content: partial.content,
      category: partial.category || 'other',
      updatedAt: new Date().toISOString()
    };

    partialsStore.set('partials', partials);
    return partials[index];
  }

  // Check for duplicate name
  const existingIndex = partials.findIndex(p => p.name.toLowerCase() === partial.name.toLowerCase());
  if (existingIndex !== -1) {
    throw new Error(`Partial with name "${partial.name}" already exists`);
  }

  // Create new partial
  const newPartial = {
    id: crypto.randomUUID(),
    name: partial.name,
    description: partial.description || '',
    content: partial.content,
    category: partial.category || 'other',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  partials.push(newPartial);
  partialsStore.set('partials', partials);

  return newPartial;
}

/**
 * Get all partials (without content for performance)
 * @param {Object} filters - Optional filters { category }
 * @returns {Array} - Array of partial metadata
 */
function getAllPartials(filters = {}) {
  let partials = partialsStore.get('partials', []);

  // Apply category filter
  if (filters.category && filters.category !== 'all') {
    partials = partials.filter(p => p.category === filters.category);
  }

  // Return without content (for list view performance)
  return partials.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    contentLength: p.content ? p.content.length : 0
  }));
}

/**
 * Get partial by ID (with full content)
 * @param {string} id - Partial ID
 * @returns {Object|null} - Partial object or null
 */
function getPartialById(id) {
  const partials = partialsStore.get('partials', []);
  return partials.find(p => p.id === id) || null;
}

/**
 * Get partial by name (with full content)
 * Used by template renderer to resolve {{> partialName}}
 * @param {string} name - Partial name
 * @returns {Object|null} - Partial object or null
 */
function getPartialByName(name) {
  const partials = partialsStore.get('partials', []);
  return partials.find(p => p.name === name) || null;
}

/**
 * Delete a partial
 * @param {string} id - Partial ID
 * @returns {boolean} - True if deleted
 */
function deletePartial(id) {
  const partials = partialsStore.get('partials', []);
  const index = partials.findIndex(p => p.id === id);

  if (index === -1) {
    return false;
  }

  partials.splice(index, 1);
  partialsStore.set('partials', partials);

  return true;
}

/**
 * Update partial metadata (name, description, category)
 * @param {string} id - Partial ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} - Updated partial or null
 */
function updatePartial(id, updates) {
  const partials = partialsStore.get('partials', []);
  const index = partials.findIndex(p => p.id === id);

  if (index === -1) {
    return null;
  }

  // Check for duplicate name if name is being updated
  if (updates.name && updates.name !== partials[index].name) {
    const duplicateIndex = partials.findIndex(p =>
      p.name.toLowerCase() === updates.name.toLowerCase() && p.id !== id
    );
    if (duplicateIndex !== -1) {
      throw new Error(`Partial with name "${updates.name}" already exists`);
    }
  }

  // Update allowed fields
  if (updates.name !== undefined) partials[index].name = updates.name;
  if (updates.description !== undefined) partials[index].description = updates.description;
  if (updates.category !== undefined) partials[index].category = updates.category;
  if (updates.content !== undefined) partials[index].content = updates.content;

  partials[index].updatedAt = new Date().toISOString();

  partialsStore.set('partials', partials);

  return partials[index];
}

/**
 * Clear all partials
 * @returns {number} - Number of partials deleted
 */
function clearAllPartials() {
  const partials = partialsStore.get('partials', []);
  const count = partials.length;

  partialsStore.set('partials', []);

  return count;
}

/**
 * Get statistics about partials
 * @returns {Object} - Statistics { total, byCategory }
 */
function getStats() {
  const partials = partialsStore.get('partials', []);

  const stats = {
    total: partials.length,
    byCategory: {
      header: 0,
      footer: 0,
      lineItem: 0,
      section: 0,
      other: 0
    },
    totalContentSize: 0
  };

  partials.forEach(p => {
    if (stats.byCategory[p.category] !== undefined) {
      stats.byCategory[p.category]++;
    } else {
      stats.byCategory.other++;
    }
    stats.totalContentSize += p.content ? p.content.length : 0;
  });

  return stats;
}

/**
 * Get all partials as Handlebars partials object
 * Used by template renderer: { partialName: partialContent, ... }
 * @returns {Object} - Object mapping partial names to content
 */
function getHandlebarsPartials() {
  const partials = partialsStore.get('partials', []);
  const handlebarsPartials = {};

  partials.forEach(p => {
    handlebarsPartials[p.name] = p.content;
  });

  return handlebarsPartials;
}

/**
 * Import partials from JSON
 * @param {Array} partialsData - Array of partial objects
 * @returns {Object} - Import results { imported, skipped, errors }
 */
function importPartials(partialsData) {
  const results = {
    imported: 0,
    skipped: 0,
    errors: []
  };

  if (!Array.isArray(partialsData)) {
    throw new Error('Import data must be an array');
  }

  partialsData.forEach((partialData, index) => {
    try {
      // Validate required fields
      if (!partialData.name || !partialData.content) {
        results.errors.push(`Partial ${index}: Missing name or content`);
        results.skipped++;
        return;
      }

      // Check if partial with same name exists
      const existing = getPartialByName(partialData.name);
      if (existing) {
        results.errors.push(`Partial "${partialData.name}": Already exists`);
        results.skipped++;
        return;
      }

      // Create partial
      savePartial({
        name: partialData.name,
        description: partialData.description || '',
        content: partialData.content,
        category: partialData.category || 'other'
      });

      results.imported++;
    } catch (error) {
      results.errors.push(`Partial ${index}: ${error.message}`);
      results.skipped++;
    }
  });

  return results;
}

/**
 * Export all partials to JSON
 * @returns {Array} - Array of all partials with full content
 */
function exportPartials() {
  return partialsStore.get('partials', []);
}

module.exports = {
  savePartial,
  getAllPartials,
  getPartialById,
  getPartialByName,
  deletePartial,
  updatePartial,
  clearAllPartials,
  getStats,
  getHandlebarsPartials,
  importPartials,
  exportPartials
};
