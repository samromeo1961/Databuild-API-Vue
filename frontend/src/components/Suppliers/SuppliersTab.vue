<template>
  <div class="suppliers-tab h-100 d-flex flex-column">
    <!-- Header and Search -->
    <div class="py-3 px-4 border-bottom">
      <div class="row align-items-center mb-3">
        <div class="col">
          <h4 class="mb-0">
            <i class="bi bi-people text-primary me-2"></i>
            Suppliers
          </h4>
        </div>
        <div class="col-auto">
          <span class="text-muted">
            {{ totalSize.toLocaleString() }} suppliers
            <span v-if="selectedRows.length > 0"> • {{ selectedRows.length }} selected</span>
          </span>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="row mb-3">
        <div class="col-md-5">
          <div class="input-group">
            <span class="input-group-text">
              <i class="bi bi-search"></i>
            </span>
            <input
              type="text"
              class="form-control"
              placeholder="Search by name, contact person, or email..."
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
        <div class="col-md-4">
          <!-- Supplier Group Multi-Select Dropdown -->
          <div class="dropdown w-100">
            <button
              class="btn btn-outline-secondary dropdown-toggle w-100 text-start d-flex justify-content-between align-items-center"
              type="button"
              id="supplierGroupDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span>
                {{ selectedGroupsDisplay }}
              </span>
            </button>
            <ul class="dropdown-menu w-100" style="max-height: 300px; overflow-y: auto;">
              <li v-if="filteredSupplierGroups.length === 0" class="px-3 py-2">
                <span class="text-muted small">No supplier groups available</span>
              </li>
              <li v-for="group in filteredSupplierGroups" :key="group.GroupNumber" class="px-3">
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    :id="`group-${group.GroupNumber}`"
                    :value="group.GroupNumber"
                    :checked="selectedGroups.includes(group.GroupNumber)"
                    @change="handleGroupToggle(group.GroupNumber)"
                  />
                  <label class="form-check-label" :for="`group-${group.GroupNumber}`">
                    {{ group.GroupNumber }} - {{ group.GroupName }}
                  </label>
                </div>
              </li>
              <li v-if="selectedGroups.length > 0">
                <hr class="dropdown-divider" />
              </li>
              <li v-if="selectedGroups.length > 0">
                <a class="dropdown-item text-danger" href="#" @click.prevent="clearGroupFilter">
                  <i class="bi bi-x-circle me-1"></i>
                  Clear Selection
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div class="col-md-3">
          <div class="btn-group w-100">
            <button
              class="btn btn-success"
              @click="handleAddContact"
              title="Add New Contact"
            >
              <i class="bi bi-person-plus"></i> Add
            </button>
            <button
              class="btn btn-outline-primary"
              @click="loadData"
              title="Refresh"
            >
              <i class="bi bi-arrow-clockwise"></i>
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
        :rowData="rowData"
        :defaultColDef="defaultColDef"
        :pagination="true"
        :paginationPageSize="pageSize"
        :paginationPageSizeSelector="pageSizeOptions"
        :rowSelection="rowSelectionConfig"
        :loading="loading"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @sort-changed="onSortChanged"
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
const totalSize = ref(0);
const selectedRows = ref([]);
const gridApi = ref(null);
const pageSize = ref(50);
const pageSizeOptions = [25, 50, 100, 200];
const sortField = ref(null);
const sortOrder = ref('asc');

// Supplier group filtering
const filteredSupplierGroups = ref([]);
const selectedGroups = ref([]);

// Check if dark mode
const isDarkMode = computed(() => {
  return theme && theme.value === 'dark';
});

// Display text for selected groups
const selectedGroupsDisplay = computed(() => {
  if (selectedGroups.value.length === 0) {
    return 'All Supplier Groups';
  } else if (selectedGroups.value.length === 1) {
    const group = filteredSupplierGroups.value.find(g => g.GroupNumber === selectedGroups.value[0]);
    return group ? `${group.GroupNumber} - ${group.GroupName}` : 'Selected (1)';
  } else {
    return `Selected (${selectedGroups.value.length})`;
  }
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
    field: 'SupplierCode',
    headerName: 'Supplier Code',
    width: 120,
    pinned: 'left',
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'SupplierName',
    headerName: 'Supplier Name',
    flex: 1,
    minWidth: 200,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'SupplierGroupName',
    headerName: 'Group',
    width: 130,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'ACN',
    headerName: 'ACN',
    width: 120,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'Address',
    headerName: 'Address',
    width: 180,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'Phone',
    headerName: 'Phone',
    width: 130,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'Email',
    headerName: 'Email',
    width: 180,
    filter: 'agTextColumnFilter',
    sortable: true,
    cellRenderer: (params) => {
      if (!params.value) return '-';
      return `<a href="mailto:${params.value}">${params.value}</a>`;
    }
  },
  {
    field: 'ContactPerson',
    headerName: 'Contact Person',
    width: 150,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 100,
    cellRenderer: (params) => {
      return `<button class="btn btn-sm btn-outline-primary" data-action="edit" data-supplier-code="${params.data.SupplierCode}">
                <i class="bi bi-pencil me-1"></i>Edit
              </button>`;
    },
    suppressHeaderMenuButton: true,
    sortable: false,
    filter: false
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

// Load supplier groups filtered by preferences
const loadSupplierGroups = async (preferencesOverride = null) => {
  try {
    const response = await api.suppliers.getGroups();
    const allGroups = response?.data || [];

    // Get user preferences and filter groups
    let prefs;
    if (preferencesOverride) {
      prefs = preferencesOverride;
    } else {
      const prefsResponse = await api.preferencesStore.get();
      prefs = prefsResponse?.data || {};
    }

    const selectedGroupNumbers = prefs.supplierSubGroups || [2]; // Default to group 2

    // Filter to only show groups selected in preferences
    const filtered = allGroups.filter(group =>
      selectedGroupNumbers.includes(group.GroupNumber)
    );
    filteredSupplierGroups.value = filtered;
  } catch (err) {
    console.error('Error loading supplier groups:', err);
  }
};

// Load data
const loadData = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Load ALL data - AG Grid will handle pagination client-side
    const params = {
      limit: 999999,
      offset: 0
    };

    if (searchTerm.value) {
      params.search = searchTerm.value;
    }

    if (selectedGroups.value.length > 0) {
      params.suppGroup = selectedGroups.value.join(',');
    }

    if (sortField.value) {
      params.sortField = sortField.value;
      params.sortOrder = sortOrder.value;
    }

    const response = await api.suppliers.getList(params);

    if (response?.success) {
      rowData.value = response.data || [];
      totalSize.value = response.total || response.data.length;
    } else {
      error.value = 'Failed to load suppliers';
    }
  } catch (err) {
    console.error('Error loading suppliers:', err);
    error.value = 'Error loading suppliers';
  } finally {
    loading.value = false;
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

// Handle supplier group toggle
const handleGroupToggle = (groupNumber) => {
  if (selectedGroups.value.includes(groupNumber)) {
    selectedGroups.value = selectedGroups.value.filter(g => g !== groupNumber);
  } else {
    selectedGroups.value = [...selectedGroups.value, groupNumber];
  }
  loadData();
};

// Clear group filter
const clearGroupFilter = () => {
  selectedGroups.value = [];
  loadData();
};

// Grid ready handler
const onGridReady = (params) => {
  gridApi.value = params.api;

  // Add click event listener for action buttons
  params.api.addEventListener('cellClicked', (event) => {
    if (event.event.target.dataset.action === 'edit') {
      handleEditSupplier(event.data);
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

// Handle edit supplier (placeholder)
const handleEditSupplier = (supplier) => {
  alert(`Edit supplier: ${supplier.SupplierName} (${supplier.SupplierCode}) - functionality coming soon!`);
};

// Handle add contact (placeholder)
const handleAddContact = () => {
  alert('Add new contact - functionality coming soon!');
};

// Export to Excel
const handleExportToExcel = () => {
  if (gridApi.value) {
    gridApi.value.exportDataAsCsv({
      fileName: 'suppliers-export.csv'
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
  loadSupplierGroups();

  // Listen for preference updates
  window.addEventListener('preferencesUpdated', (event) => {
    // Update page size
    if (event.detail?.itemsPerPage) {
      pageSize.value = event.detail.itemsPerPage;
      if (gridApi.value) {
        gridApi.value.paginationSetPageSize(pageSize.value);
        loadData();
      }
    }

    // Refresh supplier groups when preferences are updated
    loadSupplierGroups(event.detail);
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
.suppliers-tab {
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

[data-theme="dark"] .dropdown-menu {
  background-color: var(--bg-tertiary);
  border-color: var(--border-color);
}

[data-theme="dark"] .dropdown-item {
  color: var(--text-primary);
}

[data-theme="dark"] .dropdown-item:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

[data-theme="dark"] .dropdown-divider {
  border-color: var(--border-color);
}

[data-theme="dark"] .form-check-label {
  color: var(--text-primary);
}

/* Ensure grid fills container */
.ag-theme-quartz {
  --ag-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Dropdown menu styling */
.dropdown-menu {
  padding: 0.5rem 0;
}

.dropdown-menu .form-check {
  margin-bottom: 0.5rem;
}

.dropdown-menu .px-3 {
  padding-left: 1rem !important;
  padding-right: 1rem !important;
}

/* Make dropdown button behave like Bootstrap */
.btn.dropdown-toggle {
  position: relative;
}

.btn.dropdown-toggle::after {
  margin-left: auto;
}
</style>
