<template>
  <div class="catalogue-tab h-100 d-flex flex-column">
    <!-- Filters and Actions -->
    <div class="py-3 px-4 border-bottom">
      <!-- Search Bar -->
      <div class="row mb-3 align-items-center">
        <div class="col-md-4">
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
          <SearchableMultiSelect
            v-model="selectedCostCentres"
            :options="costCentres"
            placeholder="All Cost Centres"
            :labelKey="(item) => `${item.Code} - ${item.Name}`"
            valueKey="Code"
            selectAllLabel="✕ Clear Filters"
            @change="onFilterChange"
          />
        </div>
        <div class="col-md-6 d-flex justify-content-end align-items-center gap-2">
          <!-- Show Archived Toggle -->
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              id="showArchivedCheckbox"
              v-model="showArchived"
              @change="onShowArchivedChange"
            />
            <label class="form-check-label" for="showArchivedCheckbox">
              Show Archived
            </label>
          </div>

          <!-- Date Range Pickers -->
          <input
            type="date"
            class="form-control form-control-sm"
            style="width: 150px;"
            v-model="dateFrom"
            @blur="onDateRangeChange"
            placeholder="From Date"
            title="Price Date From"
          />
          <input
            type="date"
            class="form-control form-control-sm"
            style="width: 150px;"
            v-model="dateTo"
            @blur="onDateRangeChange"
            placeholder="To Date"
            title="Price Date To"
          />
          <button
            v-if="dateFrom || dateTo"
            class="btn btn-sm btn-outline-secondary"
            @click="clearDateFilter"
            title="Clear Date Filter"
          >
            <i class="bi bi-x-circle"></i>
          </button>

          <!-- Action Buttons -->
          <div class="d-flex justify-content-end align-items-center gap-3">
            <button
              class="btn btn-sm btn-outline-secondary"
              @click="selectAllFiltered"
              title="Select All Filtered Items"
            >
              <i class="bi bi-check-square"></i>
            </button>
            <button
              class="btn btn-sm btn-outline-primary"
              @click="handleAddToFavourites"
              :disabled="selectedRows.length === 0"
              title="Add Selected to Favourites"
            >
              <i class="bi bi-star"></i>
            </button>
            <button
              class="btn btn-sm btn-outline-success"
              @click="handleAddToTemplate"
              :disabled="selectedRows.length === 0"
              title="Add Selected to Template"
            >
              <i class="bi bi-plus-circle"></i>
            </button>
            <button
              class="btn btn-sm btn-warning"
              @click="handleSendToZzTakeoff"
              :disabled="selectedRows.length === 0"
              title="Send Selected to zzTakeoff"
            >
              <i class="bi bi-send"></i>
            </button>
            <button
              class="btn btn-sm btn-outline-info"
              @click="handleExportToCsv"
              title="Export All to CSV"
            >
              <i class="bi bi-download"></i>
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              @click="toggleColumnPanel"
              title="Manage Columns"
            >
              <i class="bi bi-layout-three-columns"></i>
            </button>
            <button
              class="btn btn-sm btn-outline-danger"
              @click="clearAllFilters"
              title="Clear All Column Filters"
            >
              <i class="bi bi-funnel-fill"></i>
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

    <!-- AG Grid with integrated footer -->
    <div class="flex-grow-1 position-relative grid-with-custom-footer">
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
        :getRowClass="getRowClass"
        :getRowStyle="getRowStyle"
        :loading="loading"
        :tooltipShowDelay="500"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @sort-changed="onSortChanged"
        @filter-changed="onFilterChanged"
        @pagination-changed="onPaginationChanged"
        @cell-value-changed="onCellValueChanged"
      />
      <!-- Custom footer info overlaid on AG Grid pagination -->
      <div class="custom-grid-footer">
        <span class="text-muted small">
          <i class="bi bi-box-seam me-1"></i>
          <template v-if="filteredCount < totalSize">
            Showing: <strong>{{ filteredCount.toLocaleString() }}</strong> of <strong>{{ totalSize.toLocaleString() }}</strong> items
          </template>
          <template v-else>
            Total: <strong>{{ totalSize.toLocaleString() }}</strong> items
          </template>
        </span>
        <span v-if="selectedRows.length > 0" class="text-primary small ms-3">
          <i class="bi bi-check2-square me-1"></i>
          {{ selectedRows.length }} selected
        </span>
      </div>
    </div>

    <!-- Add to Template Modal -->
    <div
      class="modal fade"
      id="addToTemplateModal"
      tabindex="-1"
      aria-labelledby="addToTemplateModalLabel"
      aria-hidden="true"
      ref="addToTemplateModal"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="addToTemplateModalLabel">Add to Template</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="templateSelect" class="form-label">Select Template</label>
              <select
                id="templateSelect"
                class="form-select"
                v-model="selectedTemplateId"
              >
                <option value="">-- Create New Template --</option>
                <option v-for="template in templates" :key="template.id" :value="template.id">
                  {{ template.templateName }} ({{ template.items?.length || 0 }} items)
                </option>
              </select>
            </div>

            <div v-if="!selectedTemplateId" class="mb-3">
              <label for="newTemplateName" class="form-label">New Template Name</label>
              <input
                type="text"
                id="newTemplateName"
                class="form-control"
                v-model="newTemplateName"
                placeholder="Enter template name..."
              />
            </div>

            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              Adding {{ selectedRows.length }} item(s) to template
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-success" @click="confirmAddToTemplate">
              <i class="bi bi-check-lg me-1"></i>
              Add to Template
            </button>
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
              <i class="bi bi-layout-three-columns me-2"></i>Column Settings
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
                <div
                  class="list-group-item d-flex align-items-center"
                >
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
            <button type="button" class="btn btn-primary" @click="confirmRenameColumn">
              <i class="bi bi-check-lg me-1"></i>Rename
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '../../composables/useElectronAPI';
import { Modal } from 'bootstrap';
import SearchableMultiSelect from '../common/SearchableMultiSelect.vue';
import draggable from 'vuedraggable';

const api = useElectronAPI();
const router = useRouter();
const theme = inject('theme');

// State
const rowData = ref([]);
const loading = ref(false);
const error = ref(null);
const success = ref(null);
const searchTerm = ref('');
const selectedCostCentres = ref([]);
const costCentres = ref([]);
const dateFrom = ref('');
const dateTo = ref('');
const showArchived = ref(false);
const totalSize = ref(0);
const filteredCount = ref(0);
const selectedRows = ref([]);
const gridApi = ref(null);
const isFilterStateLoaded = ref(false);
const pageSize = ref(50);
const pageSizeOptions = [25, 50, 100, 200];
const currentPage = ref(0);
const sortField = ref(null);
const sortOrder = ref('asc');
const columnFilters = ref({});

// Template modal state
const addToTemplateModal = ref(null);
let addToTemplateModalInstance = null;
const templates = ref([]);
const selectedTemplateId = ref('');
const newTemplateName = ref('');

// Check if dark mode
const isDarkMode = computed(() => {
  return theme && theme.value === 'dark';
});

// Row selection configuration (new v32+ API)
const rowSelectionConfig = {
  mode: 'multiRow',
  checkboxes: true,
  headerCheckbox: true,
  enableClickSelection: false,
  isRowSelectable: (params) => {
    // Don't allow selection of heading rows
    return params.data.Unit !== 'HEADING';
  }
};

// Add class to heading rows for CSS targeting
const getRowClass = (params) => {
  if (params.data.Unit === 'HEADING') {
    return 'heading-row';
  }
  return null;
};

// Style heading rows differently
const getRowStyle = (params) => {
  if (params.data.Unit === 'HEADING') {
    return {
      fontWeight: 'bold',
      fontSize: '1.1rem',
      backgroundColor: isDarkMode.value ? '#2d3748' : '#e8f4f8',
      color: isDarkMode.value ? '#ffffff' : '#1e3a8a'
    };
  }
  return null;
};

// AG Grid column definitions
const columnDefs = ref([
  {
    field: 'ItemCode',
    headerName: 'Code',
    width: 120,
    pinned: 'left',
    filter: 'agTextColumnFilter',
    sortable: true,
    tooltipValueGetter: (params) => params.value
  },
  {
    field: 'Description',
    headerName: 'Description',
    flex: 1,
    minWidth: 300,
    filter: 'agTextColumnFilter',
    sortable: true,
    editable: (params) => params.data.Unit !== 'HEADING',
    tooltipValueGetter: (params) => params.value
  },
  {
    field: 'Unit',
    headerName: 'Unit',
    width: 80,
    filter: 'agTextColumnFilter',
    sortable: true,
    editable: (params) => params.data.Unit !== 'HEADING',
    tooltipValueGetter: (params) => params.value
  },
  {
    field: 'zzType',
    headerName: 'zzType',
    width: 100,
    filter: 'agTextColumnFilter',
    sortable: true,
    editable: (params) => params.data.Unit !== 'HEADING',
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: ['area', 'linear', 'segment', 'count']
    },
    valueFormatter: (params) => {
      // Don't show for heading rows
      if (params.data && params.data.Unit === 'HEADING') return '';
      // Capitalize first letter for display
      return params.value ? params.value.charAt(0).toUpperCase() + params.value.slice(1) : '';
    },
    tooltipValueGetter: (params) => {
      if (params.data && params.data.Unit === 'HEADING') return null;
      return params.value ? params.value.charAt(0).toUpperCase() + params.value.slice(1) : null;
    }
  },
  {
    field: 'LatestPrice',
    headerName: 'Price',
    width: 120,
    filter: 'agNumberColumnFilter',
    sortable: true,
    editable: (params) => params.data.Unit !== 'HEADING',
    valueFormatter: (params) => {
      // Don't show price for heading rows
      if (params.data && params.data.Unit === 'HEADING') return '';
      if (params.value == null) return '-';
      return `${params.value.toFixed(2)}`;
    },
    valueParser: (params) => {
      // Parse the value, removing any currency symbols
      const value = params.newValue.toString().replace(/[$,]/g, '');
      return parseFloat(value) || 0;
    },
    cellStyle: { textAlign: 'right' },
    tooltipValueGetter: (params) => {
      if (params.data && params.data.Unit === 'HEADING') return null;
      if (params.value == null) return '-';
      return `${params.value.toFixed(2)}`;
    }
  },
  {
    field: 'CostCentre',
    headerName: 'Cost Centre',
    width: 130,
    filter: 'agTextColumnFilter',
    sortable: true,
    tooltipValueGetter: (params) => params.value
  },
  {
    field: 'CostCentreName',
    headerName: 'CC Name',
    width: 200,
    filter: 'agTextColumnFilter',
    sortable: true,
    tooltipValueGetter: (params) => params.value
  },
  {
    field: 'Category',
    headerName: 'Sub Group',
    width: 150,
    filter: 'agTextColumnFilter',
    sortable: true,
    tooltipValueGetter: (params) => params.value
  },
  {
    field: 'Recipe',
    headerName: 'Recipe',
    width: 90,
    valueFormatter: (params) => {
      // Don't show recipe for heading rows
      if (params.data && params.data.Unit === 'HEADING') return '';
      return params.value === 1 ? 'True' : 'False';
    },
    filter: 'agTextColumnFilter',
    sortable: true,
    tooltipValueGetter: (params) => {
      if (params.data && params.data.Unit === 'HEADING') return null;
      return params.value === 1 ? 'True' : 'False';
    }
  },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 200,
    minWidth: 200,
    pinned: 'right',
    cellRenderer: (params) => {
      // Don't show actions for heading rows
      if (params.data && params.data.Unit === 'HEADING') return '';

      const isArchived = params.data.Archived === 1 || params.data.Archived === true;
      const archiveButton = isArchived
        ? `<button class="btn btn-sm btn-outline-secondary" data-action="unarchive" title="Unarchive Item">
             <i class="bi bi-arrow-counterclockwise"></i>
           </button>`
        : `<button class="btn btn-sm btn-outline-secondary" data-action="archive" title="Archive Item">
             <i class="bi bi-archive"></i>
           </button>`;

      return `
        <div class="action-buttons d-flex gap-1">
          <button class="btn btn-sm btn-outline-primary" data-action="favourite" title="Add to Favourites">
            <i class="bi bi-star"></i>
          </button>
          <button class="btn btn-sm btn-outline-success" data-action="template" title="Add to Template">
            <i class="bi bi-plus-circle"></i>
          </button>
          <button class="btn btn-sm btn-warning" data-action="zztakeoff" title="Send to zzTakeoff">
            <i class="bi bi-send"></i>
          </button>
          ${archiveButton}
        </div>
      `;
    },
    suppressHeaderMenuButton: true,
    sortable: false,
    filter: false,
    resizable: true
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
const loadData = async (resetPage = false) => {
  loading.value = true;
  error.value = null;

  // Reset to first page if filters changed
  if (resetPage && gridApi.value) {
    gridApi.value.paginationGoToPage(0);
  }

  try {
    // Build params as a plain object (ensure it's IPC-serializable)
    const params = {};

    // Load ALL data - AG Grid will handle pagination client-side
    params.limit = 999999;
    params.offset = 0;

    if (searchTerm.value) {
      params.searchTerm = String(searchTerm.value);
    }

    if (selectedCostCentres.value && selectedCostCentres.value.length > 0) {
      // Create a plain array copy to ensure it's serializable for IPC
      params.costCentres = selectedCostCentres.value.map(cc => String(cc));
      console.log('Sending costCentres filter:', params.costCentres);
    }

    if (sortField.value) {
      params.sortField = String(sortField.value);
      params.sortOrder = String(sortOrder.value);
    }

    // Add date range filters
    if (dateFrom.value) {
      params.dateFrom = dateFrom.value;
      console.log('Date From:', dateFrom.value);
    }
    if (dateTo.value) {
      params.dateTo = dateTo.value;
      console.log('Date To:', dateTo.value);
    }

    // Add show archived filter
    params.showArchived = showArchived.value;
    console.log('Show Archived:', showArchived.value);

    // Add column filters
    if (columnFilters.value && Object.keys(columnFilters.value).length > 0) {
      Object.keys(columnFilters.value).forEach(field => {
        const filterValue = columnFilters.value[field];
        if (filterValue !== null && filterValue !== undefined && filterValue !== '') {
          params[field] = String(filterValue);
        }
      });
    }

    console.log('Loading catalogue with filters');
    const response = await api.catalogue.getItems(params);

    if (response?.success) {
      const items = response.data || [];

      // Load preferences for unit mappings and zzType overrides
      const [prefsResult, zzTypesResult] = await Promise.all([
        api.preferencesStore.get(),
        api.zzTypeStore.getAll()
      ]);

      const unitMappings = prefsResult?.success ? prefsResult.data.unitTakeoffMappings : {};
      const zzTypeOverrides = zzTypesResult?.success ? zzTypesResult.types : {};

      console.log('[zzType] Unit mappings:', unitMappings);
      console.log('[zzType] Overrides:', zzTypeOverrides);

      // Resolve zzType for each item
      items.forEach(item => {
        // Resolution priority: 1. Override, 2. Unit mapping, 3. Default to 'count'
        if (zzTypeOverrides[item.ItemCode]) {
          item.zzType = zzTypeOverrides[item.ItemCode];
          console.log(`[zzType] ${item.ItemCode}: Using override → ${item.zzType}`);
        } else if (item.Unit && unitMappings[item.Unit]) {
          item.zzType = unitMappings[item.Unit];
          console.log(`[zzType] ${item.ItemCode}: Using unit mapping ${item.Unit} → ${item.zzType}`);
        } else {
          item.zzType = 'count'; // Default
        }
      });

      rowData.value = items;
      totalSize.value = response.total || response.data?.length || 0;
      filteredCount.value = totalSize.value; // Initialize to total

      // Update filtered count after grid updates
      nextTick(() => {
        updateFilteredCount();
      });
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

// Load templates
const loadTemplates = async () => {
  try {
    const response = await api.templatesStore.getList();
    if (response?.success) {
      templates.value = response.data || [];
    }
  } catch (err) {
    console.error('Error loading templates:', err);
  }
};

// Search change handler with debounce
const onSearchChange = () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    loadData(true); // Reset to first page when searching
  }, 500);
};

// Clear search
const clearSearch = () => {
  searchTerm.value = '';
  loadData(true); // Reset to first page when clearing search
};

// Filter change handler
const onFilterChange = () => {
  console.log('Filter changed, selectedCostCentres:', selectedCostCentres.value);
  loadData(true); // Reset to first page when filter changes
};

// Date range change handler
const onDateRangeChange = () => {
  console.log('Date range changed:', { from: dateFrom.value, to: dateTo.value });
  loadData(true); // Reset to first page when date range changes
};

// Clear date filter
const clearDateFilter = () => {
  dateFrom.value = '';
  dateTo.value = '';
  loadData(true);
};

// Show archived change handler
const onShowArchivedChange = () => {
  console.log('Show archived changed:', showArchived.value);
  loadData(true); // Reset to first page when show archived changes
};

// Clear all AG Grid column filters
const clearAllFilters = () => {
  if (!gridApi.value) return;
  gridApi.value.setFilterModel(null);
  console.log('All column filters cleared');
};

// Pagination changed handler
const onPaginationChanged = () => {
  if (!gridApi.value) return;

  const newPageSize = gridApi.value.paginationGetPageSize();

  // Only reload data if page size changed (to save preference)
  if (newPageSize !== pageSize.value) {
    console.log('Page size changed from', pageSize.value, 'to', newPageSize);
    pageSize.value = newPageSize;
    // No need to reload data - AG Grid handles pagination client-side
  }
};

// Cell value changed handler
const onCellValueChanged = async (event) => {
  const { data, colDef, newValue, oldValue } = event;
  const field = colDef.field;

  // Don't update if value hasn't actually changed
  if (newValue === oldValue) return;

  console.log(`Cell value changed: ${field} from "${oldValue}" to "${newValue}"`);

  try {
    let result;

    if (field === 'Description') {
      result = await api.catalogue.updateField({
        priceCode: data.ItemCode,
        field: 'Description',
        value: newValue
      });
    } else if (field === 'Unit') {
      result = await api.catalogue.updateField({
        priceCode: data.ItemCode,
        field: 'Unit',
        value: newValue
      });
    } else if (field === 'LatestPrice') {
      result = await api.catalogue.updatePrice({
        priceCode: data.ItemCode,
        price: newValue
      });
    } else if (field === 'zzType') {
      // Save zzType override to electron-store
      result = await api.zzTypeStore.set(data.ItemCode, newValue.toLowerCase());
      console.log('[zzType] Saved override:', data.ItemCode, '→', newValue.toLowerCase());
    }

    if (result && result.success) {
      success.value = `${field} updated successfully`;
      setTimeout(() => success.value = null, 3000);
    } else {
      error.value = result?.message || `Failed to update ${field}`;
      // Revert the change in the grid
      event.node.setDataValue(field, oldValue);
    }
  } catch (err) {
    console.error(`Error updating ${field}:`, err);
    error.value = `Failed to update ${field}`;
    // Revert the change in the grid
    event.node.setDataValue(field, oldValue);
  }
};

// Grid ready handler
const onGridReady = (params) => {
  gridApi.value = params.api;

  // Add click event listener for row actions
  params.api.addEventListener('cellClicked', (event) => {
    // Check both the target and its parent for data-action
    const target = event.event.target;
    const action = target.dataset.action || target.closest('[data-action]')?.dataset.action;

    if (action === 'favourite') {
      handleAddSingleItemToFavourites(event.data);
    } else if (action === 'template') {
      handleAddSingleItemToTemplate(event.data);
    } else if (action === 'zztakeoff') {
      handleSendSingleItemToZzTakeoff(event.data);
    } else if (action === 'archive') {
      handleArchiveItem(event.data);
    } else if (action === 'unarchive') {
      handleUnarchiveItem(event.data);
    }
  });

  // Load saved column state - wrap in setTimeout to ensure grid is fully ready
  setTimeout(async () => {
    console.log('[DEBUG] onGridReady: About to load column state...');
    await loadColumnState();
    console.log('[DEBUG] onGridReady: Column state loaded');
  }, 100);

  // Add event listeners to save column state on changes
  // Only save when column move/resize is finished to avoid excessive saves
  params.api.addEventListener('columnMoved', (event) => {
    if (event.finished) {
      saveColumnState(event);
    }
  });
  params.api.addEventListener('columnResized', (event) => {
    if (event.finished) {
      saveColumnState(event);
    }
  });
  params.api.addEventListener('columnVisible', saveColumnState);
  params.api.addEventListener('columnPinned', saveColumnState);

  // Only load data if filter state has already been loaded
  // Otherwise, loadFilterState() will call loadData() when it completes
  if (isFilterStateLoaded.value) {
    loadData();
  }
};

// Selection changed handler
const onSelectionChanged = () => {
  if (gridApi.value) {
    selectedRows.value = gridApi.value.getSelectedRows();
  }
};

// Select all filtered items across all pages
const selectAllFiltered = () => {
  if (!gridApi.value) return;

  // Select all nodes that pass the current filter
  let count = 0;
  gridApi.value.forEachNodeAfterFilter((node) => {
    // Don't select heading rows
    if (node.data && node.data.Unit !== 'HEADING') {
      node.setSelected(true);
      count++;
    }
  });

  console.log(`Selected all filtered items: ${count} items`);
};

// Update filtered count
const updateFilteredCount = () => {
  if (!gridApi.value) return;

  let count = 0;
  gridApi.value.forEachNodeAfterFilter((node) => {
    // Don't count heading rows
    if (node.data && node.data.Unit !== 'HEADING') {
      count++;
    }
  });

  filteredCount.value = count;
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
    loadData(true); // Reset to first page when sort changes
  }
};

// Filter changed handler
const onFilterChanged = () => {
  if (gridApi.value) {
    const filterModel = gridApi.value.getFilterModel();

    // Convert AG Grid filter model to our backend format
    const filters = {};
    Object.keys(filterModel).forEach(field => {
      const filter = filterModel[field];

      // Handle different filter types
      if (filter.filterType === 'text') {
        filters[field] = filter.filter || '';
      } else if (filter.filterType === 'number') {
        filters[field] = filter.filter;
      } else if (filter.filterType === 'date') {
        filters[field] = filter.dateFrom;
      } else if (filter.type) {
        // Simple filter
        filters[field] = filter.filter || '';
      }
    });

    columnFilters.value = filters;

    loadData(true); // Reset to first page when filters change

    // Update filtered count after a brief delay to let grid update
    setTimeout(() => {
      updateFilteredCount();
    }, 100);
  }
};

// Column management modal state
const columnManagementModal = ref(null);
let columnManagementModalInstance = null;
const managedColumns = ref([]);

// Rename column modal state
const renameColumnModal = ref(null);
let renameColumnModalInstance = null;
const renameColumnField = ref('');
const renameColumnName = ref('');

// Column management functions
const toggleColumnPanel = () => {
  // Initialize managed columns from current grid state (in current order)
  if (gridApi.value) {
    const columnState = gridApi.value.getColumnState();
    console.log('[DEBUG] toggleColumnPanel: Current column state:', columnState.map(c => ({ id: c.colId, hide: c.hide, pinned: c.pinned })));

    managedColumns.value = columnState
      .filter(col => col.colId !== 'ag-Grid-AutoColumn') // Exclude checkbox column
      .map(col => ({
        field: col.colId,
        headerName: gridApi.value.getColumnDef(col.colId)?.headerName || col.colId,
        visible: !col.hide,
        pinned: col.pinned || null  // Track pinned state
      }));

    console.log('[DEBUG] toggleColumnPanel: Managed columns order:', managedColumns.value.map(c => c.field));
  }

  if (!columnManagementModalInstance) {
    columnManagementModalInstance = new Modal(columnManagementModal.value);
  }
  columnManagementModalInstance.show();
};

const toggleColumnVisibility = (column) => {
  if (!gridApi.value) return;

  gridApi.value.setColumnsVisible([column.field], column.visible);
  saveColumnState();
};

const pinColumn = (column, pinnedState) => {
  if (!gridApi.value) return;

  // Update the local state
  column.pinned = pinnedState;

  // Apply to grid
  gridApi.value.setColumnPinned(column.field, pinnedState);

  // Save the state
  saveColumnState();
};

const onColumnReorder = () => {
  if (!gridApi.value) return;

  console.log('[DEBUG] onColumnReorder: Reordering columns via modal...');

  // Get the new order from managedColumns
  const newOrder = managedColumns.value.map(col => col.field);
  console.log('[DEBUG] onColumnReorder: New order from modal:', newOrder);

  // Get current column state
  const currentState = gridApi.value.getColumnState();

  // Update the column state with new order
  const reorderedState = newOrder.map(colId => {
    return currentState.find(col => col.colId === colId);
  }).filter(col => col !== undefined);

  console.log('[DEBUG] onColumnReorder: Applying new column state order...');

  // Apply the reordered state - force the order
  gridApi.value.applyColumnState({
    state: reorderedState,
    applyOrder: true
  });

  const finalOrder = gridApi.value.getColumnState().map(c => c.colId);
  console.log('[DEBUG] onColumnReorder: Final order in grid:', finalOrder);
  console.log('[DEBUG] onColumnReorder: Expected order:', newOrder);

  // Check if the order actually changed
  const orderChanged = JSON.stringify(finalOrder) !== JSON.stringify(newOrder);
  if (orderChanged) {
    console.warn('[DEBUG] onColumnReorder: WARNING - Grid order does not match expected order!');
    console.warn('[DEBUG] onColumnReorder: This means applyColumnState did not work');
  }

  // Save the state - force save with the order WE want, not what the grid has
  setTimeout(() => {
    // Manually create the state in the correct order
    const currentState = gridApi.value.getColumnState();
    const correctOrderState = newOrder.map(colId => {
      return currentState.find(col => col.colId === colId);
    }).filter(col => col !== undefined);

    console.log('[DEBUG] onColumnReorder: Manually creating state with correct order');

    // Temporarily replace getColumnState to return our corrected order
    const originalGetColumnState = gridApi.value.getColumnState;
    gridApi.value.getColumnState = () => correctOrderState;

    saveColumnState();

    // Restore original function
    gridApi.value.getColumnState = originalGetColumnState;
  }, 100);
};

const showAllColumns = () => {
  if (!gridApi.value) return;

  const allFields = managedColumns.value.map(col => col.field);
  gridApi.value.setColumnsVisible(allFields, true);
  managedColumns.value.forEach(col => col.visible = true);
  saveColumnState();
};

const resetColumnSettings = async () => {
  if (!gridApi.value) return;

  // Delete saved column state
  await api.columnStates.delete('catalogue');

  // Reset grid to default column state
  gridApi.value.resetColumnState();

  // Refresh managed columns
  const columnState = gridApi.value.getColumnState();
  managedColumns.value = columnState
    .filter(col => col.colId !== 'ag-Grid-AutoColumn')
    .map(col => ({
      field: col.colId,
      headerName: gridApi.value.getColumnDef(col.colId)?.headerName || col.colId,
      visible: !col.hide
    }));
};

const showRenameColumn = (column) => {
  renameColumnField.value = column.field;
  renameColumnName.value = column.headerName;

  if (!renameColumnModalInstance) {
    renameColumnModalInstance = new Modal(renameColumnModal.value);
  }
  renameColumnModalInstance.show();
};

const confirmRenameColumn = () => {
  if (!gridApi.value || !renameColumnField.value) return;

  console.log(`[DEBUG] confirmRenameColumn: Renaming column ${renameColumnField.value} to: ${renameColumnName.value}`);

  // Update columnDefs ref first
  const colDefInRef = columnDefs.value.find(c => c.field === renameColumnField.value);
  if (colDefInRef) {
    colDefInRef.headerName = renameColumnName.value;
    console.log('[DEBUG] confirmRenameColumn: Updated columnDefs ref');
  }

  // Update column header name via grid API
  const columnDef = gridApi.value.getColumnDef(renameColumnField.value);
  console.log('[DEBUG] confirmRenameColumn: Got column def:', columnDef);

  if (columnDef) {
    columnDef.headerName = renameColumnName.value;
    console.log('[DEBUG] confirmRenameColumn: Updated headerName, refreshing...');
    gridApi.value.refreshHeader();

    // Update managed columns list
    const col = managedColumns.value.find(c => c.field === renameColumnField.value);
    if (col) {
      col.headerName = renameColumnName.value;
    }

    console.log('[DEBUG] confirmRenameColumn: Calling saveColumnState...');
    saveColumnState();
  }

  if (renameColumnModalInstance) {
    renameColumnModalInstance.hide();
  }
};

const saveColumnState = async (event) => {
  if (!gridApi.value) return;

  try {
    const eventType = event?.type || 'manual';
    console.log(`[DEBUG] saveColumnState: Starting save (triggered by: ${eventType})...`);

    // Get current column state (order, width, visibility, pinned)
    const columnState = gridApi.value.getColumnState();

    // Log column state for debugging
    const widths = {};
    const order = [];
    columnState.forEach(col => {
      if (col.width) {
        widths[col.colId] = col.width;
      }
      order.push(col.colId);
    });
    console.log('[DEBUG] saveColumnState: Column widths:', widths);
    console.log('[DEBUG] saveColumnState: Column order:', order);

    // Save column header names (aliases)
    const headerNames = {};
    columnState.forEach(col => {
      const colDef = gridApi.value.getColumnDef(col.colId);
      if (colDef && colDef.headerName) {
        headerNames[col.colId] = colDef.headerName;
      }
    });

    console.log('[DEBUG] saveColumnState: Header names:', headerNames);

    const dataToSave = {
      tabName: 'catalogue',
      columnState: JSON.stringify({
        state: columnState,
        headerNames
      })
    };

    const result = await api.columnStates.save(dataToSave);
    console.log(`[DEBUG] saveColumnState: Save result (${eventType}):`, result);
  } catch (err) {
    console.error('[DEBUG] Error saving column state:', err);
  }
};

const loadColumnState = async () => {
  console.log('[DEBUG] loadColumnState: Function called, gridApi.value:', !!gridApi.value);

  if (!gridApi.value) {
    console.log('[DEBUG] loadColumnState: No gridApi, returning early');
    return;
  }

  try {
    console.log('[DEBUG] loadColumnState: Starting load...');
    console.log('[DEBUG] loadColumnState: API available:', !!api.columnStates);

    const result = await api.columnStates.get('catalogue');
    console.log('[DEBUG] loadColumnState: Get result:', result);

    if (result && result.success && result.data && result.data.columnState) {
      const savedData = JSON.parse(result.data.columnState);
      console.log('[DEBUG] loadColumnState: Parsed saved data:', savedData);

      // Apply column header names (aliases) FIRST - update the columnDefs ref
      if (savedData.headerNames) {
        console.log('[DEBUG] loadColumnState: Applying header names:', savedData.headerNames);

        // Update the columnDefs ref directly
        columnDefs.value.forEach(colDef => {
          if (savedData.headerNames[colDef.field]) {
            console.log(`[DEBUG] loadColumnState: Updating columnDefs ${colDef.field} to: ${savedData.headerNames[colDef.field]}`);
            colDef.headerName = savedData.headerNames[colDef.field];
          }
        });

        // Also update via grid API
        Object.keys(savedData.headerNames).forEach(colId => {
          const colDef = gridApi.value.getColumnDef(colId);
          if (colDef) {
            console.log(`[DEBUG] loadColumnState: Setting grid API ${colId} headerName to: ${savedData.headerNames[colId]}`);
            colDef.headerName = savedData.headerNames[colId];
          }
        });

        console.log('[DEBUG] loadColumnState: Refreshing headers...');
        gridApi.value.refreshHeader();
        console.log('[DEBUG] loadColumnState: Headers refreshed');
      }

      // Apply column state (order, width, visibility, pinned) AFTER header names
      if (savedData.state) {
        console.log('[DEBUG] loadColumnState: Applying column state...');

        // Log column info for debugging
        savedData.state.forEach(col => {
          if (col.width) {
            console.log(`[DEBUG] loadColumnState: Column ${col.colId} - width: ${col.width}, hide: ${col.hide}, pinned: ${col.pinned}`);
          }
        });

        // Apply the saved column state with order
        console.log('[DEBUG] loadColumnState: Applying column state with order...');
        console.log('[DEBUG] loadColumnState: Saved order:', savedData.state.map(c => c.colId));

        // Get current state to see what we're starting with
        const beforeState = gridApi.value.getColumnState().map(c => c.colId);
        console.log('[DEBUG] loadColumnState: Current order before apply:', beforeState);

        // Strategy: Reorder the columnDefs array to match saved order, then refresh grid
        const savedOrder = savedData.state.map(c => c.colId);
        const reorderedColumnDefs = savedOrder
          .map(colId => columnDefs.value.find(def => def.field === colId))
          .filter(def => def !== undefined);

        console.log('[DEBUG] loadColumnState: Reordered columnDefs:', reorderedColumnDefs.map(c => c.field));

        // Update the columnDefs ref
        columnDefs.value = reorderedColumnDefs;

        // Now apply the rest of the state (width, visibility, pinning)
        gridApi.value.applyColumnState({
          state: savedData.state,
          applyOrder: false // Don't rely on applyOrder, we already reordered columnDefs
        });

        console.log('[DEBUG] loadColumnState: Column state applied (including widths, order, visibility, and pinning)');
        console.log('[DEBUG] loadColumnState: Verifying order after apply:', gridApi.value.getColumnState().map(c => c.colId));
      }
    } else {
      console.log('[DEBUG] loadColumnState: No saved column state found');
    }
  } catch (err) {
    console.error('[DEBUG] Error loading column state:', err);
  }
};

// Add item to recents
const addToRecents = async (item) => {
  try {
    await api.recentsStore.add({
      PriceCode: item.ItemCode,
      Description: item.Description,
      Unit: item.Unit,
      Price: item.Price,
      CostCentre: item.CostCentre,
      LastAccessed: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error adding to recents:', err);
  }
};

// Add to favourites
const handleAddToFavourites = async () => {
  if (selectedRows.value.length === 0) return;

  try {
    for (const row of selectedRows.value) {
      await api.favouritesStore.add({
        PriceCode: row.ItemCode,
        Description: row.Description,
        Unit: row.Unit,
        Price: row.LatestPrice,
        CostCentre: row.CostCentre
      });

      // Also add to recents
      await addToRecents(row);
    }
    success.value = `Added ${selectedRows.value.length} item(s) to favourites`;
    setTimeout(() => success.value = null, 3000);
  } catch (err) {
    console.error('Error adding to favourites:', err);
    error.value = 'Failed to add items to favourites';
  }
};

// Add single item to favourites
const handleAddSingleItemToFavourites = async (item) => {
  try {
    await api.favouritesStore.add({
      PriceCode: item.ItemCode,
      Description: item.Description,
      Unit: item.Unit,
      Price: item.LatestPrice,
      CostCentre: item.CostCentre
    });

    // Also add to recents
    await addToRecents(item);

    success.value = `Added "${item.Description}" to favourites`;
    setTimeout(() => success.value = null, 3000);
  } catch (err) {
    console.error('Error adding to favourites:', err);
    error.value = 'Failed to add item to favourites';
  }
};

// Add to template - show modal
const handleAddToTemplate = () => {
  if (selectedRows.value.length === 0) return;

  selectedTemplateId.value = '';
  newTemplateName.value = '';

  if (addToTemplateModalInstance) {
    addToTemplateModalInstance.show();
  }
};

// Add single item to template
const handleAddSingleItemToTemplate = (item) => {
  selectedRows.value = [item];
  handleAddToTemplate();
};

// Confirm add to template
const confirmAddToTemplate = async () => {
  if (!selectedTemplateId.value && !newTemplateName.value) {
    error.value = 'Please select a template or enter a new template name';
    return;
  }

  try {
    const itemsToAdd = selectedRows.value.map(row => ({
      PriceCode: String(row.ItemCode),
      description: String(row.Description),
      Unit: String(row.Unit || ''),
      Price: Number(row.LatestPrice || 0),
      CostCentre: String(row.CostCentre || ''),
      quantity: 1
    }));

    let templateToSave;

    if (selectedTemplateId.value) {
      // Add to existing template - create plain object copy
      const existingTemplate = templates.value.find(t => t.id === selectedTemplateId.value);
      if (!existingTemplate) {
        error.value = 'Template not found';
        return;
      }

      // Convert existing items to plain objects
      const existingItems = (existingTemplate.items || []).map(item => ({
        PriceCode: String(item.PriceCode),
        description: String(item.description),
        Unit: String(item.Unit || ''),
        Price: Number(item.Price || 0),
        CostCentre: String(item.CostCentre || ''),
        quantity: Number(item.quantity || 1)
      }));

      // Create plain object copy to avoid Vue reactivity issues
      templateToSave = {
        id: String(existingTemplate.id),
        templateName: String(existingTemplate.templateName),
        description: String(existingTemplate.description || ''),
        items: [...existingItems, ...itemsToAdd],
        dateCreated: String(existingTemplate.dateCreated),
        dateModified: new Date().toISOString()
      };
    } else {
      // Create new template
      templateToSave = {
        id: String(Date.now()),
        templateName: String(newTemplateName.value),
        description: '',
        items: itemsToAdd,
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString()
      };
    }

    await api.templatesStore.save(templateToSave);

    // Add all items to recents
    for (const row of selectedRows.value) {
      await addToRecents(row);
    }

    success.value = `Added ${selectedRows.value.length} item(s) to template "${templateToSave.templateName}"`;
    setTimeout(() => success.value = null, 3000);

    if (addToTemplateModalInstance) {
      addToTemplateModalInstance.hide();
    }

    await loadTemplates();
  } catch (err) {
    console.error('Error adding to template:', err);
    error.value = 'Failed to add items to template';
  }
};

// Send to zzTakeoff (real integration)
const handleSendToZzTakeoff = async () => {
  if (selectedRows.value.length === 0) return;

  try {
    console.log('[zzTakeoff] Preparing to send items:', selectedRows.value);

    // Navigate to zzTakeoff Web tab
    await router.push('/zztakeoff-web');

    // Wait for the tab to load and webview to be ready
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Send the first item (single item mode as requested)
    const row = selectedRows.value[0];

    // Build the JavaScript code to execute in zzTakeoff.com
    const jsCode = `
      startTakeoffWithProperties({
        type: ${JSON.stringify(row.zzType || 'count')},
        properties: {
          name: {
            value: ${JSON.stringify(row.Description || '')}
          },
          sku: {
            value: ${JSON.stringify(row.ItemCode || '')}
          },
          unit: {
            value: ${JSON.stringify(row.Unit || '')}
          },
          'Cost Each': {
            value: ${JSON.stringify(row.LatestPrice ? row.LatestPrice.toString() : '0')}
          },
          'cost centre': {
            value: ${JSON.stringify(row.CostCentre || '')}
          }
        }
      });
    `;

    console.log('[zzTakeoff] Executing JavaScript:', jsCode);

    // Execute the JavaScript in the BrowserView
    const result = await api.webview.executeJavaScript(jsCode);

    console.log('[zzTakeoff] JavaScript execution result:', result);

    // Add to send history
    await api.sendHistory.add({
      items: [{
        code: row.ItemCode,
        description: row.Description,
        unit: row.Unit,
        price: row.LatestPrice,
        quantity: 1
      }],
      project: 'zzTakeoff Integration',
      status: result.success ? 'Success' : 'Failed',
      sentAt: new Date().toISOString(),
      itemCount: 1
    });

    // Add to recents
    await addToRecents(row);

    success.value = `Sent "${row.Description}" to zzTakeoff`;
    setTimeout(() => success.value = null, 3000);

  } catch (err) {
    console.error('Error sending to zzTakeoff:', err);
    error.value = `Failed to send items to zzTakeoff: ${err.message}`;
  }
};

// Send single item to zzTakeoff
const handleSendSingleItemToZzTakeoff = async (item) => {
  selectedRows.value = [item];
  await handleSendToZzTakeoff();
};

// Archive item
const handleArchiveItem = async (item) => {
  try {
    const result = await api.catalogue.archiveItem({
      priceCode: item.ItemCode,
      archived: true
    });

    if (result.success) {
      success.value = `Item "${item.Description}" has been archived`;
      setTimeout(() => success.value = null, 3000);

      // Reload data to reflect the change
      await loadData();
    } else {
      error.value = result.message || 'Failed to archive item';
    }
  } catch (err) {
    console.error('Error archiving item:', err);
    error.value = 'Failed to archive item';
  }
};

// Unarchive item
const handleUnarchiveItem = async (item) => {
  try {
    const result = await api.catalogue.archiveItem({
      priceCode: item.ItemCode,
      archived: false
    });

    if (result.success) {
      success.value = `Item "${item.Description}" has been unarchived`;
      setTimeout(() => success.value = null, 3000);

      // Reload data to reflect the change
      await loadData();
    } else {
      error.value = result.message || 'Failed to unarchive item';
    }
  } catch (err) {
    console.error('Error unarchiving item:', err);
    error.value = 'Failed to unarchive item';
  }
};

// Export to Excel
const handleExportToCsv = async () => {
  console.log('=== CSV EXPORT FUNCTION CALLED ===');

  if (!gridApi.value) {
    console.error('Grid API not available');
    error.value = 'Grid not ready';
    return;
  }

  try {
    const selectedCount = selectedRows.value.length;
    const exportAll = selectedCount === 0;

    // If items are selected, we need to export ALL selected items (across all pages)
    // Since we use server-side pagination, selectedRows only contains current page
    // So we fetch all filtered data from backend
    if (!exportAll) {
      console.log(`Exporting ${filteredCount.value} filtered items (not just ${selectedCount} on current page)`);

      // Fetch all filtered data from backend
      const params = {};

      if (searchTerm.value) {
        params.searchTerm = String(searchTerm.value);
      }

      if (selectedCostCentres.value && selectedCostCentres.value.length > 0) {
        params.costCentres = selectedCostCentres.value.map(cc => String(cc));
      }

      if (sortField.value) {
        params.sortField = String(sortField.value);
        params.sortOrder = String(sortOrder.value);
      }

      // Add column filters
      if (columnFilters.value && Object.keys(columnFilters.value).length > 0) {
        Object.keys(columnFilters.value).forEach(field => {
          const filterValue = columnFilters.value[field];
          if (filterValue !== null && filterValue !== undefined && filterValue !== '') {
            params[field] = String(filterValue);
          }
        });
      }

      // Don't set limit/offset - we want ALL data
      params.limit = 999999; // Large number to get all records
      params.offset = 0;

      console.log('Fetching all filtered data for export:', params);
      const response = await api.catalogue.getItems(params);

      if (response?.success && response.data) {
        const allData = response.data.filter(row => row.Unit !== 'HEADING');
        console.log(`Fetched ${allData.length} items for export`);

        // Generate CSV manually
        const csv = generateCsv(allData);
        downloadCsv(csv, 'catalogue-export.csv');

        success.value = `✓ Exported ${allData.length} filtered rows to CSV`;
        setTimeout(() => success.value = null, 3000);
        return;
      }
    }

    // Export all (no filters) - use AG Grid's built-in export
    console.log(`Exporting all ${rowData.value.length} rows on current page`);

    gridApi.value.exportDataAsCsv({
      fileName: 'catalogue-export.csv',
      onlySelected: false,
      processCellCallback: (params) => {
        // Force Cost Centre to be treated as text by Excel to preserve leading zeros
        if (params.column.getColId() === 'CostCentre' && params.value) {
          return `="${params.value}"`;
        }
        return params.value;
      }
    });

    console.log('CSV export completed successfully');
    success.value = `✓ Exported all ${rowData.value.length} rows to CSV`;
    setTimeout(() => success.value = null, 3000);
  } catch (err) {
    console.error('CSV export error:', err);
    error.value = `CSV export failed: ${err.message}`;
    setTimeout(() => error.value = null, 5000);
  }
};

// Generate CSV from data array
const generateCsv = (data) => {
  if (!data || data.length === 0) return '';

  // Get visible columns from grid
  const columns = gridApi.value.getColumns()
    .filter(col => col.isVisible() && col.getColId() !== 'ag-Grid-SelectionColumn' && col.getColId() !== 'actions');

  // Build header row
  const headers = columns.map(col => col.getColDef().headerName || col.getColId());
  const headerRow = headers.join(',');

  // Build data rows
  const dataRows = data.map(row => {
    return columns.map(col => {
      const field = col.getColId();
      let value = row[field];

      // Handle special formatting
      if (field === 'CostCentre' && value) {
        value = `="${value}"`; // Preserve leading zeros
      } else if (field === 'LatestPrice' && value != null) {
        value = `$${value.toFixed(2)}`;
      } else if (field === 'Recipe') {
        value = value === 1 ? 'True' : 'False';
      }

      // Escape quotes and wrap in quotes if contains comma
      if (value && typeof value === 'string') {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
      }

      return value || '';
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

// Download CSV file
const downloadCsv = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

// Filter persistence functions
const saveFilterState = async () => {
  try {
    // Serialize to plain JSON to avoid IPC cloning issues
    const filterState = JSON.parse(JSON.stringify({
      searchTerm: searchTerm.value,
      selectedCostCentres: selectedCostCentres.value,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
      showArchived: showArchived.value
    }));

    await api.filterState.save({
      tabName: 'catalogue',
      filterState: filterState
    });

    console.log('✓ Catalogue filter state saved:', filterState);
  } catch (err) {
    console.error('Error saving catalogue filter state:', err);
  }
};

const loadFilterState = async () => {
  try {
    const result = await api.filterState.get('catalogue');

    if (result?.success && result?.data) {
      const filterState = result.data;
      console.log('✓ Loading catalogue filter state:', filterState);

      // Restore filter values
      if (filterState.searchTerm !== undefined) {
        searchTerm.value = filterState.searchTerm;
      }
      if (filterState.selectedCostCentres !== undefined) {
        selectedCostCentres.value = filterState.selectedCostCentres;
      }
      if (filterState.dateFrom !== undefined) {
        dateFrom.value = filterState.dateFrom;
      }
      if (filterState.dateTo !== undefined) {
        dateTo.value = filterState.dateTo;
      }
      if (filterState.showArchived !== undefined) {
        showArchived.value = filterState.showArchived;
      }

      // Mark as loaded
      isFilterStateLoaded.value = true;

      // Reload data with restored filters if grid is ready
      if (gridApi.value) {
        console.log('✓ Reloading data with restored filters');
        await loadData(true);
      }
    } else {
      // No saved filter state, mark as loaded anyway
      isFilterStateLoaded.value = true;
    }
  } catch (err) {
    console.error('Error loading catalogue filter state:', err);
    // Mark as loaded even on error to prevent blocking
    isFilterStateLoaded.value = true;
  }
};

// Listen for preferences updates
onMounted(async () => {
  loadPageSize();
  loadCostCentres();
  loadTemplates();

  // Load saved filter state
  await loadFilterState();

  // Initialize modal
  if (addToTemplateModal.value) {
    addToTemplateModalInstance = new Modal(addToTemplateModal.value);
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
    // No need to reload data - AG Grid handles pagination client-side
  }
});

// Watch filter changes and save state
watch([searchTerm, selectedCostCentres, dateFrom, dateTo, showArchived], () => {
  saveFilterState();
}, { deep: true });
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

/* Dark mode footer styling */
[data-theme="dark"] .bg-light {
  background-color: var(--bg-secondary) !important;
}

[data-theme="dark"] .border-top {
  border-color: var(--border-color) !important;
}

/* Ensure grid fills container */
.ag-theme-quartz {
  --ag-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Custom footer integrated into AG Grid pagination */
.grid-with-custom-footer {
  position: relative;
}

.custom-grid-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  padding: 10px 16px;
  z-index: 10;
  pointer-events: none;
  display: flex;
  align-items: center;
}

/* Adjust pagination to make room for our custom footer on the left */
.grid-with-custom-footer :deep(.ag-paging-panel) {
  padding-left: 280px !important; /* Make room for total items */
}

/* Dark mode support for custom footer */
[data-theme="dark"] .custom-grid-footer {
  color: var(--text-primary);
}

[data-theme="dark"] .custom-grid-footer .text-muted {
  color: var(--text-secondary) !important;
}

/* Draggable column list styles */
.list-group-item {
  transition: background-color 0.2s ease;
}

.list-group-item.sortable-chosen {
  opacity: 0.5;
  background-color: var(--bs-primary-bg-subtle);
}

.list-group-item.sortable-ghost {
  opacity: 0.3;
  background-color: var(--bs-secondary-bg-subtle);
}

.drag-handle {
  touch-action: none;
  user-select: none;
}

.drag-handle:hover i {
  color: var(--bs-primary) !important;
}

/* Hide checkbox for heading rows */
.ag-row.heading-row .ag-selection-checkbox {
  visibility: hidden;
  pointer-events: none;
}
</style>
