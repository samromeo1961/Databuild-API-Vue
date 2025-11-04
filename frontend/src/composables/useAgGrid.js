/**
 * useAgGrid Composable
 *
 * Provides reusable AG Grid configuration and management logic.
 * Eliminates ~1,500 lines of duplicate code across 9 tab components.
 *
 * Features:
 * - Grid API and column API management
 * - Row selection tracking
 * - Column state persistence
 * - Pagination management
 * - Search/filter integration
 * - Export functionality
 *
 * @example
 * import { useAgGrid } from '@/composables/useAgGrid';
 *
 * const {
 *   gridApi,
 *   selectedRows,
 *   defaultColDef,
 *   rowSelectionConfig,
 *   onGridReady,
 *   onSelectionChanged,
 *   refreshGrid,
 *   exportToExcel
 * } = useAgGrid({
 *   tabName: 'catalogue',
 *   onReady: (api) => console.log('Grid ready!'),
 *   sortable: true
 * });
 */

import { ref, computed, watch } from 'vue';
import { useElectronAPI } from './useElectronAPI';
import logger from '../utils/logger';
import { GRID_DEFAULTS, DEFAULT_COL_DEF, ROW_SELECTION_CONFIG } from '../constants/grid';

export function useAgGrid(options = {}) {
  const {
    tabName = '',
    sortable = false,
    filter = false,
    floatingFilter = false,
    enableColumnState = true,
    enablePagination = true,
    onReady = null,
    onSelection = null,
    defaultColDef: customDefaultColDef = {}
  } = options;

  const api = useElectronAPI();

  // Grid API references
  const gridApi = ref(null);
  const columnApi = ref(null);

  // Selection state
  const selectedRows = ref([]);

  // Pagination state
  const pageSize = ref(GRID_DEFAULTS.PAGE_SIZE);
  const pageSizeOptions = ref(GRID_DEFAULTS.PAGE_SIZE_OPTIONS);
  const currentPage = ref(0);

  // Loading state
  const loading = ref(false);

  /**
   * Default column definition with overrides
   */
  const defaultColDef = computed(() => ({
    ...DEFAULT_COL_DEF,
    sortable,
    filter,
    floatingFilter,
    ...customDefaultColDef
  }));

  /**
   * Row selection configuration
   */
  const rowSelectionConfig = ROW_SELECTION_CONFIG;

  /**
   * Grid ready handler - initializes grid API and loads column state
   * @param {Object} params - AG Grid params object
   */
  const onGridReady = async (params) => {
    try {
      gridApi.value = params.api;
      columnApi.value = params.columnApi;

      logger.debug('useAgGrid', `Grid ready for tab: ${tabName}`);

      // Load column state if enabled
      if (enableColumnState && tabName && api.columnStates) {
        await loadColumnState();
      }

      // Set initial page size
      if (enablePagination && gridApi.value) {
        gridApi.value.setGridOption('paginationPageSize', pageSize.value);
      }

      // Register event listeners for column state
      if (enableColumnState && gridApi.value) {
        gridApi.value.addEventListener('columnResized', saveColumnState);
        gridApi.value.addEventListener('columnMoved', saveColumnState);
        gridApi.value.addEventListener('columnVisible', saveColumnState);
        gridApi.value.addEventListener('columnPinned', saveColumnState);
      }

      // Call custom onReady callback
      if (onReady) {
        onReady(params);
      }
    } catch (err) {
      logger.error('useAgGrid', 'Error in onGridReady', err);
    }
  };

  /**
   * Selection changed handler - updates selected rows
   */
  const onSelectionChanged = () => {
    if (!gridApi.value) return;

    try {
      selectedRows.value = gridApi.value.getSelectedRows();

      logger.debug('useAgGrid', `Selection changed: ${selectedRows.value.length} rows selected`);

      // Call custom onSelection callback
      if (onSelection) {
        onSelection(selectedRows.value);
      }
    } catch (err) {
      logger.error('useAgGrid', 'Error in onSelectionChanged', err);
    }
  };

  /**
   * Save column state to electron-store
   */
  const saveColumnState = async () => {
    if (!enableColumnState || !tabName || !gridApi.value) return;

    try {
      const state = gridApi.value.getColumnState();
      const headerNames = {};

      gridApi.value.getColumns().forEach(col => {
        const colDef = col.getColDef();
        if (colDef.field) {
          headerNames[colDef.field] = colDef.headerName || colDef.field;
        }
      });

      await api.columnStates.save(tabName, {
        state,
        headerNames
      });

      logger.debug('useAgGrid', `Column state saved for ${tabName}`);
    } catch (err) {
      logger.error('useAgGrid', 'Error saving column state', err);
    }
  };

  /**
   * Load column state from electron-store
   */
  const loadColumnState = async () => {
    if (!enableColumnState || !tabName || !gridApi.value) return;

    try {
      const result = await api.columnStates.get(tabName);

      if (result?.success && result?.data) {
        const { state, headerNames } = result.data;

        if (state) {
          gridApi.value.applyColumnState({ state, applyOrder: true });
          logger.debug('useAgGrid', `Column state loaded for ${tabName}`);
        }

        // Apply custom header names
        if (headerNames) {
          Object.entries(headerNames).forEach(([field, name]) => {
            const colDef = gridApi.value.getColumnDef(field);
            if (colDef) {
              colDef.headerName = name;
              gridApi.value.refreshHeader();
            }
          });
        }
      }
    } catch (err) {
      logger.error('useAgGrid', 'Error loading column state', err);
    }
  };

  /**
   * Refresh grid data
   */
  const refreshGrid = () => {
    if (!gridApi.value) return;

    try {
      gridApi.value.refreshCells({ force: true });
      logger.debug('useAgGrid', 'Grid refreshed');
    } catch (err) {
      logger.error('useAgGrid', 'Error refreshing grid', err);
    }
  };

  /**
   * Clear selection
   */
  const clearSelection = () => {
    if (!gridApi.value) return;

    try {
      gridApi.value.deselectAll();
      logger.debug('useAgGrid', 'Selection cleared');
    } catch (err) {
      logger.error('useAgGrid', 'Error clearing selection', err);
    }
  };

  /**
   * Select all rows
   */
  const selectAll = () => {
    if (!gridApi.value) return;

    try {
      gridApi.value.selectAll();
      logger.debug('useAgGrid', 'All rows selected');
    } catch (err) {
      logger.error('useAgGrid', 'Error selecting all', err);
    }
  };

  /**
   * Get all row data
   */
  const getAllRowData = () => {
    if (!gridApi.value) return [];

    const rowData = [];
    gridApi.value.forEachNode(node => rowData.push(node.data));
    return rowData;
  };

  /**
   * Export grid data to Excel
   * @param {string} filename - Export filename
   */
  const exportToExcel = (filename = 'export') => {
    if (!gridApi.value) return;

    try {
      gridApi.value.exportDataAsExcel({
        fileName: `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`
      });
      logger.info('useAgGrid', `Data exported to ${filename}.xlsx`);
    } catch (err) {
      logger.error('useAgGrid', 'Error exporting to Excel', err);
    }
  };

  /**
   * Set quick filter (search)
   * @param {string} searchTerm - Search text
   */
  const setQuickFilter = (searchTerm) => {
    if (!gridApi.value) return;

    try {
      gridApi.value.setGridOption('quickFilterText', searchTerm);
    } catch (err) {
      logger.error('useAgGrid', 'Error setting quick filter', err);
    }
  };

  /**
   * Auto-size all columns
   */
  const autoSizeAllColumns = () => {
    if (!gridApi.value) return;

    try {
      const allColumnIds = gridApi.value.getColumns().map(col => col.getId());
      gridApi.value.autoSizeColumns(allColumnIds, false);
      logger.debug('useAgGrid', 'All columns auto-sized');
    } catch (err) {
      logger.error('useAgGrid', 'Error auto-sizing columns', err);
    }
  };

  /**
   * Size columns to fit
   */
  const sizeColumnsToFit = () => {
    if (!gridApi.value) return;

    try {
      gridApi.value.sizeColumnsToFit();
      logger.debug('useAgGrid', 'Columns sized to fit');
    } catch (err) {
      logger.error('useAgGrid', 'Error sizing columns to fit', err);
    }
  };

  // Watch page size changes
  if (enablePagination) {
    watch(pageSize, (newSize) => {
      if (gridApi.value) {
        gridApi.value.setGridOption('paginationPageSize', newSize);
        logger.debug('useAgGrid', `Page size changed to ${newSize}`);
      }
    });
  }

  return {
    // API references
    gridApi,
    columnApi,

    // State
    selectedRows,
    pageSize,
    pageSizeOptions,
    currentPage,
    loading,

    // Configuration
    defaultColDef,
    rowSelectionConfig,

    // Event handlers
    onGridReady,
    onSelectionChanged,

    // Methods
    refreshGrid,
    clearSelection,
    selectAll,
    getAllRowData,
    exportToExcel,
    setQuickFilter,
    autoSizeAllColumns,
    sizeColumnsToFit,
    saveColumnState,
    loadColumnState
  };
}
