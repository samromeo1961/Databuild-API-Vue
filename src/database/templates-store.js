const Store = require('electron-store');

// Initialize electron-store for templates
// Data is stored in: C:\Users\<username>\AppData\Roaming\dbx-connector-vue\templates.json
const templatesStore = new Store({
  name: 'templates',
  defaults: {
    templates: {}
  }
});

console.log('✓ Templates storage initialized at:', templatesStore.path);

/**
 * Get all templates
 * @returns {Array} Array of templates
 */
function getTemplates() {
  try {
    const templatesObj = templatesStore.get('templates', {});
    const templates = Object.keys(templatesObj).map(key => ({
      id: key,
      ...templatesObj[key]
    }));
    return templates.sort((a, b) => new Date(b.dateModified) - new Date(a.dateModified));
  } catch (err) {
    console.error('Error getting templates:', err);
    return [];
  }
}

/**
 * Get a specific template
 * @param {string} templateId - Template ID
 * @returns {Object|null} Template object or null
 */
function getTemplate(templateId) {
  try {
    const templatesObj = templatesStore.get('templates', {});
    const template = templatesObj[templateId];
    return template ? { id: templateId, ...template } : null;
  } catch (err) {
    console.error('Error getting template:', err);
    return null;
  }
}

/**
 * Save template
 * @param {Object} template - Template object
 * @returns {Object} Result object with success status and template ID
 */
function saveTemplate(template) {
  try {
    const templateId = template.id || `template_${Date.now()}`;
    const templateData = {
      ...template,
      dateModified: new Date().toISOString(),
      dateCreated: template.dateCreated || new Date().toISOString(),
      userId: 'default'
    };
    delete templateData.id; // Remove id from stored data

    const templatesObj = templatesStore.get('templates', {});
    templatesObj[templateId] = templateData;
    templatesStore.set('templates', templatesObj);

    return {
      success: true,
      id: templateId,
      message: 'Template saved successfully'
    };
  } catch (err) {
    console.error('Error saving template:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Delete template
 * @param {string} templateId - Template ID
 * @returns {Object} Result object with success status
 */
function deleteTemplate(templateId) {
  try {
    const templatesObj = templatesStore.get('templates', {});
    delete templatesObj[templateId];
    templatesStore.set('templates', templatesObj);

    return {
      success: true,
      message: 'Template deleted successfully'
    };
  } catch (err) {
    console.error('Error deleting template:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Clear all templates
 * @returns {Object} Result object with success status
 */
function clearTemplates() {
  try {
    templatesStore.set('templates', {});

    return {
      success: true,
      message: 'All templates cleared'
    };
  } catch (err) {
    console.error('Error clearing templates:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  getTemplates,
  getTemplate,
  saveTemplate,
  deleteTemplate,
  clearTemplates
};
