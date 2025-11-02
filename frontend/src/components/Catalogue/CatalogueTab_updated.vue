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
      <div class="row mb-3">
        <div class="col-md-5">
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
          <select
            class="form-select"
            v-model="costCentre"
            @change="onFilterChange"
          >
            <option value="">All Cost Centres</option>
            <option v-for="cc in costCentres" :key="cc.Code" :value="cc.Code">
              {{ cc.Code }} - {{ cc.Description }}
            </option>
          </select>
        </div>
        <div class="col-md-5">
          <div class="btn-group w-100">
            <button
              class="btn btn-outline-secondary"
              @click="openColumnPanel"
              title="Manage Columns"
            >
              <i class="bi bi-layout-three-columns"></i>
            </button>
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
              <i class="bi bi-plus-circle"></i> Template
            </button>
            <button
              class="btn btn-warning"
              @click="handleSendToZzTakeoff"
              :disabled="selectedRows.length === 0"
              title="Send to zzTakeoff"
            >
              <i class="bi bi-send"></i> zzTakeoff
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
        :sideBar="sideBar"
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
        @column-resized="onColumnResized"
        @column-moved="onColumnMoved"
        @column-visible="onColumnVisible"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '../../composables/useElectronAPI';

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

// Sidebar configuration for column panel
const sideBar = {
  toolPanels: [
    {
      id: 'columns',
      labelDefault: 'Columns',
      labelKey: 'columns',
      iconKey: 'columns',
      toolPanel: 'agColumnsToolPanel',
      toolPanelParams: {
        suppressRowGroups: true,
        suppressValues: true,
        suppressPivots: true,
        suppressPivotMode: true,
        suppressColumnFilter: false,
        suppressColumnSelectAll: false,
        suppressColumnExpandAll: false
      }
    }
  ],
  defaultToolPanel: ''
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

// Column state persistence key
const COLUMN_STATE_KEY = 'catalogueColumnState';

// Save column state
const saveColumnState = () => {
  if (gridApi.value) {
    const columnState = gridApi.value.getColumnState();
    localStorage.setItem(COLUMN_STATE_KEY, JSON.stringify(columnState));
    console.log('Column state saved:', columnState);
  }
};

// Restore column state
const restoreColumnState = () => {
  const savedState = localStorage.getItem(COLUMN_STATE_KEY);
  if (savedState && gridApi.value) {
    try {
      const columnState = JSON.parse(savedState);
      gridApi.value.applyColumnState({ state: columnState, applyOrder: true });
      console.log('Column state restored');
    } catch (err) {
      console.error('Error restoring column state:', err);
    }
  }
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
      rowData.value = response.data || [];
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

  // Restore column state
  restoreColumnState();

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

// Open column panel
const openColumnPanel = () => {
  if (gridApi.value) {
    gridApi.value.openToolPanel('columns');
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

  // Listen for preference updates
  window.addEventListener('preferencesUpdated', (event) => {
    if (event.detail?.itemsPerPage) {
      pageSize.value = event.detail.itemsPerPage;
      if (gridApi.value) {
        gridApi.value.paginationSetPageSize(pageSize.value);
        loadData();
      }
    }
  });
});

// Watch page size changes
watch(pageSize, () => {
  if (gridApi.value) {
    gridApi.value.paginationSetPageSize(pageSize.value);
    loadData();
  }
});
</script>

<style scoped>
.catalogue-tab {
  background-color: var(--bg-primary);
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
</style>
