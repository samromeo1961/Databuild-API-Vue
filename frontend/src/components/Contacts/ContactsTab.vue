<template>
  <div class="contacts-tab h-100 d-flex flex-column">
    <!-- Header and Search -->
    <div class="py-3 px-4 border-bottom">
      <div class="row align-items-center mb-3">
        <div class="col">
          <h4 class="mb-0">
            <i class="bi bi-person-lines-fill text-primary me-2"></i>
            Contacts
          </h4>
        </div>
        <div class="col-auto">
          <span class="text-muted">
            {{ totalSize.toLocaleString() }} contacts
            <span v-if="selectedRows.length > 0"> • {{ selectedRows.length }} selected</span>
          </span>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="row mb-3">
        <div class="col-md-6">
          <div class="input-group">
            <span class="input-group-text">
              <i class="bi bi-search"></i>
            </span>
            <input
              type="text"
              class="form-control"
              placeholder="Search by code, name, contact, email..."
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
        <div class="col-md-6">
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
        @row-double-clicked="handleEditContact"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
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

// AG Grid column definitions
const columnDefs = ref([
  {
    field: 'Code',
    headerName: 'Code',
    width: 100,
    pinned: 'left',
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'Name',
    headerName: 'Name',
    width: 200,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'Contact',
    headerName: 'Contact Person',
    width: 180,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'Email',
    headerName: 'Email',
    flex: 1,
    minWidth: 200,
    filter: 'agTextColumnFilter',
    sortable: true,
    cellRenderer: (params) => {
      if (!params.value) return '-';
      return `<a href="mailto:${params.value}">${params.value}</a>`;
    }
  },
  {
    field: 'Phone',
    headerName: 'Phone',
    width: 130,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'Mobile',
    headerName: 'Mobile',
    width: 130,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'Address',
    headerName: 'Address',
    width: 200,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'City',
    headerName: 'City',
    width: 130,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'State',
    headerName: 'State',
    width: 80,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'Postcode',
    headerName: 'Postcode',
    width: 100,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'Group_',
    headerName: 'Group',
    width: 100,
    filter: 'agTextColumnFilter',
    sortable: true
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
    // Load ALL data - AG Grid will handle pagination client-side
    const params = {
      limit: 999999,
      offset: 0
    };

    if (searchTerm.value) {
      params.searchTerm = searchTerm.value;
    }

    const response = await api.contacts.getList(params);

    if (response?.success) {
      rowData.value = response.data || [];
      totalSize.value = response.total || response.data?.length || 0;
    } else {
      error.value = 'Failed to load contacts';
    }
  } catch (err) {
    console.error('Error loading contacts:', err);
    error.value = 'Error loading contacts';
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

// Grid ready handler
const onGridReady = (params) => {
  gridApi.value = params.api;
  loadData();
};

// Selection changed handler
const onSelectionChanged = () => {
  if (gridApi.value) {
    selectedRows.value = gridApi.value.getSelectedRows();
  }
};

// Add contact
const handleAddContact = () => {
  alert('Add new contact - functionality coming soon!');
};

// Edit contact
const handleEditContact = (event) => {
  const contact = event.data;
  alert(`Edit contact: ${contact.Name} (${contact.Code}) - functionality coming soon!`);
};

// Export to Excel
const handleExportToExcel = () => {
  if (gridApi.value) {
    gridApi.value.exportDataAsCsv({
      fileName: 'contacts-export.csv'
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
</script>

<style scoped>
.contacts-tab {
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
