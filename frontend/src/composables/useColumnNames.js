import { ref, computed } from 'vue';
import { useElectronAPI } from './useElectronAPI';

/**
 * Vue composable for managing custom column names
 * Provides centralized column name management across all tabs
 */
export function useColumnNames() {
  const api = useElectronAPI();
  const columnNames = ref({});
  const loading = ref(false);
  const error = ref(null);

  /**
   * Load all column names from store
   */
  const loadColumnNames = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.columnNames.get();
      if (response?.success) {
        columnNames.value = response.data || {};
      } else {
        error.value = 'Failed to load column names';
      }
    } catch (err) {
      console.error('Error loading column names:', err);
      error.value = 'Error loading column names';
    } finally {
      loading.value = false;
    }
  };

  /**
   * Save all column names to store
   */
  const saveColumnNames = async (names) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.columnNames.save(names);
      if (response?.success) {
        columnNames.value = names;
        return { success: true };
      } else {
        error.value = 'Failed to save column names';
        return { success: false, error: error.value };
      }
    } catch (err) {
      console.error('Error saving column names:', err);
      error.value = 'Error saving column names';
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  };

  /**
   * Update a specific column name
   */
  const updateColumnName = async (field, displayName, zzTakeoffProperty) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.columnNames.update(field, displayName, zzTakeoffProperty);
      if (response?.success) {
        // Update local state
        if (!columnNames.value[field]) {
          columnNames.value[field] = {};
        }
        columnNames.value[field].displayName = displayName;
        columnNames.value[field].zzTakeoffProperty = zzTakeoffProperty;
        return { success: true };
      } else {
        error.value = 'Failed to update column name';
        return { success: false, error: error.value };
      }
    } catch (err) {
      console.error('Error updating column name:', err);
      error.value = 'Error updating column name';
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  };

  /**
   * Reset column names to defaults
   */
  const resetColumnNames = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.columnNames.reset();
      if (response?.success) {
        columnNames.value = response.data || {};
        return { success: true };
      } else {
        error.value = 'Failed to reset column names';
        return { success: false, error: error.value };
      }
    } catch (err) {
      console.error('Error resetting column names:', err);
      error.value = 'Error resetting column names';
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  };

  /**
   * Get display name for a field
   * @param {string} field - Database field name
   * @returns {string} Display name or field name if not found
   */
  const getDisplayName = (field) => {
    return columnNames.value[field]?.displayName || field;
  };

  /**
   * Get zzTakeoff property name for a field
   * @param {string} field - Database field name
   * @returns {string} zzTakeoff property name or lowercase field name if not found
   */
  const getZzTakeoffProperty = (field) => {
    return columnNames.value[field]?.zzTakeoffProperty || field.toLowerCase();
  };

  /**
   * Apply custom column names to AG Grid column definitions
   * @param {Array} columnDefs - AG Grid column definitions
   * @returns {Array} Updated column definitions with custom names
   */
  const applyColumnNames = (columnDefs) => {
    return columnDefs.map(colDef => {
      if (colDef.field && columnNames.value[colDef.field]) {
        return {
          ...colDef,
          headerName: columnNames.value[colDef.field].displayName || colDef.headerName || colDef.field
        };
      }
      return colDef;
    });
  };

  /**
   * Get zzTakeoff properties object for an item
   * Maps item fields to zzTakeoff property names using custom column names
   * @param {Object} item - Item data object
   * @param {Array} fields - Array of field names to include (optional, includes all if not specified)
   * @returns {Object} Properties object for zzTakeoff startTakeoffWithProperties
   */
  const getZzTakeoffProperties = (item, fields = null) => {
    const properties = {};
    const fieldsToMap = fields || Object.keys(item);

    fieldsToMap.forEach(field => {
      if (item[field] !== undefined && item[field] !== null) {
        const propertyName = getZzTakeoffProperty(field);
        let value = item[field];

        // Convert value to string for zzTakeoff
        if (typeof value === 'number') {
          value = value.toString();
        } else if (typeof value !== 'string') {
          value = String(value || '');
        }

        properties[propertyName] = { value };
      }
    });

    return properties;
  };

  /**
   * Computed property to check if column names are loaded
   */
  const isLoaded = computed(() => {
    return Object.keys(columnNames.value).length > 0;
  });

  return {
    columnNames,
    loading,
    error,
    isLoaded,
    loadColumnNames,
    saveColumnNames,
    updateColumnName,
    resetColumnNames,
    getDisplayName,
    getZzTakeoffProperty,
    applyColumnNames,
    getZzTakeoffProperties
  };
}
