const templateManager = require('../services/template-manager');
const templateRenderer = require('../services/template-renderer');
const { dialog } = require('electron');
const fs = require('fs').promises;

/**
 * IPC Handlers for Purchase Order Template Management
 *
 * Exposes template-related operations to the frontend:
 * - Get all templates
 * - Get template by ID
 * - Save/update/delete custom templates
 * - Import/export templates
 * - Set default template
 * - Preview templates
 */

/**
 * Get all available templates (built-in + custom)
 */
async function getAllTemplates(event) {
  try {
    const templates = await templateManager.getAllTemplates();
    return { success: true, templates };
  } catch (error) {
    console.error('Error getting templates:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get built-in templates only
 */
async function getBuiltInTemplates(event) {
  try {
    const templates = await templateManager.getBuiltInTemplates();
    return { success: true, templates };
  } catch (error) {
    console.error('Error getting built-in templates:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get custom user templates only
 */
async function getCustomTemplates(event) {
  try {
    const templates = templateManager.getCustomTemplates();
    return { success: true, templates };
  } catch (error) {
    console.error('Error getting custom templates:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get template by ID
 */
async function getTemplateById(event, templateId) {
  try {
    const template = await templateManager.getTemplateById(templateId);

    if (!template) {
      return { success: false, message: 'Template not found' };
    }

    return { success: true, template };
  } catch (error) {
    console.error('Error getting template:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Save a new custom template
 */
async function saveCustomTemplate(event, templateData) {
  try {
    return templateManager.saveCustomTemplate(templateData);
  } catch (error) {
    console.error('Error saving custom template:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Update existing custom template
 */
async function updateCustomTemplate(event, templateId, updates) {
  try {
    return templateManager.updateCustomTemplate(templateId, updates);
  } catch (error) {
    console.error('Error updating custom template:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Delete custom template
 */
async function deleteTemplate(event, templateId) {
  try {
    return templateManager.deleteTemplate(templateId);
  } catch (error) {
    console.error('Error deleting template:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Export template to file
 */
async function exportTemplate(event, templateId) {
  try {
    // Get export data
    const result = await templateManager.exportTemplate(templateId);

    if (!result.success) {
      return result;
    }

    // Show save dialog
    const saveResult = await dialog.showSaveDialog({
      title: 'Export Template',
      defaultPath: result.filename,
      filters: [
        { name: 'Template Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (saveResult.canceled) {
      return { success: false, message: 'Export cancelled' };
    }

    // Write to file
    await fs.writeFile(saveResult.filePath, result.data, 'utf8');

    return {
      success: true,
      filePath: saveResult.filePath
    };
  } catch (error) {
    console.error('Error exporting template:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Import template from file
 */
async function importTemplate(event) {
  try {
    // Show open dialog
    const openResult = await dialog.showOpenDialog({
      title: 'Import Template',
      filters: [
        { name: 'Template Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (openResult.canceled || openResult.filePaths.length === 0) {
      return { success: false, message: 'Import cancelled' };
    }

    // Read file
    const fileContent = await fs.readFile(openResult.filePaths[0], 'utf8');

    // Import template
    return templateManager.importTemplate(fileContent);
  } catch (error) {
    console.error('Error importing template:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get default template ID
 */
async function getDefaultTemplateId(event) {
  try {
    const templateId = templateManager.getDefaultTemplateId();
    return { success: true, templateId };
  } catch (error) {
    console.error('Error getting default template:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get default template object
 */
async function getDefaultTemplate(event) {
  try {
    const template = await templateManager.getDefaultTemplate();
    return { success: true, template };
  } catch (error) {
    console.error('Error getting default template:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Set default template
 */
async function setDefaultTemplate(event, templateId) {
  try {
    return await templateManager.setDefaultTemplate(templateId);
  } catch (error) {
    console.error('Error setting default template:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Load template HTML content
 */
async function loadTemplateHTML(event, templateId) {
  try {
    const html = await templateManager.loadTemplateHTML(templateId);
    return { success: true, html };
  } catch (error) {
    console.error('Error loading template HTML:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Create customized version of built-in template
 */
async function createCustomizedTemplate(event, baseTemplateId, customizations, newName) {
  try {
    return await templateManager.createCustomizedTemplate(
      baseTemplateId,
      customizations,
      newName
    );
  } catch (error) {
    console.error('Error creating customized template:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get template categories
 */
async function getCategories(event) {
  try {
    const categories = await templateManager.getCategories();
    return { success: true, categories };
  } catch (error) {
    console.error('Error getting categories:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get templates by category
 */
async function getTemplatesByCategory(event, category) {
  try {
    const templates = await templateManager.getTemplatesByCategory(category);
    return { success: true, templates };
  } catch (error) {
    console.error('Error getting templates by category:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Search templates
 */
async function searchTemplates(event, query) {
  try {
    const templates = await templateManager.searchTemplates(query);
    return { success: true, templates };
  } catch (error) {
    console.error('Error searching templates:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Preview template with sample data
 */
async function previewTemplate(event, templateId, settings = {}) {
  try {
    // Load template HTML
    const html = await templateManager.loadTemplateHTML(templateId);

    // Get sample data
    const sampleData = templateRenderer.getSampleData();

    // Apply settings if provided
    const renderSettings = {
      priceDisplay: settings.priceDisplay || 'all',
      gstMode: settings.gstMode || 'total',
      codeDisplay: settings.codeDisplay || 'our',
      customizations: settings.customizations || null
    };

    // Compile and render with sample data
    const Handlebars = require('handlebars');
    templateRenderer.registerHelpers(); // Ensure helpers are registered

    const template = Handlebars.compile(html);

    // Add display flags to sample data
    sampleData.showPrices = renderSettings.priceDisplay !== 'none';
    sampleData.showLinePrices = renderSettings.priceDisplay === 'all';
    sampleData.showSupplierRef = renderSettings.codeDisplay === 'supplier' || renderSettings.codeDisplay === 'both';
    sampleData.gstMode = renderSettings.gstMode;

    // Add customizations if provided
    if (renderSettings.customizations) {
      sampleData.customizations = renderSettings.customizations;
    }

    const renderedHTML = template(sampleData);

    return {
      success: true,
      html: renderedHTML
    };
  } catch (error) {
    console.error('Error previewing template:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get sample data for template editing
 */
async function getSampleData(event) {
  try {
    const data = templateRenderer.getSampleData();
    return { success: true, data };
  } catch (error) {
    console.error('Error getting sample data:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  getAllTemplates,
  getBuiltInTemplates,
  getCustomTemplates,
  getTemplateById,
  saveCustomTemplate,
  updateCustomTemplate,
  deleteTemplate,
  exportTemplate,
  importTemplate,
  getDefaultTemplateId,
  getDefaultTemplate,
  setDefaultTemplate,
  loadTemplateHTML,
  createCustomizedTemplate,
  getCategories,
  getTemplatesByCategory,
  searchTemplates,
  previewTemplate,
  getSampleData
};
