/**
 * AG Grid Configuration Constants
 *
 * Centralized constants for AG Grid configuration across all tabs
 */

// Default pagination settings
export const GRID_DEFAULTS = {
  PAGE_SIZE: 50,
  PAGE_SIZE_OPTIONS: [25, 50, 100, 200],
  SEARCH_DEBOUNCE_MS: 300,
  AUTO_SIZE_PADDING: 20
};

// Default column definition
export const DEFAULT_COL_DEF = {
  resizable: true,
  sortable: false,
  filter: false,
  floatingFilter: false
};

// Row selection configuration
export const ROW_SELECTION_CONFIG = {
  mode: 'multiRow'
};

// Common column widths
export const COLUMN_WIDTHS = {
  CHECKBOX: 50,
  ICON: 50,
  CODE: 120,
  SHORT_TEXT: 100,
  MEDIUM_TEXT: 150,
  LONG_TEXT: 200,
  DESCRIPTION: 300,
  ACTIONS: 200,
  ACTIONS_WIDE: 230
};

// AG Grid themes
export const GRID_THEMES = {
  LIGHT: 'ag-theme-quartz',
  DARK: 'ag-theme-quartz-dark'
};

// Overlay messages
export const GRID_OVERLAYS = {
  NO_ROWS: 'No records found',
  LOADING: 'Loading...'
};
