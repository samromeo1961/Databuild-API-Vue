const Store = require('electron-store');
const fs = require('fs').promises;
const path = require('path');

/**
 * TemplateManager - Handles storage and management of Purchase Order templates
 *
 * Responsibilities:
 * - Load built-in templates
 * - Manage custom templates
 * - Save/load template customizations
 * - Import/export templates
 * - Handle default template selection
 */
class TemplateManager {
  constructor() {
    this.templateStore = new Store({
      name: 'po-templates',
      defaults: {
        customTemplates: [],
        defaultTemplateId: 'classic-po'
      }
    });

    this.builtInTemplatesPath = path.join(__dirname, '../templates/purchase-orders/default');
  }

  /**
   * Get all available templates (built-in + custom)
   * @returns {Promise<Array>} Array of template objects
   */
  async getAllTemplates() {
    const builtIn = await this.getBuiltInTemplates();
    const custom = this.getCustomTemplates();
    return [...builtIn, ...custom];
  }

  /**
   * Get built-in templates with metadata
   * @returns {Promise<Array>} Array of built-in template objects
   */
  async getBuiltInTemplates() {
    try {
      const files = await fs.readdir(this.builtInTemplatesPath);

      // Filter for JSON metadata files
      const metadataFiles = files.filter(f => f.endsWith('.json'));

      const templates = await Promise.all(
        metadataFiles.map(async (file) => {
          const metadataPath = path.join(this.builtInTemplatesPath, file);
          const content = await fs.readFile(metadataPath, 'utf8');
          const metadata = JSON.parse(content);

          return {
            ...metadata,
            isBuiltIn: true,
            isCustom: false,
            templatePath: path.join(this.builtInTemplatesPath, metadata.templateFile)
          };
        })
      );

      return templates;
    } catch (error) {
      console.error('Error loading built-in templates:', error);
      return [];
    }
  }

  /**
   * Get custom user templates
   * @returns {Array} Array of custom template objects
   */
  getCustomTemplates() {
    return this.templateStore.get('customTemplates', []).map(t => ({
      ...t,
      isBuiltIn: false,
      isCustom: true
    }));
  }

  /**
   * Get template by ID
   * @param {string} templateId - Template identifier
   * @returns {Promise<Object|null>} Template object or null if not found
   */
  async getTemplateById(templateId) {
    // Check built-in templates first
    const builtIn = await this.getBuiltInTemplates();
    const builtInMatch = builtIn.find(t => t.id === templateId);
    if (builtInMatch) return builtInMatch;

    // Check custom templates
    const custom = this.getCustomTemplates();
    const customMatch = custom.find(t => t.id === templateId);
    return customMatch || null;
  }

  /**
   * Save a new custom template
   * @param {Object} templateData - Template data including HTML, CSS, metadata
   * @returns {Object} Result with success flag and template ID
   */
  saveCustomTemplate(templateData) {
    try {
      const customTemplates = this.templateStore.get('customTemplates', []);

      // Generate unique ID
      const timestamp = Date.now();
      const id = templateData.id || `custom-${timestamp}`;

      // Check if ID already exists
      if (customTemplates.some(t => t.id === id)) {
        return {
          success: false,
          message: 'Template ID already exists'
        };
      }

      const template = {
        id,
        name: templateData.name || 'Untitled Template',
        description: templateData.description || '',
        category: templateData.category || 'Custom',
        type: templateData.type || 'PO',
        author: templateData.author || 'User',
        version: templateData.version || '1.0.0',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        html: templateData.html,
        css: templateData.css || '',
        customizations: templateData.customizations || null,
        baseTemplate: templateData.baseTemplate || null,
        isBuiltIn: false,
        isCustom: true
      };

      customTemplates.push(template);
      this.templateStore.set('customTemplates', customTemplates);

      return {
        success: true,
        templateId: id,
        template
      };
    } catch (error) {
      console.error('Error saving custom template:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Update an existing custom template
   * @param {string} templateId - Template ID to update
   * @param {Object} updates - Updated template data
   * @returns {Object} Result with success flag
   */
  updateCustomTemplate(templateId, updates) {
    try {
      const customTemplates = this.templateStore.get('customTemplates', []);
      const index = customTemplates.findIndex(t => t.id === templateId);

      if (index === -1) {
        return {
          success: false,
          message: 'Template not found'
        };
      }

      // Don't allow updating built-in templates
      if (!templateId.startsWith('custom-')) {
        return {
          success: false,
          message: 'Cannot update built-in templates'
        };
      }

      customTemplates[index] = {
        ...customTemplates[index],
        ...updates,
        updated: new Date().toISOString()
      };

      this.templateStore.set('customTemplates', customTemplates);

      return {
        success: true,
        template: customTemplates[index]
      };
    } catch (error) {
      console.error('Error updating custom template:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Delete a custom template
   * @param {string} templateId - Template ID to delete
   * @returns {Object} Result with success flag
   */
  deleteTemplate(templateId) {
    try {
      // Don't allow deleting built-in templates
      if (!templateId.startsWith('custom-')) {
        return {
          success: false,
          message: 'Cannot delete built-in templates'
        };
      }

      const customTemplates = this.templateStore.get('customTemplates', []);
      const filtered = customTemplates.filter(t => t.id !== templateId);

      if (filtered.length === customTemplates.length) {
        return {
          success: false,
          message: 'Template not found'
        };
      }

      this.templateStore.set('customTemplates', filtered);

      // If deleted template was the default, reset to classic-po
      const defaultId = this.getDefaultTemplateId();
      if (defaultId === templateId) {
        this.setDefaultTemplate('classic-po');
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting template:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Export template to JSON
   * @param {string} templateId - Template ID to export
   * @returns {Promise<Object>} Result with success flag and export data
   */
  async exportTemplate(templateId) {
    try {
      const template = await this.getTemplateById(templateId);

      if (!template) {
        return {
          success: false,
          message: 'Template not found'
        };
      }

      // For built-in templates, load the actual HTML content
      if (template.isBuiltIn) {
        const htmlContent = await fs.readFile(template.templatePath, 'utf8');

        const exportData = {
          version: '1.0',
          exported: new Date().toISOString(),
          template: {
            name: template.name,
            description: template.description,
            category: template.category,
            type: template.type,
            html: htmlContent,
            css: '',
            customizations: template.defaultCustomizations,
            baseTemplate: template.id
          }
        };

        return {
          success: true,
          data: JSON.stringify(exportData, null, 2),
          filename: `${template.id}.json`
        };
      }

      // Custom template export
      const exportData = {
        version: '1.0',
        exported: new Date().toISOString(),
        template: {
          name: template.name,
          description: template.description,
          category: template.category,
          type: template.type,
          html: template.html,
          css: template.css,
          customizations: template.customizations,
          baseTemplate: template.baseTemplate
        }
      };

      return {
        success: true,
        data: JSON.stringify(exportData, null, 2),
        filename: `${template.id}.json`
      };
    } catch (error) {
      console.error('Error exporting template:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Import template from JSON
   * @param {string} jsonContent - JSON string content
   * @returns {Object} Result with success flag and template ID
   */
  importTemplate(jsonContent) {
    try {
      const importData = JSON.parse(jsonContent);

      if (!importData.version || !importData.template) {
        return {
          success: false,
          message: 'Invalid template file format'
        };
      }

      if (importData.version !== '1.0') {
        return {
          success: false,
          message: `Unsupported template version: ${importData.version}`
        };
      }

      // Create custom template from imported data
      return this.saveCustomTemplate(importData.template);
    } catch (error) {
      console.error('Error importing template:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get default template ID
   * @returns {string} Default template ID
   */
  getDefaultTemplateId() {
    return this.templateStore.get('defaultTemplateId', 'classic-po');
  }

  /**
   * Set default template
   * @param {string} templateId - Template ID to set as default
   * @returns {Object} Result with success flag
   */
  async setDefaultTemplate(templateId) {
    const template = await this.getTemplateById(templateId);

    if (!template) {
      return {
        success: false,
        message: 'Template not found'
      };
    }

    this.templateStore.set('defaultTemplateId', templateId);

    return { success: true };
  }

  /**
   * Get default template object
   * @returns {Promise<Object>} Default template object
   */
  async getDefaultTemplate() {
    const templateId = this.getDefaultTemplateId();
    return await this.getTemplateById(templateId);
  }

  /**
   * Load template HTML content
   * @param {string} templateId - Template ID
   * @returns {Promise<string>} Template HTML content
   */
  async loadTemplateHTML(templateId) {
    const template = await this.getTemplateById(templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    // For built-in templates, read from file
    if (template.isBuiltIn && template.templatePath) {
      return await fs.readFile(template.templatePath, 'utf8');
    }

    // For custom templates, return stored HTML
    if (template.html) {
      return template.html;
    }

    throw new Error('Template HTML not available');
  }

  /**
   * Create a customized version of a built-in template
   * @param {string} baseTemplateId - Base template ID
   * @param {Object} customizations - Customization settings
   * @param {string} newName - Name for customized template
   * @returns {Promise<Object>} Result with success flag and new template ID
   */
  async createCustomizedTemplate(baseTemplateId, customizations, newName) {
    try {
      const baseTemplate = await this.getTemplateById(baseTemplateId);

      if (!baseTemplate) {
        return {
          success: false,
          message: 'Base template not found'
        };
      }

      // Load HTML content
      const html = await this.loadTemplateHTML(baseTemplateId);

      // Create new custom template
      const templateData = {
        name: newName || `${baseTemplate.name} (Customized)`,
        description: `Customized version of ${baseTemplate.name}`,
        category: 'Custom',
        type: baseTemplate.type,
        html: html,
        css: '',
        customizations: customizations,
        baseTemplate: baseTemplateId
      };

      return this.saveCustomTemplate(templateData);
    } catch (error) {
      console.error('Error creating customized template:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get template categories
   * @returns {Promise<Array>} Array of category names
   */
  async getCategories() {
    const allTemplates = await this.getAllTemplates();
    const categories = [...new Set(allTemplates.map(t => t.category))];
    return categories.sort();
  }

  /**
   * Get templates by category
   * @param {string} category - Category name
   * @returns {Promise<Array>} Array of templates in category
   */
  async getTemplatesByCategory(category) {
    const allTemplates = await this.getAllTemplates();
    return allTemplates.filter(t => t.category === category);
  }

  /**
   * Search templates by name or description
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching templates
   */
  async searchTemplates(query) {
    if (!query || query.trim() === '') {
      return await this.getAllTemplates();
    }

    const allTemplates = await this.getAllTemplates();
    const lowerQuery = query.toLowerCase();

    return allTemplates.filter(t => {
      return (
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.id.toLowerCase().includes(lowerQuery)
      );
    });
  }
}

// Export singleton instance
module.exports = new TemplateManager();
