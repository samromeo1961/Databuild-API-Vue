<template>
  <div class="templates-tab h-100 d-flex flex-column">
    <!-- Header and Template Selector -->
    <div class="py-3 px-4 border-bottom">
      <div class="row align-items-center mb-3">
        <div class="col">
          <h4 class="mb-0">
            <i class="bi bi-file-earmark-text text-primary me-2"></i>
            Templates
          </h4>
          <p class="text-muted small mb-0">
            Select and manage your item templates
          </p>
        </div>
        <div class="col-auto">
          <span class="text-muted" v-if="selectedTemplate">
            {{ filteredData.length.toLocaleString() }} items
            <span v-if="selectedRows.length > 0"> • {{ selectedRows.length }} selected</span>
          </span>
        </div>
      </div>

      <!-- Template Selection and Actions -->
      <div class="row mb-3">
        <div class="col-md-6">
          <div class="input-group">
            <span class="input-group-text">
              <i class="bi bi-folder"></i>
            </span>
            <select
              class="form-select"
              v-model="selectedTemplateId"
              @change="onTemplateChange"
            >
              <option value="">Select a Template...</option>
              <option v-for="template in templates" :key="template.id" :value="template.id">
                {{ template.templateName }} ({{ template.items?.length || 0 }} items)
              </option>
            </select>
          </div>
        </div>
        <div class="col-md-6">
          <div class="btn-group w-100">
            <button
              class="btn btn-success"
              @click="handleNewTemplate"
              title="New Template"
            >
              <i class="bi bi-plus-circle"></i> New
            </button>
            <button
              class="btn btn-outline-success"
              @click="handleUpdatePrices"
              :disabled="!selectedTemplate || updatingPrices"
              title="Update Prices"
            >
              <span v-if="updatingPrices">
                <span class="spinner-border spinner-border-sm me-1"></span>
                Updating...
              </span>
              <span v-else>
                <i class="bi bi-arrow-clockwise"></i> Update Prices
              </span>
            </button>
            <button
              class="btn btn-outline-info"
              @click="handleExportToExcel"
              :disabled="!selectedTemplate"
              title="Export to Excel"
            >
              <i class="bi bi-file-earmark-excel"></i>
            </button>
            <button
              class="btn btn-outline-danger"
              @click="handleDeleteTemplate"
              :disabled="!selectedTemplate"
              title="Delete Template"
            >
              <i class="bi bi-trash"></i>
            </button>
            <button
              class="btn btn-outline-primary"
              @click="loadTemplates"
              title="Refresh"
            >
              <i class="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="row mb-3" v-if="selectedTemplate">
        <div class="col-md-6">
          <div class="input-group">
            <span class="input-group-text">
              <i class="bi bi-search"></i>
            </span>
            <input
              type="text"
              class="form-control"
              placeholder="Search items in template..."
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

    <!-- AG Grid or Empty State -->
    <div class="flex-grow-1 position-relative">
      <!-- Empty State -->
      <div v-if="!selectedTemplate && !loading" class="text-center py-5">
        <i class="bi bi-folder-plus" style="font-size: 4rem; color: var(--text-secondary);"></i>
        <h5 class="mt-3 text-muted">No Template Selected</h5>
        <p class="text-muted">
          {{ templates.length === 0
            ? 'No templates available. Create a new template to get started.'
            : 'Select a template from the dropdown above to view its items.' }}
        </p>
      </div>

      <!-- AG Grid -->
      <ag-grid-vue
        v-else
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
      />
    </div>

    <!-- Delete Template Confirmation Modal -->
    <div
      class="modal fade"
      id="deleteTemplateModal"
      tabindex="-1"
      aria-labelledby="deleteTemplateModalLabel"
      aria-hidden="true"
      ref="deleteTemplateModal"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="deleteTemplateModalLabel">Confirm Delete Template</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            Are you sure you want to delete the template "{{ selectedTemplate?.templateName }}"?
            This action cannot be undone.
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" @click="confirmDeleteTemplate">Delete</button>
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

const api = useElectronAPI();
const theme = inject('theme');

// State
const templates = ref([]);
const selectedTemplateId = ref('');
const selectedTemplate = ref(null);
const loading = ref(false);
const error = ref(null);
const success = ref(null);
const searchTerm = ref('');
const selectedRows = ref([]);
const gridApi = ref(null);
const pageSize = ref(50);
const pageSizeOptions = [25, 50, 100, 200];
const updatingPrices = ref(false);
const deleteTemplateModal = ref(null);
let deleteTemplateModalInstance = null;

// Check if dark mode
const isDarkMode = computed(() => {
  return theme && theme.value === 'dark';
});

// Filtered data based on search
const filteredData = computed(() => {
  if (!selectedTemplate.value || !selectedTemplate.value.items) return [];

  if (!searchTerm.value) return selectedTemplate.value.items;

  const search = searchTerm.value.toLowerCase();
  return selectedTemplate.value.items.filter(item =>
    item.PriceCode?.toLowerCase().includes(search) ||
    item.description?.toLowerCase().includes(search) ||
    item.Description?.toLowerCase().includes(search)
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
    field: 'description',
    headerName: 'Description',
    flex: 1,
    minWidth: 300,
    filter: 'agTextColumnFilter',
    sortable: true,
    valueGetter: (params) => {
      return params.data.description || params.data.Description || '';
    }
  },
  {
    field: 'Unit',
    headerName: 'Unit',
    width: 80,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    width: 100,
    filter: 'agNumberColumnFilter',
    sortable: true,
    valueFormatter: (params) => {
      if (params.value == null) return '-';
      return params.value.toString();
    },
    cellStyle: { textAlign: 'right' }
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

// Load templates
const loadTemplates = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await api.templatesStore.getList();
    if (response?.success) {
      templates.value = response.data || [];

      // If a template was selected, refresh it
      if (selectedTemplateId.value) {
        const updatedTemplate = templates.value.find(t => t.id === selectedTemplateId.value);
        if (updatedTemplate) {
          selectedTemplate.value = updatedTemplate;
        } else {
          // Template was deleted
          selectedTemplateId.value = '';
          selectedTemplate.value = null;
        }
      }
    } else {
      error.value = 'Failed to load templates';
    }
  } catch (err) {
    console.error('Error loading templates:', err);
    error.value = 'Error loading templates';
  } finally {
    loading.value = false;
  }
};

// Template change handler
const onTemplateChange = () => {
  if (selectedTemplateId.value) {
    selectedTemplate.value = templates.value.find(t => t.id === selectedTemplateId.value);
  } else {
    selectedTemplate.value = null;
  }
  searchTerm.value = '';
};

// Search change handler with debounce
const onSearchChange = () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    // Filtering happens automatically via computed property
  }, 300);
};

// Clear search
const clearSearch = () => {
  searchTerm.value = '';
};

// Grid ready handler
const onGridReady = (params) => {
  gridApi.value = params.api;
};

// Selection changed handler
const onSelectionChanged = () => {
  if (gridApi.value) {
    selectedRows.value = gridApi.value.getSelectedRows();
  }
};

// Handle new template
const handleNewTemplate = () => {
  alert('New template editor - functionality coming soon!');
};

// Handle update prices
const handleUpdatePrices = async () => {
  if (!selectedTemplate.value || !selectedTemplate.value.items || selectedTemplate.value.items.length === 0) {
    error.value = 'Cannot update prices: Template has no items';
    return;
  }

  updatingPrices.value = true;
  error.value = null;
  success.value = null;

  try {
    const response = await api.templates.updatePrices(selectedTemplate.value.id, {
      items: selectedTemplate.value.items
    });

    if (response?.success) {
      // Update the template with new prices
      const updatedTemplate = {
        ...selectedTemplate.value,
        items: response.updatedItems,
        dateModified: new Date().toISOString()
      };
      await api.templatesStore.save(updatedTemplate);
      await loadTemplates();

      success.value = `Prices updated: ${response.updatedCount} of ${response.totalItems} items updated successfully.`;
      setTimeout(() => (success.value = null), 5000);
    } else {
      error.value = 'Failed to update prices: ' + (response.error || 'Unknown error');
    }
  } catch (err) {
    console.error('Error updating prices:', err);
    error.value = 'Failed to update prices: ' + (err.message || 'Network error');
  } finally {
    updatingPrices.value = false;
  }
};

// Handle export to Excel
const handleExportToExcel = () => {
  if (gridApi.value && selectedTemplate.value) {
    gridApi.value.exportDataAsCsv({
      fileName: `${selectedTemplate.value.templateName}-export.csv`
    });
    success.value = 'Exported to CSV';
    setTimeout(() => (success.value = null), 3000);
  }
};

// Handle delete template
const handleDeleteTemplate = () => {
  if (deleteTemplateModalInstance) {
    deleteTemplateModalInstance.show();
  }
};

// Confirm delete template
const confirmDeleteTemplate = async () => {
  if (selectedTemplate.value) {
    try {
      const response = await api.templatesStore.delete(selectedTemplate.value.id);
      if (response?.success) {
        if (deleteTemplateModalInstance) {
          deleteTemplateModalInstance.hide();
        }

        success.value = 'Template deleted successfully';
        setTimeout(() => (success.value = null), 3000);

        selectedTemplateId.value = '';
        selectedTemplate.value = null;
        await loadTemplates();
      } else {
        error.value = 'Failed to delete template';
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      error.value = 'Failed to delete template';
    }
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
  loadTemplates();

  // Initialize Bootstrap modal
  if (deleteTemplateModal.value) {
    deleteTemplateModalInstance = new Modal(deleteTemplateModal.value);
  }

  // Listen for preference updates
  window.addEventListener('preferencesUpdated', (event) => {
    if (event.detail?.itemsPerPage) {
      pageSize.value = event.detail.itemsPerPage;
      if (gridApi.value) {
        gridApi.value.paginationSetPageSize(pageSize.value);
      }
    }
  });
});
</script>

<style scoped>
.templates-tab {
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

[data-theme="dark"] .modal-content {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

[data-theme="dark"] .modal-header,
[data-theme="dark"] .modal-footer {
  border-color: var(--border-color);
}

/* Ensure grid fills container */
.ag-theme-quartz {
  --ag-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Empty state styling */
.text-center i {
  opacity: 0.5;
}
</style>
