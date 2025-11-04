<template>
  <div class="recents-tab h-100 d-flex flex-column">
    <!-- Header -->
    <div class="py-3 px-4 border-bottom">
      <!-- Search and Action Buttons -->
      <div class="row mb-3">
        <div class="col-md-4">
          <div class="input-group">
            <span class="input-group-text">
              <i class="bi bi-search"></i>
            </span>
            <input
              type="text"
              class="form-control"
              placeholder="Search recents..."
              v-model="searchTerm"
              @input="onSearchChange"
            />
            <button
              v-if="searchTerm"
              class="btn btn-outline-secondary"
              @click="clearSearch"
            >
              <i class="bi bi-x"></i>
            </button>
          </div>
        </div>
        <div class="col-md-8">
          <div class="d-flex justify-content-end align-items-center gap-3">
            <button
              class="btn btn-outline-warning"
              @click="handleClearAll"
              :disabled="totalSize === 0"
              title="Clear All Recents"
            >
              <i class="bi bi-trash"></i>
            </button>
            <button
              class="btn btn-outline-primary"
              @click="loadData"
              title="Refresh"
            >
              <i class="bi bi-arrow-clockwise"></i>
            </button>
            <button
              class="btn btn-outline-secondary"
              @click="toggleColumnPanel"
              title="Manage Columns"
            >
              <i class="bi bi-layout-three-columns"></i>
            </button>
            <button
              class="btn btn-outline-info"
              @click="handleExportToExcel"
              title="Export to Excel"
            >
              <i class="bi bi-file-earmark-excel"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Error/Success Messages -->
      <div v-if="error" class="alert alert-danger alert-dismissible fade show mb-0" role="alert">
        {{ error }}
        <button type="button" class="btn-close" @click="error = null"></button>
      </div>
      <div v-if="success" class="alert alert-success alert-dismissible fade show mb-0" role="alert">
        <i class="bi bi-check-circle me-2"></i>
        {{ success }}
        <button type="button" class="btn-close" @click="success = null"></button>
      </div>
    </div>

    <!-- AG Grid -->
    <div class="flex-grow-1 position-relative">
      <ag-grid-vue
        class="ag-theme-quartz h-100"
        :class="{ 'ag-theme-quartz-dark': isDarkMode }"
        theme="legacy"
        :columnDefs="columnDefs"
        :rowData="filteredData"
        :defaultColDef="defaultColDef"
        :pagination="true"
        :paginationPageSize="pageSize"
        :paginationPageSizeSelector="pageSizeOptions"
        :rowSelection="rowSelectionConfig"
        :loading="loading"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @column-resized="onColumnResized"
        @column-moved="onColumnMoved"
        @column-visible="onColumnVisible"
      />

      <!-- Custom footer info overlaid on AG Grid pagination -->
      <div class="custom-grid-footer">
        <span class="text-muted small">
          <i class="bi bi-clock-history me-1"></i>
          Total: <strong>{{ totalSize.toLocaleString() }}</strong> items
        </span>
        <span v-if="selectedRows.length > 0" class="text-primary small ms-3">
          <i class="bi bi-check2-square me-1"></i>
          {{ selectedRows.length }} selected
        </span>
      </div>
    </div>

    <!-- Clear All Confirmation Modal -->
    <div
      class="modal fade"
      id="clearAllModal"
      tabindex="-1"
      aria-labelledby="clearAllModalLabel"
      aria-hidden="true"
      ref="clearAllModal"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="clearAllModalLabel">Confirm Clear All</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            Are you sure you want to clear all {{ totalSize }} recent items? This action cannot be undone.
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" @click="confirmClearAll">Clear All</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Column Management Modal -->
    <div
      class="modal fade"
      id="columnManagementModal"
      tabindex="-1"
      aria-labelledby="columnManagementModalLabel"
      aria-hidden="true"
      ref="columnManagementModal"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="columnManagementModalLabel">
              <i class="bi bi-layout-three-columns me-2"></i>
              Column Settings
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted small mb-3">
              <i class="bi bi-info-circle me-1"></i>
              Drag to reorder, check/uncheck to show/hide columns
            </p>
            <draggable
              v-model="managedColumns"
              item-key="field"
              @end="onColumnReorder"
              handle=".drag-handle"
              class="list-group"
            >
              <template #item="{element: col}">
                <div class="list-group-item d-flex align-items-center">
                  <div class="drag-handle me-2" style="cursor: move;">
                    <i class="bi bi-grip-vertical text-muted"></i>
                  </div>
                  <div class="form-check me-3">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :id="`col-${col.field}`"
                      v-model="col.visible"
                      @change="toggleColumnVisibility(col)"
                    />
                  </div>
                  <div class="flex-grow-1">
                    <strong>{{ col.headerName }}</strong>
                    <small class="text-muted ms-2">({{ col.field }})</small>
                  </div>
                  <div class="btn-group btn-group-sm ms-2" role="group">
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      :class="{ active: col.pinned === 'left' }"
                      @click="pinColumn(col, 'left')"
                      title="Pin Left"
                    >
                      <i class="bi bi-pin-angle-fill"></i>
                      <i class="bi bi-arrow-left"></i>
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      :class="{ active: col.pinned === 'right' }"
                      @click="pinColumn(col, 'right')"
                      title="Pin Right"
                    >
                      <i class="bi bi-arrow-right"></i>
                      <i class="bi bi-pin-angle-fill"></i>
                    </button>
                  </div>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary ms-2"
                    @click="showRenameColumn(col)"
                    title="Rename Column"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                </div>
              </template>
            </draggable>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAllColumns">Show All</button>
            <button type="button" class="btn btn-warning" @click="resetColumnSettings">Reset to Default</button>
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Done</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rename Column Modal -->
    <div
      class="modal fade"
      id="renameColumnModal"
      tabindex="-1"
      aria-labelledby="renameColumnModalLabel"
      aria-hidden="true"
      ref="renameColumnModal"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="renameColumnModalLabel">Rename Column</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="renameColumnInput" class="form-label">Column Name</label>
              <input
                type="text"
                class="form-control"
                id="renameColumnInput"
                v-model="renameColumnName"
                @keyup.enter="confirmRenameColumn"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="confirmRenameColumn">Rename</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '../../composables/useElectronAPI';
import { Modal } from 'bootstrap';
import draggable from 'vuedraggable';

const api = useElectronAPI();
const theme = inject('theme');

// State
const rowData = ref([]);
const loading = ref(false);
const error = ref(null);
const success = ref(null);
const searchTerm = ref('');
const totalSize = ref(0);
const selectedRows = ref([]);
const gridApi = ref(null);
const pageSize = ref(50);
const pageSizeOptions = [25, 50, 100, 200];
const clearAllModal = ref(null);
let clearAllModalInstance = null;

// Column management modal
const columnManagementModal = ref(null);
let columnManagementModalInstance = null;
const managedColumns = ref([]);

// Rename column modal
const renameColumnModal = ref(null);
let renameColumnModalInstance = null;
const renameColumnField = ref('');
const renameColumnName = ref('');

// Check if dark mode
const isDarkMode = computed(() => {
  return theme && theme.value === 'dark';
});

// Filtered data
const filteredData = computed(() => {
  if (!searchTerm.value) return rowData.value;

  const search = searchTerm.value.toLowerCase();
  return rowData.value.filter(item =>
    item.PriceCode?.toLowerCase().includes(search) ||
    item.Description?.toLowerCase().includes(search) ||
    item.CostCentre?.toLowerCase().includes(search)
  );
});

// Row selection configuration (new v32+ API)
const rowSelectionConfig = {
  mode: 'multiRow',
  checkboxes: true,
  headerCheckbox: true,
  enableClickSelection: false
};

// AG Grid column definitions
const columnDefs = ref([
  {
    field: 'PriceCode',
    headerName: 'Code',
    width: 120,
    pinned: 'left',
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'Description',
    headerName: 'Description',
    flex: 1,
    minWidth: 300,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'Unit',
    headerName: 'Unit',
    width: 80,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'Price',
    headerName: 'Price',
    width: 120,
    filter: 'agNumberColumnFilter',
    sortable: true,
    valueFormatter: (params) => {
      if (params.value == null) return '-';
      return `$${params.value.toFixed(2)}`;
    },
    cellStyle: { textAlign: 'right' }
  },
  {
    field: 'CostCentre',
    headerName: 'Cost Centre',
    width: 130,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'LastAccessed',
    headerName: 'Last Accessed',
    width: 180,
    filter: 'agDateColumnFilter',
    sortable: true,
    valueFormatter: (params) => {
      if (!params.value) return '-';
      return new Date(params.value).toLocaleString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
]);

// Default column properties
const defaultColDef = {
  resizable: true,
  sortable: false,
  filter: false,
  floatingFilter: false
};

// Debounce timer
let searchDebounce = null;

// Load data
const loadData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await api.recentsStore.getList();

    if (response?.success) {
      rowData.value = response.data || [];
      totalSize.value = rowData.value.length;
    } else {
      error.value = 'Failed to load recents';
    }
  } catch (err) {
    console.error('Error loading recents:', err);
    error.value = 'Error loading recents';
  } finally {
    loading.value = false;
  }
};

// Search change handler with debounce
const onSearchChange = () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    if (gridApi.value) {
      totalSize.value = filteredData.value.length;
    }
  }, 300);
};

// Clear search
const clearSearch = () => {
  searchTerm.value = '';
  totalSize.value = rowData.value.length;
};

// Grid ready handler
const onGridReady = async (params) => {
  gridApi.value = params.api;
  await loadColumnState();
  loadData();
};

// Selection changed handler
const onSelectionChanged = () => {
  if (gridApi.value) {
    selectedRows.value = gridApi.value.getSelectedRows();
  }
};

// Handle clear all click
const handleClearAll = () => {
  if (clearAllModalInstance) {
    clearAllModalInstance.show();
  }
};

// Confirm clear all
const confirmClearAll = async () => {
  try {
    const response = await api.recentsStore.clear();

    if (response?.success) {
      if (clearAllModalInstance) {
        clearAllModalInstance.hide();
      }

      success.value = 'All recents cleared successfully';
      setTimeout(() => (success.value = null), 3000);

      await loadData();
    } else {
      error.value = 'Failed to clear recents';
    }
  } catch (err) {
    console.error('Error clearing recents:', err);
    error.value = 'Failed to clear recents';
  }
};

// Export to Excel
const handleExportToExcel = () => {
  if (gridApi.value) {
    gridApi.value.exportDataAsCsv({
      fileName: 'recents-export.csv'
    });
    success.value = 'Exported to CSV';
    setTimeout(() => (success.value = null), 3000);
  }
};

// Toggle column panel
const toggleColumnPanel = () => {
  if (gridApi.value) {
    const columnState = gridApi.value.getColumnState();
    managedColumns.value = columnState
      .filter(col => col.colId !== 'ag-Grid-AutoColumn')
      .map(col => ({
        field: col.colId,
        headerName: gridApi.value.getColumnDef(col.colId)?.headerName || col.colId,
        visible: !col.hide,
        pinned: col.pinned || null
      }));
  }

  if (!columnManagementModalInstance) {
    columnManagementModalInstance = new Modal(columnManagementModal.value);
  }
  columnManagementModalInstance.show();
};

// Toggle column visibility
const toggleColumnVisibility = (col) => {
  if (gridApi.value) {
    gridApi.value.setColumnsVisible([col.field], col.visible);
    saveColumnState();
  }
};

// Pin column
const pinColumn = (col, position) => {
  if (gridApi.value) {
    const newPinned = col.pinned === position ? null : position;
    col.pinned = newPinned;
    gridApi.value.setColumnPinned(col.field, newPinned);
    saveColumnState();
  }
};

// Column reorder handler
const onColumnReorder = () => {
  if (!gridApi.value) return;

  const newOrder = managedColumns.value.map(col => col.field);
  const currentState = gridApi.value.getColumnState();

  const reorderedState = newOrder.map(colId => {
    return currentState.find(col => col.colId === colId);
  }).filter(col => col !== undefined);

  gridApi.value.applyColumnState({
    state: reorderedState,
    applyOrder: true
  });

  // Workaround for AG Grid order not applying correctly
  setTimeout(() => {
    const correctOrderState = newOrder.map(colId => {
      return gridApi.value.getColumnState().find(col => col.colId === colId);
    }).filter(col => col !== undefined);

    const originalGetColumnState = gridApi.value.getColumnState;
    gridApi.value.getColumnState = () => correctOrderState;
    saveColumnState();
    gridApi.value.getColumnState = originalGetColumnState;
  }, 100);
};

// Show all columns
const showAllColumns = () => {
  managedColumns.value.forEach(col => {
    col.visible = true;
  });

  if (gridApi.value) {
    const allFields = managedColumns.value.map(col => col.field);
    gridApi.value.setColumnsVisible(allFields, true);
    saveColumnState();
  }
};

// Reset column settings
const resetColumnSettings = async () => {
  try {
    await api.columnStates.delete('recentsColumnState');

    if (gridApi.value) {
      gridApi.value.resetColumnState();

      const columnState = gridApi.value.getColumnState();
      managedColumns.value = columnState
        .filter(col => col.colId !== 'ag-Grid-AutoColumn')
        .map(col => ({
          field: col.colId,
          headerName: gridApi.value.getColumnDef(col.colId)?.headerName || col.colId,
          visible: !col.hide,
          pinned: col.pinned || null
        }));
    }

    success.value = 'Column settings reset to default';
    setTimeout(() => (success.value = null), 3000);
  } catch (err) {
    console.error('Error resetting column settings:', err);
    error.value = 'Failed to reset column settings';
  }
};

// Show rename column modal
const showRenameColumn = (col) => {
  renameColumnField.value = col.field;
  renameColumnName.value = col.headerName;

  if (!renameColumnModalInstance) {
    renameColumnModalInstance = new Modal(renameColumnModal.value);
  }
  renameColumnModalInstance.show();
};

// Confirm rename column
const confirmRenameColumn = () => {
  if (!gridApi.value || !renameColumnField.value) return;

  const columnDef = gridApi.value.getColumnDef(renameColumnField.value);
  if (columnDef) {
    columnDef.headerName = renameColumnName.value;
    gridApi.value.refreshHeader();

    const managedCol = managedColumns.value.find(col => col.field === renameColumnField.value);
    if (managedCol) {
      managedCol.headerName = renameColumnName.value;
    }

    saveColumnState();

    if (renameColumnModalInstance) {
      renameColumnModalInstance.hide();
    }

    success.value = 'Column renamed successfully';
    setTimeout(() => (success.value = null), 3000);
  }
};

// Column resized handler
const onColumnResized = (event) => {
  if (event.finished) {
    saveColumnState();
  }
};

// Column moved handler
const onColumnMoved = (event) => {
  if (event.finished) {
    saveColumnState();
  }
};

// Column visibility changed handler
const onColumnVisible = () => {
  saveColumnState();
};

// Save column state
const saveColumnState = async () => {
  if (!gridApi.value) return;

  try {
    const columnState = gridApi.value.getColumnState();
    await api.columnStates.save({
      tabName: 'recentsColumnState',
      state: columnState
    });
  } catch (err) {
    console.error('Error saving column state:', err);
  }
};

// Load column state
const loadColumnState = async () => {
  if (!gridApi.value) return;

  try {
    const response = await api.columnStates.get('recentsColumnState');
    if (response?.success && response.data) {
      gridApi.value.applyColumnState({
        state: response.data,
        applyOrder: true
      });
    }
  } catch (err) {
    console.error('Error loading column state:', err);
  }
};

// Load preferences to get page size
const loadPageSize = async () => {
  try {
    const response = await api.preferencesStore.get();
    if (response?.success && response.data?.itemsPerPage) {
      pageSize.value = response.data.itemsPerPage;
    }
  } catch (err) {
    console.error('Error loading page size:', err);
  }
};

// Mount
onMounted(() => {
  loadPageSize();
  loadData();

  // Initialize Bootstrap modal
  if (clearAllModal.value) {
    clearAllModalInstance = new Modal(clearAllModal.value);
  }

  // Listen for preference updates
  window.addEventListener('preferencesUpdated', (event) => {
    if (event.detail?.itemsPerPage) {
      pageSize.value = event.detail.itemsPerPage;
      if (gridApi.value) {
        gridApi.value.setGridOption('paginationPageSize', pageSize.value);
      }
    }
  });
});
</script>

<style scoped>
.recents-tab {
  background-color: var(--bg-primary);
}

/* Dark mode AG Grid styles */
[data-theme="dark"] .ag-theme-quartz {
  --ag-background-color: var(--bg-secondary);
  --ag-header-background-color: var(--bg-tertiary);
  --ag-odd-row-background-color: var(--bg-primary);
  --ag-row-hover-color: var(--bg-tertiary);
  --ag-foreground-color: var(--text-primary);
  --ag-border-color: var(--border-color);
}

[data-theme="dark"] .input-group-text {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

[data-theme="dark"] .form-control {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

[data-theme="dark"] .form-control:focus {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--link-color);
}

[data-theme="dark"] .modal-content {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

[data-theme="dark"] .modal-header,
[data-theme="dark"] .modal-footer {
  border-color: var(--border-color);
}

[data-theme="dark"] .list-group-item {
  background-color: var(--bg-primary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

/* Ensure grid fills container */
.ag-theme-quartz {
  --ag-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Custom footer overlay on AG Grid pagination */
.custom-grid-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  padding: 10px 16px;
  z-index: 10;
  pointer-events: none;
}

[data-theme="dark"] .custom-grid-footer {
  color: var(--text-primary);
}

[data-theme="dark"] .custom-grid-footer .text-muted {
  color: var(--text-secondary) !important;
}
</style>
