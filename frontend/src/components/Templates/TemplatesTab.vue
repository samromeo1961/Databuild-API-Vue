<template>
  <div class="templates-tab h-100 d-flex flex-column">
    <!-- Header with Search, Template Selector and Buttons -->
    <div class="py-3 px-4 border-bottom">
      <div class="row mb-3 align-items-center">
        <!-- Search Filter -->
        <div class="col-md-4">
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
              :disabled="!selectedTemplate"
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

        <!-- Template Selector -->
        <div class="col-md-2">
          <select
            class="form-select"
            v-model="selectedTemplateId"
            @change="onTemplateChange"
          >
            <option value="">Select Template...</option>
            <option v-for="template in templates" :key="template.id" :value="template.id">
              {{ template.templateName }} ({{ template.items?.length || 0 }} items)
            </option>
          </select>
        </div>

        <!-- Action Buttons -->
        <div class="col-md-6 d-flex justify-content-end align-items-center gap-3">
          <button
            class="btn btn-success"
            @click="handleNewTemplate"
            title="New Template"
          >
            <i class="bi bi-plus-circle"></i>
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
              <i class="bi bi-arrow-clockwise"></i>
            </span>
          </button>
          <button
            class="btn btn-outline-secondary"
            @click="openColumnPanel"
            :disabled="!selectedTemplate"
            title="Manage Columns"
          >
            <i class="bi bi-layout-three-columns"></i>
          </button>
          <button
            class="btn btn-outline-primary"
            @click="loadTemplates"
            title="Refresh"
          >
            <i class="bi bi-arrow-clockwise"></i>
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
    <div class="flex-grow-1 position-relative d-flex flex-column">
      <!-- Empty State -->
      <div v-if="!selectedTemplate && !loading" class="flex-grow-1 text-center py-5">
        <i class="bi bi-folder-plus" style="font-size: 4rem; color: var(--text-secondary);"></i>
        <h5 class="mt-3 text-muted">No Template Selected</h5>
        <p class="text-muted">
          {{ templates.length === 0
            ? 'No templates available. Create a new template to get started.'
            : 'Select a template from the dropdown above to view its items.' }}
        </p>
      </div>

      <!-- AG Grid -->
      <div v-else class="flex-grow-1 position-relative">
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
        />

        <!-- Custom footer info overlaid on AG Grid pagination -->
        <div class="custom-grid-footer">
          <span class="text-muted small">
            <i class="bi bi-folder me-1"></i>
            Total: <strong>{{ filteredData.length.toLocaleString() }}</strong> items
          </span>
          <span v-if="selectedRows.length > 0" class="text-primary small ms-3">
            <i class="bi bi-check2-square me-1"></i>
            {{ selectedRows.length }} selected
          </span>
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
import draggable from 'vuedraggable';

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
    // Save last selected template for persistence
    saveLastTemplate(selectedTemplateId.value);
  } else {
    selectedTemplate.value = null;
    saveLastTemplate('');
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
  loadColumnState();
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

// ===== Column Management Functions =====

// Open column management panel
const openColumnPanel = () => {
  if (!gridApi.value) return;

  // Build the list of managed columns from current grid state
  const allColumns = gridApi.value.getColumns();
  if (!allColumns) return;

  managedColumns.value = allColumns.map(col => {
    const colDef = col.getColDef();
    const colState = gridApi.value.getColumnState().find(c => c.colId === colDef.field);

    return {
      field: colDef.field,
      headerName: colDef.headerName || colDef.field,
      visible: !colState?.hide,
      pinned: colState?.pinned || null,
      width: colState?.width || colDef.width || 100
    };
  });

  if (columnManagementModal) {
    columnManagementModal.show();
  }
};

// Toggle column visibility
const toggleColumnVisibility = (col) => {
  if (!gridApi.value) return;

  gridApi.value.setColumnsVisible([col.field], col.visible);
  saveColumnState();
};

// Handle column reorder (from drag-and-drop)
const onColumnReorder = () => {
  if (!gridApi.value) return;

  // Apply the new order to AG Grid
  const newColumnState = managedColumns.value.map((col, index) => ({
    colId: col.field,
    hide: !col.visible,
    pinned: col.pinned,
    width: col.width
  }));

  gridApi.value.applyColumnState({ state: newColumnState, applyOrder: true });
  saveColumnState();
};

// Pin/unpin column
const pinColumn = (col, pinValue) => {
  if (!gridApi.value) return;

  col.pinned = pinValue;
  gridApi.value.setColumnPinned(col.field, pinValue);
  saveColumnState();
};

// Show rename column modal
const showRenameColumn = (col) => {
  renameColumnField.value = col.field;
  renameColumnName.value = col.headerName;

  if (columnManagementModal) {
    columnManagementModal.hide();
  }

  if (renameColumnModal) {
    renameColumnModal.show();
  }
};

// Confirm rename column
const confirmRenameColumn = () => {
  if (!gridApi.value || !renameColumnField.value) return;

  // Update the column definition
  const colDef = gridApi.value.getColumnDef(renameColumnField.value);
  if (colDef) {
    colDef.headerName = renameColumnName.value;
    gridApi.value.refreshHeader();
  }

  // Update managedColumns array
  const col = managedColumns.value.find(c => c.field === renameColumnField.value);
  if (col) {
    col.headerName = renameColumnName.value;
  }

  saveColumnState();

  if (renameColumnModal) {
    renameColumnModal.hide();
  }

  // Reopen column management modal
  if (columnManagementModal) {
    columnManagementModal.show();
  }
};

// Show all columns
const showAllColumns = () => {
  if (!gridApi.value) return;

  managedColumns.value.forEach(col => {
    col.visible = true;
  });

  const allColumnIds = managedColumns.value.map(c => c.field);
  gridApi.value.setColumnsVisible(allColumnIds, true);
  saveColumnState();
};

// Reset column settings to default
const resetColumnSettings = async () => {
  if (!gridApi.value) return;

  try {
    // Delete saved column state
    await api.columnStates.delete('templates');

    // Reset AG Grid to default state
    gridApi.value.resetColumnState();

    // Reload managed columns
    const allColumns = gridApi.value.getColumns();
    if (allColumns) {
      managedColumns.value = allColumns.map(col => {
        const colDef = col.getColDef();
        const colState = gridApi.value.getColumnState().find(c => c.colId === colDef.field);

        return {
          field: colDef.field,
          headerName: colDef.headerName || colDef.field,
          visible: !colState?.hide,
          pinned: colState?.pinned || null,
          width: colState?.width || colDef.width || 100
        };
      });
    }

    success.value = 'Column settings reset to default';
    setTimeout(() => (success.value = null), 3000);
  } catch (err) {
    console.error('Error resetting column settings:', err);
    error.value = 'Failed to reset column settings';
  }
};

// Save column state to electron-store
const saveColumnState = async () => {
  if (!gridApi.value) return;

  try {
    const columnState = gridApi.value.getColumnState();

    // Also save any custom header names (aliases)
    const aliases = {};
    managedColumns.value.forEach(col => {
      const colDef = gridApi.value.getColumnDef(col.field);
      if (colDef && colDef.headerName !== col.field) {
        aliases[col.field] = colDef.headerName;
      }
    });

    await api.columnStates.save('templates', {
      columnState,
      aliases
    });
  } catch (err) {
    console.error('Error saving column state:', err);
  }
};

// Load column state from electron-store
const loadColumnState = async () => {
  if (!gridApi.value) return;

  try {
    const response = await api.columnStates.get('templates');

    if (response?.success && response.data) {
      const { columnState, aliases } = response.data;

      // Apply column state
      if (columnState && Array.isArray(columnState)) {
        gridApi.value.applyColumnState({ state: columnState, applyOrder: true });
      }

      // Apply aliases (custom header names)
      if (aliases) {
        Object.keys(aliases).forEach(field => {
          const colDef = gridApi.value.getColumnDef(field);
          if (colDef) {
            colDef.headerName = aliases[field];
          }
        });
        gridApi.value.refreshHeader();
      }
    }
  } catch (err) {
    console.error('Error loading column state:', err);
  }
};

// ===== Last Template Persistence =====

// Save last selected template
const saveLastTemplate = async (templateId) => {
  try {
    const response = await api.preferencesStore.get();
    const prefs = response?.success ? response.data : {};

    prefs.lastSelectedTemplate = templateId;

    await api.preferencesStore.save(prefs);
  } catch (err) {
    console.error('Error saving last template:', err);
  }
};

// Load last selected template
const loadLastTemplate = async () => {
  try {
    const response = await api.preferencesStore.get();
    if (response?.success && response.data?.lastSelectedTemplate) {
      const lastTemplateId = response.data.lastSelectedTemplate;

      // Check if template still exists
      const templateExists = templates.value.find(t => t.id === lastTemplateId);
      if (templateExists) {
        selectedTemplateId.value = lastTemplateId;
        selectedTemplate.value = templateExists;
      }
    }
  } catch (err) {
    console.error('Error loading last template:', err);
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
onMounted(async () => {
  loadPageSize();
  await loadTemplates();

  // Load last selected template after templates are loaded
  await loadLastTemplate();

  // Initialize Bootstrap modals
  if (deleteTemplateModal.value) {
    deleteTemplateModalInstance = new Modal(deleteTemplateModal.value);
  }

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

/* Dark mode list-group styles for column management modal */
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

[data-theme="dark"] .list-group-item:hover {
  background-color: var(--bg-tertiary);
}

/* Grid footer styling */
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
