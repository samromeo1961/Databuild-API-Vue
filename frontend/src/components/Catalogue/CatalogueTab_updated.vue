<template>
  <div class="catalogue-tab h-100 d-flex flex-column">
    <!-- Header and Search -->
    <div class="py-3 px-4 border-bottom">
      <div class="row align-items-center mb-3">
        <div class="col">
          <h4 class="mb-0">
            <i class="bi bi-box-seam text-primary me-2"></i>
            Catalogue
          </h4>
        </div>
        <div class="col-auto">
          <span class="text-muted">
            {{ totalSize.toLocaleString() }} items
            <span v-if="selectedRows.length > 0"> • {{ selectedRows.length }} selected</span>
          </span>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="row mb-3 align-items-center">
        <div class="col-md-3">
          <div class="input-group">
            <span class="input-group-text">
              <i class="bi bi-search"></i>
            </span>
            <input
              type="text"
              class="form-control"
              placeholder="Search by code or description..."
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
        <div class="col-md-2">
          <SearchableSelect
            v-model="costCentre"
            :options="costCentres"
            :label-key="(cc) => `${cc.Code} - ${cc.Name}`"
            value-key="Code"
            placeholder="All Cost Centres"
            clear-label="All Cost Centres"
            @change="onFilterChange"
          />
        </div>
        <div class="col-md-7">
          <div class="d-flex justify-content-end align-items-center gap-3">
            <button
              class="btn btn-outline-primary"
              @click="handleAddToFavourites"
              :disabled="selectedRows.length === 0"
              title="Add to Favourites"
            >
              <i class="bi bi-star"></i>
            </button>
            <button
              class="btn btn-outline-success"
              @click="handleAddToTemplate"
              :disabled="selectedRows.length === 0"
              title="Add to Template"
            >
              <i class="bi bi-plus-circle"></i>
            </button>
            <button
              class="btn btn-warning"
              @click="handleSendToZzTakeoff"
              :disabled="selectedRows.length === 0"
              title="Send to zzTakeoff"
            >
              <i class="bi bi-send"></i>
            </button>
            <button
              class="btn btn-outline-secondary"
              @click="openColumnPanel"
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
        :rowData="rowData"
        :defaultColDef="defaultColDef"
        :pagination="true"
        :paginationPageSize="pageSize"
        :paginationPageSizeSelector="pageSizeOptions"
        :rowSelection="rowSelectionConfig"
        :loading="loading"
        :enableCellTextSelection="true"
        :ensureDomOrder="true"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @sort-changed="onSortChanged"
        @cell-value-changed="onCellValueChanged"
        @column-resized="onColumnResized"
        @column-moved="onColumnMoved"
        @column-visible="onColumnVisible"
      />
    </div>

    <!-- Column Management Modal -->
    <div
      class="modal fade"
      id="columnManagementModal"
      tabindex="-1"
      aria-labelledby="columnManagementModalLabel"
      aria-hidden="true"
      ref="columnManagementModalRef"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="columnManagementModalLabel">
              <i class="bi bi-layout-three-columns me-2"></i>Manage Columns
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="row mb-3">
              <div class="col">
                <p class="text-muted mb-2">
                  <i class="bi bi-info-circle me-1"></i>
                  Drag to reorder, check to show/hide, or use pin buttons. Changes are saved automatically.
                </p>
              </div>
            </div>

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
                    <label :for="`col-${col.field}`" class="mb-0 fw-medium">
                      {{ col.headerName }}
                      <span v-if="col.pinned" class="badge bg-primary ms-2">
                        <i class="bi bi-pin-angle-fill"></i> {{ col.pinned }}
                      </span>
                    </label>
                    <small class="d-block text-muted">{{ col.field }}</small>
                  </div>
                  <div class="btn-group btn-group-sm me-2">
                    <button
                      class="btn btn-outline-secondary"
                      :class="{ 'active': col.pinned === 'left' }"
                      @click="pinColumn(col, 'left')"
                      title="Pin Left"
                    >
                      <i class="bi bi-pin-angle"></i> Left
                    </button>
                    <button
                      class="btn btn-outline-secondary"
                      :class="{ 'active': !col.pinned }"
                      @click="pinColumn(col, null)"
                      title="Unpin"
                    >
                      <i class="bi bi-dash-circle"></i>
                    </button>
                    <button
                      class="btn btn-outline-secondary"
                      :class="{ 'active': col.pinned === 'right' }"
                      @click="pinColumn(col, 'right')"
                      title="Pin Right"
                    >
                      <i class="bi bi-pin-angle"></i> Right
                    </button>
                  </div>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="showRenameColumn(col)"
                    title="Rename column"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                </div>
              </template>
            </draggable>

            <div class="mt-3 d-flex gap-2">
              <button class="btn btn-sm btn-outline-primary" @click="showAllColumns">
                <i class="bi bi-eye me-1"></i>Show All
              </button>
              <button class="btn btn-sm btn-outline-secondary" @click="resetColumnSettings">
                <i class="bi bi-arrow-clockwise me-1"></i>Reset to Default
              </button>
            </div>
          </div>
          <div class="modal-footer">
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
      ref="renameColumnModalRef"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="renameColumnModalLabel">Rename Column</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="columnNewName" class="form-label">Column Name</label>
              <input
                type="text"
                id="columnNewName"
                class="form-control"
                v-model="renameColumnName"
                placeholder="Enter column name..."
              />
              <small class="text-muted">Field: {{ renameColumnField }}</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="confirmRenameColumn">Save</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '../../composables/useElectronAPI';
import { Modal } from 'bootstrap';
import draggable from 'vuedraggable';
import SearchableSelect from '../common/SearchableSelect.vue';

const api = useElectronAPI();
const theme = inject('theme');

// State
const rowData = ref([]);
const loading = ref(false);
const error = ref(null);
const success = ref(null);
const searchTerm = ref('');
const costCentre = ref('');
const costCentres = ref([]);
const totalSize = ref(0);
const selectedRows = ref([]);
const gridApi = ref(null);
const pageSize = ref(50);
const pageSizeOptions = [25, 50, 100, 200];
const sortField = ref(null);
const sortOrder = ref('asc');

// Column Management Modal
const columnManagementModalRef = ref(null);
const renameColumnModalRef = ref(null);
let columnManagementModal = null;
let renameColumnModal = null;
const managedColumns = ref([]);
const renameColumnField = ref('');
const renameColumnName = ref('');

// Check if dark mode
const isDarkMode = computed(() => {
  return theme && theme.value === 'dark';
});

// Row selection configuration (new v32+ API)
const rowSelectionConfig = {
  mode: 'multiRow',
  checkboxes: true,
  headerCheckbox: true,
  enableClickSelection: false
};

// AG Grid column definitions - ALL REQUIRED COLUMNS
const columnDefs = ref([
  {
    field: 'CostCentre',
    headerName: 'Cost Centre',
    width: 120,
    pinned: 'left',
    filter: 'agTextColumnFilter',
    sortable: true,
    hide: false
  },
  {
    field: 'CostCentreName',
    headerName: 'CC Name',
    width: 200,
    filter: 'agTextColumnFilter',
    sortable: true,
    hide: false
  },
  {
    field: 'ItemCode',
    headerName: 'Item Code',
    width: 150,
    filter: 'agTextColumnFilter',
    sortable: true,
    hide: false
  },
  {
    field: 'Description',
    headerName: 'Description',
    flex: 1,
    minWidth: 300,
    filter: 'agTextColumnFilter',
    sortable: true,
    hide: false
  },
  {
    field: 'Unit',
    headerName: 'Unit',
    width: 80,
    filter: 'agTextColumnFilter',
    sortable: true,
    hide: false
  },
  {
    field: 'Category',
    headerName: 'Sub Group',
    width: 150,
    filter: 'agTextColumnFilter',
    sortable: true,
    hide: false
  },
  {
    field: 'LatestPrice',
    headerName: 'Price',
    width: 120,
    filter: 'agNumberColumnFilter',
    sortable: true,
    valueFormatter: (params) => {
      if (params.value == null) return '-';
      return `$${params.value.toFixed(2)}`;
    },
    cellStyle: { textAlign: 'right' },
    hide: false
  },
  {
    field: 'LatestPriceDate',
    headerName: 'Price Date',
    width: 120,
    filter: 'agDateColumnFilter',
    sortable: true,
    valueFormatter: (params) => {
      if (!params.value) return '-';
      const date = new Date(params.value);
      return date.toLocaleDateString();
    },
    hide: false
  },
  {
    field: 'zzType',
    headerName: 'zzType',
    width: 120,
    filter: 'agTextColumnFilter',
    sortable: true,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: ['', 'area', 'linear', 'segment', 'count']
    },
    hide: false
  },
  {
    field: 'Recipe',
    headerName: 'Recipe',
    width: 90,
    cellRenderer: (params) => {
      return params.value === 1 ? '<i class="bi bi-check-circle text-success"></i>' : '';
    },
    filter: 'agTextColumnFilter',
    sortable: true,
    hide: true
  },
  {
    field: 'Template',
    headerName: 'Template',
    width: 100,
    filter: 'agTextColumnFilter',
    sortable: true,
    hide: true
  },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 100,
    pinned: 'right',
    cellRenderer: (params) => {
      return `
        <div class="action-buttons">
          <button class="btn btn-sm btn-outline-success" data-action="template" title="Add to Template">
            <i class="bi bi-plus-circle"></i>
          </button>
          <button class="btn btn-sm btn-warning" data-action="zztakeoff" title="Send to zzTakeoff">
            <i class="bi bi-send"></i>
          </button>
        </div>
      `;
    },
    suppressHeaderMenuButton: true,
    sortable: false,
    filter: false,
    hide: false,
    lockPosition: true
  }
]);

// Default column properties
const defaultColDef = {
  resizable: true,
  sortable: false,
  filter: false,
  floatingFilter: false,
  enableCellChangeFlash: true
};

// Debounce timer
let searchDebounce = null;

// Load data
const loadData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const params = {
      limit: pageSize.value,
      offset: (gridApi.value?.paginationGetCurrentPage() || 0) * pageSize.value
    };

    if (searchTerm.value) {
      params.searchTerm = searchTerm.value;
    }

    if (costCentre.value) {
      params.costCentre = costCentre.value;
    }

    if (sortField.value) {
      params.sortField = sortField.value;
      params.sortOrder = sortOrder.value;
    }

    const response = await api.catalogue.getItems(params);

    if (response?.success) {
      const catalogueData = response.data || [];

      // Load zzTypes from store (user overrides)
      const zzTypesResponse = await api.zzTypeStore.getAll();
      const zzTypes = zzTypesResponse?.success ? zzTypesResponse.types || {} : {};

      // Load preferences to get unit mappings
      const preferencesResponse = await api.preferencesStore.get();
      const unitMappings = preferencesResponse?.success && preferencesResponse.data?.unitTakeoffMappings
        ? preferencesResponse.data.unitTakeoffMappings
        : {};

      // Merge zzTypes with catalogue data
      // Priority: 1. Saved zzType override, 2. Unit mapping from preferences, 3. Empty
      rowData.value = catalogueData.map(item => {
        const savedZzType = zzTypes[item.ItemCode];
        const mappedZzType = item.Unit ? unitMappings[item.Unit] : null;

        return {
          ...item,
          zzType: savedZzType || mappedZzType || ''
        };
      });

      totalSize.value = response.total || response.data?.length || 0;
    } else {
      error.value = 'Failed to load catalogue items';
    }
  } catch (err) {
    console.error('Error loading catalogue:', err);
    error.value = 'Error loading catalogue items';
  } finally {
    loading.value = false;
  }
};

// Load cost centres
const loadCostCentres = async () => {
  try {
    const response = await api.costCentres.getList({});
    if (response?.success) {
      costCentres.value = response.data || [];
    }
  } catch (err) {
    console.error('Error loading cost centres:', err);
  }
};

// Search change handler with debounce
const onSearchChange = () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    loadData();
  }, 500);
};

// Clear search
const clearSearch = () => {
  searchTerm.value = '';
  loadData();
};

// Filter change handler
const onFilterChange = () => {
  loadData();
};

// Grid ready handler
const onGridReady = (params) => {
  gridApi.value = params.api;

  // Load saved column state
  loadColumnState();

  // Add click event listener for row actions
  params.api.addEventListener('cellClicked', (event) => {
    if (event.event.target.dataset.action === 'template') {
      handleAddSingleItemToTemplate(event.data);
    } else if (event.event.target.dataset.action === 'zztakeoff') {
      handleSendSingleItemToZzTakeoff(event.data);
    }
  });

  loadData();
};

// Selection changed handler
const onSelectionChanged = () => {
  if (gridApi.value) {
    selectedRows.value = gridApi.value.getSelectedRows();
  }
};

// Sort changed handler
const onSortChanged = () => {
  if (gridApi.value) {
    const sortModel = gridApi.value.getColumnState().find(col => col.sort);
    if (sortModel) {
      sortField.value = sortModel.colId;
      sortOrder.value = sortModel.sort;
    } else {
      sortField.value = null;
      sortOrder.value = 'asc';
    }
    loadData();
  }
};

// Cell value changed handler (for zzType editing)
const onCellValueChanged = async (event) => {
  const { data, colDef, newValue, oldValue } = event;
  const field = colDef.field;

  // Only handle zzType changes
  if (field !== 'zzType' || newValue === oldValue) return;

  try {
    console.log('[zzType] Saving:', data.ItemCode, '→', newValue);

    // Save zzType to electron-store
    const result = await api.zzTypeStore.set(data.ItemCode, newValue.toLowerCase());

    if (result && result.success) {
      success.value = 'zzType updated successfully';
      setTimeout(() => success.value = null, 3000);
    } else {
      error.value = 'Failed to update zzType';
      setTimeout(() => error.value = null, 3000);
      // Revert the change
      event.node.setDataValue(field, oldValue);
    }
  } catch (err) {
    console.error('Error saving zzType:', err);
    error.value = 'Error saving zzType';
    setTimeout(() => error.value = null, 3000);
    // Revert the change
    event.node.setDataValue(field, oldValue);
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

// Column Management Functions
const openColumnPanel = () => {
  if (!gridApi.value) return;

  // Get current column state from grid
  const columnState = gridApi.value.getColumnState();

  // Build managed columns list based on current grid order
  managedColumns.value = columnState
    .filter(state => state.colId && state.colId !== 'ag-Grid-SelectionColumn' && state.colId !== 'actions')
    .map(state => {
      const colDef = gridApi.value.getColumnDef(state.colId);
      return {
        field: state.colId,
        headerName: colDef?.headerName || state.colId,
        visible: !state.hide,
        pinned: state.pinned || null,
        width: state.width || colDef?.width || 150
      };
    });

  if (columnManagementModal) {
    columnManagementModal.show();
  }
};

const toggleColumnVisibility = (column) => {
  if (!gridApi.value) return;

  gridApi.value.applyColumnState({
    state: [{
      colId: column.field,
      hide: !column.visible
    }],
    defaultState: { hide: false }
  });

  saveColumnState();
};

const onColumnReorder = () => {
  if (!gridApi.value) return;

  const orderedColIds = managedColumns.value.map(col => col.field);

  gridApi.value.applyColumnState({
    state: orderedColIds.map((colId, index) => ({
      colId,
      sortIndex: index
    })),
    applyOrder: true
  });

  saveColumnState();
};

const pinColumn = (column, position) => {
  if (!gridApi.value) return;

  column.pinned = position;

  gridApi.value.applyColumnState({
    state: [{
      colId: column.field,
      pinned: position
    }],
    defaultState: { pinned: null }
  });

  saveColumnState();
};

const showRenameColumn = (column) => {
  renameColumnField.value = column.field;
  renameColumnName.value = column.headerName;

  if (renameColumnModal) {
    renameColumnModal.show();
  }
};

const confirmRenameColumn = () => {
  if (!gridApi.value || !renameColumnName.value) return;

  const colDef = gridApi.value.getColumnDef(renameColumnField.value);
  if (colDef) {
    colDef.headerName = renameColumnName.value;
    gridApi.value.refreshHeader();

    // Update in managedColumns
    const managedCol = managedColumns.value.find(c => c.field === renameColumnField.value);
    if (managedCol) {
      managedCol.headerName = renameColumnName.value;
    }

    saveColumnState();
  }

  if (renameColumnModal) {
    renameColumnModal.hide();
  }
};

const showAllColumns = () => {
  if (!gridApi.value) return;

  managedColumns.value.forEach(col => {
    col.visible = true;
  });

  const columnState = managedColumns.value.map(col => ({
    colId: col.field,
    hide: false
  }));

  gridApi.value.applyColumnState({
    state: columnState,
    defaultState: { hide: false }
  });

  saveColumnState();
};

const resetColumnSettings = async () => {
  try {
    if (!gridApi.value) return;

    // Clear saved column state
    await api.columnStates.delete('catalogueColumnState');

    // Reset grid to default column state
    gridApi.value.resetColumnState();

    // Reload the modal with current state
    openColumnPanel();

  } catch (err) {
    console.error('Error resetting column settings:', err);
  }
};

const saveColumnState = async () => {
  if (!gridApi.value) return;

  try {
    const columnState = gridApi.value.getColumnState();
    await api.columnStates.save({
      tabName: 'catalogueColumnState',
      state: columnState
    });
  } catch (err) {
    console.error('Error saving column state:', err);
  }
};

const loadColumnState = async () => {
  if (!gridApi.value) return;

  try {
    const response = await api.columnStates.get('catalogueColumnState');
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

// Placeholder functions for future implementation
const handleAddToFavourites = () => {
  success.value = 'Add to Favourites - Coming soon';
  setTimeout(() => success.value = null, 2000);
};

const handleAddToTemplate = () => {
  success.value = 'Add to Template - Coming soon';
  setTimeout(() => success.value = null, 2000);
};

const handleAddSingleItemToTemplate = (item) => {
  selectedRows.value = [item];
  handleAddToTemplate();
};

const handleSendToZzTakeoff = () => {
  success.value = 'Send to zzTakeoff - Coming soon';
  setTimeout(() => success.value = null, 2000);
};

const handleSendSingleItemToZzTakeoff = (item) => {
  selectedRows.value = [item];
  handleSendToZzTakeoff();
};

const handleExportToExcel = () => {
  if (gridApi.value) {
    gridApi.value.exportDataAsCsv({
      fileName: 'catalogue-export.csv'
    });
    success.value = 'Exported to CSV';
    setTimeout(() => success.value = null, 3000);
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

// Listen for preferences updates
onMounted(() => {
  loadPageSize();
  loadCostCentres();

  // Initialize modals
  if (columnManagementModalRef.value) {
    columnManagementModal = new Modal(columnManagementModalRef.value);
  }
  if (renameColumnModalRef.value) {
    renameColumnModal = new Modal(renameColumnModalRef.value);
  }

  // Listen for preference updates
  window.addEventListener('preferencesUpdated', (event) => {
    if (event.detail?.itemsPerPage) {
      pageSize.value = event.detail.itemsPerPage;
      if (gridApi.value) {
        gridApi.value.setGridOption('paginationPageSize', pageSize.value);
        loadData();
      }
    }
  });
});

// Watch page size changes
watch(pageSize, () => {
  if (gridApi.value) {
    gridApi.value.setGridOption('paginationPageSize', pageSize.value);
    loadData();
  }
});
</script>

<style scoped>
.catalogue-tab {
  background-color: var(--bg-primary);
}

/* Header action buttons */
.col-md-7 > div > .btn {
  margin-left: 0.75rem !important;
}

.col-md-7 > div > .btn:first-child {
  margin-left: 0 !important;
}

/* Action buttons in cells */
.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.action-buttons .btn {
  padding: 2px 6px;
  font-size: 0.875rem;
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

[data-theme="dark"] .form-control,
[data-theme="dark"] .form-select {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

[data-theme="dark"] .form-control:focus,
[data-theme="dark"] .form-select:focus {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--link-color);
}

/* Ensure grid fills container */
.ag-theme-quartz {
  --ag-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Dark mode modal styling */
[data-theme="dark"] .modal-content {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

[data-theme="dark"] .modal-header {
  border-bottom-color: var(--border-color);
}

[data-theme="dark"] .modal-footer {
  border-top-color: var(--border-color);
}

[data-theme="dark"] .list-group-item {
  --bs-list-group-bg: var(--bg-primary);
  --bs-list-group-color: var(--text-primary);
  --bs-list-group-border-color: var(--border-color);
  background-color: var(--bg-primary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

[data-theme="dark"] .list-group {
  --bs-list-group-bg: var(--bg-primary);
  --bs-list-group-border-color: var(--border-color);
}

/* Dark mode AG Grid tool panel styling */
[data-theme="dark"] .ag-side-bar {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

[data-theme="dark"] .ag-input-field-input,
[data-theme="dark"] .ag-text-field-input {
  background-color: var(--bg-primary) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

[data-theme="dark"] .ag-select {
  background-color: var(--bg-primary) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

[data-theme="dark"] .ag-picker-field-wrapper {
  background-color: var(--bg-primary) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

[data-theme="dark"] .ag-list-item {
  background-color: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .ag-column-select-header {
  background-color: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
}
</style>
