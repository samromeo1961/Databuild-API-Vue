const { getDatabase, isSqliteAvailable } = require('./local-db');
const Store = require('electron-store');
const path = require('path');
const fs = require('fs');

// electron-store (used as fallback if SQLite is not available, or as primary if SQLite migration hasn't happened)
const store = new Store({ name: 'templates', defaults: { templates: {} } });

// Track if migration has been performed
let migrationCompleted = false;
let usingSqlite = false;

/**
 * Migrate existing JSON data from electron-store to SQLite
 */
function migrateFromElectronStore() {
  if (migrationCompleted) return;

  if (!isSqliteAvailable()) {
    migrationCompleted = true;
    usingSqlite = false;
    return;
  }

  try {
    const db = getDatabase();
    if (!db) {
      migrationCompleted = true;
      usingSqlite = false;
      return;
    }

    // Check if old templates.json exists
    const oldStorePath = store.path;
    if (!fs.existsSync(oldStorePath)) {
      console.log('✓ No existing templates.json to migrate');
      migrationCompleted = true;
      usingSqlite = true;
      return;
    }

    // Get templates from old store
    const templatesObj = store.get('templates', {});
    const templateIds = Object.keys(templatesObj);

    if (templateIds.length === 0) {
      console.log('✓ No templates to migrate');
      migrationCompleted = true;
      usingSqlite = true;
      return;
    }

    console.log(`⚙ Migrating ${templateIds.length} templates from JSON to SQLite...`);

    // Begin transaction for atomic migration
    const migrate = db.transaction(() => {
      let migratedCount = 0;

      for (const templateId of templateIds) {
        const template = templatesObj[templateId];

        // Insert template
        const insertTemplate = db.prepare(`
          INSERT OR REPLACE INTO templates (id, templateName, description, dateCreated, dateModified, userId)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        insertTemplate.run(
          templateId,
          template.templateName || 'Untitled',
          template.description || '',
          template.dateCreated || new Date().toISOString(),
          template.dateModified || new Date().toISOString(),
          template.userId || 'default'
        );

        // Insert template items
        if (template.items && Array.isArray(template.items)) {
          const insertItem = db.prepare(`
            INSERT INTO template_items (templateId, PriceCode, description, Unit, Price, CostCentre, zzType, quantity, sortOrder)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          template.items.forEach((item, index) => {
            insertItem.run(
              templateId,
              item.PriceCode || '',
              item.description || '',
              item.Unit || '',
              item.Price || 0,
              item.CostCentre || '',
              item.zzType || 'count',
              item.quantity || 1,
              index
            );
          });
        }

        migratedCount++;
      }

      return migratedCount;
    });

    const count = migrate();
    console.log(`✓ Successfully migrated ${count} templates to SQLite`);

    // Backup old JSON file
    const backupPath = oldStorePath.replace('.json', '.backup.json');
    fs.copyFileSync(oldStorePath, backupPath);
    console.log(`✓ Backed up old templates.json to: ${backupPath}`);

    migrationCompleted = true;
    usingSqlite = true;
  } catch (err) {
    console.error('Error migrating templates:', err);
    migrationCompleted = true;
    usingSqlite = false;
  }
}

/**
 * Get all templates
 * @returns {Array} Array of templates
 */
function getTemplates() {
  try {
    // Ensure migration is complete
    migrateFromElectronStore();

    if (usingSqlite) {
      const db = getDatabase();
      if (db) {
        const templates = db.prepare(`
          SELECT id, templateName, description, dateCreated, dateModified, userId
          FROM templates
          ORDER BY dateModified DESC
        `).all();

        // Get items for each template
        const getItemsStmt = db.prepare(`
          SELECT PriceCode, description, Unit, Price, CostCentre, zzType, quantity
          FROM template_items
          WHERE templateId = ?
          ORDER BY sortOrder
        `);

        return templates.map(template => ({
          ...template,
          items: getItemsStmt.all(template.id)
        }));
      }
    }

    // Use electron-store fallback
    const templatesObj = store.get('templates', {});
    return Object.keys(templatesObj).map(id => ({
      id,
      ...templatesObj[id]
    })).sort((a, b) => new Date(b.dateModified) - new Date(a.dateModified));
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
    migrateFromElectronStore();

    if (usingSqlite) {
      const db = getDatabase();
      if (db) {
        const template = db.prepare(`
          SELECT id, templateName, description, dateCreated, dateModified, userId
          FROM templates
          WHERE id = ?
        `).get(templateId);

        if (!template) return null;

        const items = db.prepare(`
          SELECT PriceCode, description, Unit, Price, CostCentre, zzType, quantity
          FROM template_items
          WHERE templateId = ?
          ORDER BY sortOrder
        `).all(templateId);

        return {
          ...template,
          items
        };
      }
    }

    // Use electron-store fallback
    const templatesObj = store.get('templates', {});
    const template = templatesObj[templateId];

    if (!template) return null;

    return {
      id: templateId,
      ...template
    };
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
    migrateFromElectronStore();

    const templateId = template.id || `template_${Date.now()}`;
    const now = new Date().toISOString();

    if (usingSqlite) {
      const db = getDatabase();
      if (db) {
        // Use transaction for atomic save
        const save = db.transaction(() => {
          // Insert or update template
          const upsertTemplate = db.prepare(`
            INSERT INTO templates (id, templateName, description, dateCreated, dateModified, userId)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              templateName = excluded.templateName,
              description = excluded.description,
              dateModified = excluded.dateModified,
              userId = excluded.userId
          `);

          upsertTemplate.run(
            templateId,
            template.templateName || 'Untitled',
            template.description || '',
            template.dateCreated || now,
            now,
            template.userId || 'default'
          );

          // Delete existing items
          db.prepare('DELETE FROM template_items WHERE templateId = ?').run(templateId);

          // Insert new items
          if (template.items && Array.isArray(template.items)) {
            const insertItem = db.prepare(`
              INSERT INTO template_items (templateId, PriceCode, description, Unit, Price, CostCentre, zzType, quantity, sortOrder)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            template.items.forEach((item, index) => {
              insertItem.run(
                templateId,
                item.PriceCode || '',
                item.description || '',
                item.Unit || '',
                item.Price || 0,
                item.CostCentre || '',
                item.zzType || 'count',
                item.quantity || 1,
                index
              );
            });
          }
        });

        save();

        return {
          success: true,
          id: templateId,
          message: 'Template saved successfully'
        };
      }
    }

    // Use electron-store fallback
    const templatesObj = store.get('templates', {});
    templatesObj[templateId] = {
      templateName: template.templateName || 'Untitled',
      description: template.description || '',
      dateCreated: template.dateCreated || now,
      dateModified: now,
      userId: template.userId || 'default',
      items: template.items || []
    };
    store.set('templates', templatesObj);

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
    migrateFromElectronStore();

    if (usingSqlite) {
      const db = getDatabase();
      if (db) {
        // Use transaction
        const deleteOp = db.transaction(() => {
          db.prepare('DELETE FROM template_items WHERE templateId = ?').run(templateId);
          db.prepare('DELETE FROM templates WHERE id = ?').run(templateId);
        });

        deleteOp();

        return {
          success: true,
          message: 'Template deleted successfully'
        };
      }
    }

    // Use electron-store fallback
    const templatesObj = store.get('templates', {});
    delete templatesObj[templateId];
    store.set('templates', templatesObj);

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
    migrateFromElectronStore();

    if (usingSqlite) {
      const db = getDatabase();
      if (db) {
        const clear = db.transaction(() => {
          db.prepare('DELETE FROM template_items').run();
          db.prepare('DELETE FROM templates').run();
        });

        clear();

        return {
          success: true,
          message: 'All templates cleared'
        };
      }
    }

    // Use electron-store fallback
    store.set('templates', {});

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
  clearTemplates,
  migrateFromElectronStore
};
