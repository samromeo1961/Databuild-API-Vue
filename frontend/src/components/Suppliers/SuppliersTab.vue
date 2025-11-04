<template>
  <div class="suppliers-tab h-100 d-flex flex-column">
    <!-- Header and Search -->
    <div class="py-3 px-4 border-bottom">

      <!-- Search and Filters -->
      <div class="row mb-3 align-items-center">
        <div class="col-md-4">
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
        <div class="col-md-2">
          <SearchableMultiSelect
            v-model="selectedGroups"
            :options="allSupplierGroups"
            placeholder="All Supplier Groups"
            :labelKey="(item) => `${item.GroupNumber} - ${item.GroupName}`"
            valueKey="GroupNumber"
            selectAllLabel="✕ Clear Filters"
            @change="onGroupChange"
          />
        </div>
        <div class="col-md-6 d-flex justify-content-end align-items-center gap-2">
          <!-- Show Archived Toggle -->
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              id="showArchived"
              v-model="showArchived"
              @change="loadData"
            />
            <label class="form-check-label" for="showArchived">
              Show Archived
            </label>
          </div>

          <!-- Action Buttons -->
          <div class="d-flex justify-content-end align-items-center gap-3">
            <button
              class="btn btn-success"
              @click="handleAddContact"
              title="Add New Contact"
            >
              <i class="bi bi-person-plus"></i>
            </button>
            <button
              class="btn btn-outline-secondary"
              @click="openColumnPanel"
              title="Manage Columns"
            >
              <i class="bi bi-layout-three-columns"></i>
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
            <button
              class="btn btn-outline-danger"
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
        <i class="bi bi-check-circle me-2"></i>
        {{ success }}
        <button type="button" class="btn-close" @click="success = null"></button>
      </div>
    </div>

    <!-- AG Grid -->
    <div class="flex-grow-1 position-relative grid-with-status">
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
        :sideBar="sideBar"
        :getRowClass="getRowClass"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @sort-changed="onSortChanged"
      />

      <!-- Custom footer info overlaid on AG Grid pagination -->
      <div class="custom-grid-footer">
        <span class="text-muted small">
          <i class="bi bi-building me-1"></i>
          Total: <strong>{{ totalSize.toLocaleString() }}</strong> suppliers
        </span>
        <span v-if="selectedRows.length > 0" class="text-primary small ms-3">
          <i class="bi bi-check2-square me-1"></i>
          {{ selectedRows.length }} selected
        </span>
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
import { ref, computed, onMounted, watch, inject } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '../../composables/useElectronAPI';
import { Modal } from 'bootstrap';
import draggable from 'vuedraggable';
import SearchableMultiSelect from '../common/SearchableMultiSelect.vue';

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
const showArchived = ref(false);
const allSupplierGroups = ref([]);  // Store all groups for dropdown
const groupsLoaded = ref(false);  // Track if groups have been loaded

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

// AG Grid column definitions
const columnDefs = ref([
  {
    field: 'ShortName',
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
    minWidth: 220,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'SupplierGroupName',
    headerName: 'Group',
    width: 180,
    filter: 'agTextColumnFilter',
    sortable: true,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: []  // Will be populated dynamically
    },
    onCellValueChanged: async (params) => {
      if (params.newValue !== params.oldValue) {
        await handleGroupChange(params);
      }
    }
  },
  {
    field: 'ACN',
    headerName: 'ACN',
    width: 120,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'AccountAddress',
    headerName: 'Address',
    width: 250,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'AccountCity',
    headerName: 'City',
    width: 130,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'AccountPhone',
    headerName: 'Phone',
    width: 130,
    filter: 'agTextColumnFilter',
    sortable: true,
    cellRenderer: (params) => {
      if (!params.value) return '-';
      const phoneNumber = params.value.toString().replace(/\s+/g, '');
      return `<a href="tel:${phoneNumber}" class="text-primary" title="Click to call"><i class="bi bi-telephone me-1"></i>${params.value}</a>`;
    }
  },
  {
    field: 'AccountEmail',
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
    field: 'AccountContact',
    headerName: 'Contact Person',
    width: 150,
    filter: 'agTextColumnFilter',
    sortable: true
  },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 230,
    pinned: 'right',
    cellRenderer: (params) => {
      const isArchived = params.data.Archived;
      const archiveBtn = isArchived
        ? `<button class="btn btn-sm btn-outline-success me-1" data-action="unarchive" data-supplier-code="${params.data.Supplier_Code}" title="Unarchive">
             <i class="bi bi-arrow-counterclockwise"></i>
           </button>`
        : `<button class="btn btn-sm btn-outline-warning me-1" data-action="archive" data-supplier-code="${params.data.Supplier_Code}" title="Archive">
             <i class="bi bi-archive"></i>
           </button>`;

      return `<div class="d-flex gap-1">
                <button class="btn btn-sm btn-outline-primary" data-action="edit" data-supplier-code="${params.data.Supplier_Code}" title="Edit">
                  <i class="bi bi-pencil"></i>
                </button>
                ${archiveBtn}
              </div>`;
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

// Row class callback for styling archived suppliers
const getRowClass = (params) => {
  if (params.data && params.data.Archived) {
    return 'archived-row';
  }
  return null;
};

// Side panel configuration for column management
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

// Debounce timer
let searchDebounce = null;

// Load supplier groups filtered by preferences
const loadSupplierGroups = async (preferencesOverride = null) => {
  try {
    console.log('[FRONTEND] loadSupplierGroups called');
    const response = await api.suppliers.getGroups();
    console.log('[FRONTEND] Supplier groups response:', response);
    console.log('[FRONTEND] Response type:', typeof response);
    console.log('[FRONTEND] Response keys:', response ? Object.keys(response) : 'null');

    const groups = response?.data || [];
    console.log('[FRONTEND] Parsed groups:', groups);
    console.log('[FRONTEND] Number of groups:', groups.length);

    // Store all groups for dropdown
    allSupplierGroups.value = groups;
    groupsLoaded.value = true;  // Mark as loaded
    console.log('[FRONTEND] allSupplierGroups.value set to:', allSupplierGroups.value);
    console.log('[FRONTEND] groupsLoaded.value:', groupsLoaded.value);

    // Get user preferences and filter groups
    let prefs;
    if (preferencesOverride) {
      prefs = preferencesOverride;
    } else {
      const prefsResponse = await api.preferencesStore.get();
      prefs = prefsResponse?.data || {};
    }

    const selectedGroupNumbers = prefs.supplierSubGroups || [2]; // Default to group 2
    console.log('[FRONTEND] Selected group numbers from prefs:', selectedGroupNumbers);

    // Filter to only show groups selected in preferences
    const filtered = groups.filter(group =>
      selectedGroupNumbers.includes(group.GroupNumber)
    );
    filteredSupplierGroups.value = filtered;
    console.log('[FRONTEND] Filtered groups for grid:', filtered);

    // Update column def with group names for dropdown
    const groupColumn = columnDefs.value.find(col => col.field === 'SupplierGroupName');
    if (groupColumn && groupColumn.cellEditorParams) {
      groupColumn.cellEditorParams.values = groups.map(g => `${g.GroupNumber} - ${g.GroupName}`);
    }
  } catch (err) {
    console.error('[FRONTEND ERROR] Error loading supplier groups:', err);
    console.error('[FRONTEND ERROR] Error stack:', err.stack);
  }
};

// Load data
const loadData = async () => {
  console.log('[FRONTEND] loadData called');
  loading.value = true;
  error.value = null;

  try {
    // Load ALL data - AG Grid will handle pagination client-side
    const params = {
      limit: 999999,
      offset: 0,
      showArchived: showArchived.value
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

    console.log('[FRONTEND] Calling api.suppliers.getList with params:', params);
    console.log('[FRONTEND] api.suppliers:', api.suppliers);
    const response = await api.suppliers.getList(params);
    console.log('[FRONTEND] Response received:', response);
    console.log('[FRONTEND] Response.data length:', response?.data?.length);
    console.log('[FRONTEND] First row of data:', response?.data?.[0]);

    if (response?.success) {
      rowData.value = response.data || [];
      totalSize.value = response.total || response.data.length;
      console.log('[FRONTEND] rowData.value set to:', rowData.value.length, 'rows');
      console.log('[FRONTEND] First row in rowData:', rowData.value[0]);
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

// Handle supplier group change
const onGroupChange = () => {
  loadData();
};

// Handle archive/unarchive supplier
const handleArchiveSupplier = async (supplierCode, archive) => {
  try {
    const response = await api.suppliers.archive({ supplierCode, archived: archive });

    if (response?.success) {
      success.value = response.message || `Supplier ${archive ? 'archived' : 'unarchived'} successfully`;
      setTimeout(() => success.value = null, 3000);
      loadData(); // Reload data
    } else {
      error.value = response?.message || 'Failed to archive supplier';
    }
  } catch (err) {
    console.error('Error archiving supplier:', err);
    error.value = 'Error archiving supplier';
  }
};

// Handle supplier group change
const handleGroupChange = async (params) => {
  try {
    const newGroupName = params.newValue;
    const oldGroupName = params.oldValue;

    // Parse group number from "GroupNumber - GroupName" format
    const match = newGroupName.match(/^(\d+)\s*-/);
    if (!match) {
      error.value = 'Invalid group format';
      return;
    }

    const suppGroup = parseInt(match[1]);
    const supplierCode = params.data.Supplier_Code;

    const response = await api.suppliers.updateGroup({ supplierCode, suppGroup });

    if (response?.success) {
      success.value = 'Supplier group updated successfully';
      setTimeout(() => success.value = null, 3000);

      // Update the SuppGroup in the row data
      params.data.SuppGroup = suppGroup;
    } else {
      error.value = response?.message || 'Failed to update supplier group';
      // Revert the change
      params.data.SupplierGroupName = oldGroupName;
      if (gridApi.value) {
        gridApi.value.refreshCells({ rowNodes: [params.node], force: true });
      }
    }
  } catch (err) {
    console.error('Error updating supplier group:', err);
    error.value = 'Error updating supplier group';
    // Revert the change
    params.data.SupplierGroupName = params.oldValue;
    if (gridApi.value) {
      gridApi.value.refreshCells({ rowNodes: [params.node], force: true });
    }
  }
};

// Grid ready handler
const onGridReady = (params) => {
  console.log('[FRONTEND] onGridReady called');
  gridApi.value = params.api;

  // Add click event listener for action buttons
  params.api.addEventListener('cellClicked', (event) => {
    const action = event.event.target.dataset.action || event.event.target.closest('[data-action]')?.dataset.action;
    const supplierCode = event.event.target.dataset.supplierCode || event.event.target.closest('[data-supplier-code]')?.dataset.supplierCode;

    if (action === 'edit') {
      handleEditSupplier(event.data);
    } else if (action === 'archive') {
      handleArchiveSupplier(supplierCode, true);
    } else if (action === 'unarchive') {
      handleArchiveSupplier(supplierCode, false);
    }
  });

  // Add event listeners for column state changes (auto-save)
  params.api.addEventListener('columnResized', (event) => {
    if (event.finished) {
      saveColumnState(event);
    }
  });
  params.api.addEventListener('columnMoved', (event) => {
    if (event.finished) {
      saveColumnState(event);
    }
  });
  params.api.addEventListener('columnVisible', saveColumnState);
  params.api.addEventListener('columnPinned', saveColumnState);

  console.log('[FRONTEND] Calling loadData from onGridReady');
  loadData();

  // Load saved column state after data is loaded
  setTimeout(() => {
    loadColumnState();
  }, 100);
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

// Clear all AG Grid column filters
const clearAllFilters = () => {
  if (gridApi.value) {
    gridApi.value.setFilterModel(null);
    success.value = 'All column filters cleared';
    setTimeout(() => success.value = null, 2000);
  }
};

// Open column panel modal
const openColumnPanel = () => {
  if (!gridApi.value) return;

  console.log('[DEBUG] openColumnPanel called');

  // Get current column state from grid
  const columnState = gridApi.value.getColumnState();
  console.log('[DEBUG] Current column state:', columnState);

  // Build managed columns list based on current grid order
  managedColumns.value = columnState
    .filter(state => state.colId && state.colId !== 'actions' && state.colId !== 'ag-Grid-SelectionColumn')
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

  console.log('[DEBUG] Managed columns populated:', managedColumns.value);

  if (columnManagementModal) {
    columnManagementModal.show();
  }
};

// Column reorder handler
const onColumnReorder = () => {
  if (!gridApi.value) return;

  console.log('[DEBUG] onColumnReorder called');
  console.log('[DEBUG] New column order:', managedColumns.value.map(c => c.field));

  // Apply the new column order using applyColumnState
  const newColumnState = managedColumns.value.map((col, index) => ({
    colId: col.field,
    sortIndex: index
  }));

  gridApi.value.applyColumnState({
    state: newColumnState,
    applyOrder: true
  });

  console.log('[DEBUG] Column order applied to grid');
  saveColumnState();
};

// Toggle column visibility
const toggleColumnVisibility = (column) => {
  if (!gridApi.value) return;

  gridApi.value.setColumnsVisible([column.field], column.visible);
  saveColumnState();
};

// Pin column
const pinColumn = (column, position) => {
  if (!gridApi.value) return;

  console.log('[DEBUG] pinColumn called for:', column.field, 'position:', position);

  // Update the column object
  column.pinned = position;

  // Apply to grid using applyColumnState
  gridApi.value.applyColumnState({
    state: [{
      colId: column.field,
      pinned: position
    }],
    defaultState: { pinned: null }
  });

  console.log('[DEBUG] Column pinned in grid');

  saveColumnState();

  console.log('[DEBUG] Pin state saved');
};

// Show rename column modal
const showRenameColumn = (column) => {
  renameColumnField.value = column.field;
  renameColumnName.value = column.headerName;

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

  // Find the column in managedColumns and update its name
  const col = managedColumns.value.find(c => c.field === renameColumnField.value);
  if (col) {
    col.headerName = renameColumnName.value;
  }

  // Update the column definition in the grid
  const colDef = gridApi.value.getColumnDef(renameColumnField.value);
  if (colDef) {
    colDef.headerName = renameColumnName.value;
    gridApi.value.refreshHeader();
  }

  saveColumnState();

  if (renameColumnModal) {
    renameColumnModal.hide();
  }

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

  // Apply to grid using applyColumnState
  const showAllState = managedColumns.value.map(col => ({
    colId: col.field,
    hide: false
  }));

  gridApi.value.applyColumnState({
    state: showAllState
  });

  saveColumnState();
};

// Reset column settings
const resetColumnSettings = async () => {
  if (!gridApi.value) return;

  // Delete saved state
  await api.columnStates.delete('suppliers');

  // Reset all columns to visible and unpinned
  managedColumns.value.forEach(col => {
    col.visible = true;
    col.pinned = null;
    col.headerName = col.field;  // Reset to original field name
  });

  // Apply to grid - reset all columns to visible and unpinned
  const resetState = managedColumns.value.map(col => ({
    colId: col.field,
    hide: false,
    pinned: null
  }));

  gridApi.value.applyColumnState({
    state: resetState
  });

  // Refresh the grid
  gridApi.value.refreshHeader();

  success.value = 'Column settings reset to default';
  setTimeout(() => success.value = null, 2000);
};

// Save column state to electron-store
const saveColumnState = async (event) => {
  if (!gridApi.value) return;

  try {
    const eventType = event?.type || 'manual';
    console.log(`[DEBUG] saveColumnState: Starting save (triggered by: ${eventType})...`);

    // Get current column state (order, width, visibility, pinned)
    const columnState = gridApi.value.getColumnState();

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
      tabName: 'suppliers',
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

// Load column state from electron-store
const loadColumnState = async () => {
  console.log('[DEBUG] loadColumnState: Function called, gridApi.value:', !!gridApi.value);

  if (!gridApi.value) {
    console.log('[DEBUG] loadColumnState: No gridApi, returning early');
    return;
  }

  try {
    console.log('[DEBUG] loadColumnState: Starting load...');
    console.log('[DEBUG] loadColumnState: API available:', !!api.columnStates);

    const result = await api.columnStates.get('suppliers');
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
        gridApi.value.applyColumnState({
          state: savedData.state,
          applyOrder: true
        });
        console.log('[DEBUG] loadColumnState: Column state applied');
      }
    } else {
      console.log('[DEBUG] loadColumnState: No saved state found or invalid result');
    }
  } catch (err) {
    console.error('[DEBUG] Error loading column state:', err);
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

  // Initialize Bootstrap modals
  if (columnManagementModalRef.value) {
    columnManagementModal = new Modal(columnManagementModalRef.value);
  }
  if (renameColumnModalRef.value) {
    renameColumnModal = new Modal(renameColumnModalRef.value);
  }

  // Listen for preference updates
  window.addEventListener('preferencesUpdated', (event) => {
    // Update page size
    if (event.detail?.itemsPerPage) {
      pageSize.value = event.detail.itemsPerPage;
      if (gridApi.value) {
        gridApi.value.setGridOption('paginationPageSize', pageSize.value);
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
    gridApi.value.setGridOption('paginationPageSize', pageSize.value);
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

/* Archived row styling */
.ag-theme-quartz .archived-row {
  color: #999 !important;
  font-style: italic;
}

.ag-theme-quartz-dark .archived-row {
  color: #666 !important;
  font-style: italic;
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
  background-color: var(--bg-primary);
  border-color: var(--border-color);
  color: var(--text-primary);
}
</style>
