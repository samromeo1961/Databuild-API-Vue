<template>
  <div class="contacts-tab h-100 d-flex flex-column">
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
        <div class="col-md-2">
          <!-- Contact Group Multi-Select Dropdown -->
          <div class="dropdown w-100">
            <button
              class="btn btn-outline-secondary dropdown-toggle w-100 text-start d-flex justify-content-between align-items-center"
              type="button"
              id="contactGroupDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span>
                {{ selectedGroupsDisplay }}
              </span>
            </button>
            <ul class="dropdown-menu w-100" style="max-height: 350px; overflow-y: auto;">
              <!-- Search input -->
              <li class="px-3 py-2" @click.stop>
                <div class="input-group input-group-sm">
                  <span class="input-group-text">
                    <i class="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Search groups..."
                    v-model="groupSearchTerm"
                    @click.stop
                  />
                  <button
                    v-if="groupSearchTerm"
                    class="btn btn-outline-secondary btn-sm"
                    @click.stop="groupSearchTerm = ''"
                  >
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </li>
              <li><hr class="dropdown-divider my-1" /></li>

              <!-- Group list -->
              <template v-if="!groupsLoaded">
                <li class="px-3 py-2">
                  <span class="text-muted small">
                    <i class="bi bi-hourglass-split me-1"></i>Loading groups...
                  </span>
                </li>
              </template>
              <template v-else-if="displayedContactGroups.length === 0">
                <li class="px-3 py-2">
                  <span class="text-muted small">
                    {{ groupSearchTerm ? 'No groups match your search' : 'No contact groups available' }}
                  </span>
                </li>
              </template>
              <template v-else>
                <li v-for="group in displayedContactGroups" :key="group.Code" class="px-3">
                  <div class="form-check">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :id="`group-${group.Code}`"
                      :value="group.Code"
                      :checked="selectedGroups.includes(group.Code)"
                      @change="handleGroupToggle(group.Code)"
                    />
                    <label class="form-check-label" :for="`group-${group.Code}`">
                      {{ group.Code }} - {{ group.Name }}
                    </label>
                  </div>
                </li>
              </template>

              <!-- Clear selection -->
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
        <div class="col-md-6 d-flex justify-content-end align-items-center gap-3">
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
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @row-double-clicked="handleEditContact"
      />

      <!-- Custom footer info overlaid on AG Grid pagination -->
      <div class="custom-grid-footer">
        <span class="text-muted small">
          <i class="bi bi-people me-1"></i>
          Total: <strong>{{ totalSize.toLocaleString() }}</strong> contacts
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
              <button class="btn btn-sm btn-outline-secondary" @click="showAllColumns">
                <i class="bi bi-eye"></i> Show All
              </button>
              <button class="btn btn-sm btn-outline-warning" @click="resetColumnSettings">
                <i class="bi bi-arrow-counterclockwise"></i> Reset to Default
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
              <i class="bi bi-check-circle me-1"></i>Done
            </button>
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
            <h5 class="modal-title" id="renameColumnModalLabel">
              <i class="bi bi-pencil me-2"></i>Rename Column
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Original Name:</label>
              <p class="text-muted">{{ columnToRename?.field }}</p>
            </div>
            <div class="mb-3">
              <label for="newColumnName" class="form-label">New Display Name:</label>
              <input
                type="text"
                class="form-control"
                id="newColumnName"
                v-model="newColumnName"
                @keyup.enter="applyColumnRename"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="applyColumnRename">Apply</button>
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

// Contact Groups state
const allContactGroups = ref([]);
const selectedGroups = ref([]);
const groupSearchTerm = ref('');
const groupsLoaded = ref(false);

// Column Management Modal
const columnManagementModalRef = ref(null);
const renameColumnModalRef = ref(null);
let columnManagementModal = null;
let renameColumnModal = null;
const managedColumns = ref([]);
const columnToRename = ref(null);
const newColumnName = ref('');

// Check if dark mode
const isDarkMode = computed(() => {
  return theme && theme.value === 'dark';
});

// Display text for selected groups
const selectedGroupsDisplay = computed(() => {
  if (selectedGroups.value.length === 0) {
    return 'All Contact Groups';
  } else if (selectedGroups.value.length === 1) {
    const group = allContactGroups.value.find(g => g.Code === selectedGroups.value[0]);
    return group ? `${group.Code} - ${group.Name}` : 'Selected (1)';
  } else {
    return `Selected (${selectedGroups.value.length})`;
  }
});

// Filtered groups based on search term
const displayedContactGroups = computed(() => {
  const groupsToDisplay = allContactGroups.value;

  if (!groupSearchTerm.value) {
    return groupsToDisplay;
  }

  const searchLower = groupSearchTerm.value.toLowerCase();
  return groupsToDisplay.filter(group => {
    const groupCode = group.Code.toString().toLowerCase();
    const groupName = (group.Name || '').toLowerCase();
    return groupCode.includes(searchLower) || groupName.includes(searchLower);
  });
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
    flex: 1,
    minWidth: 220,
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
    width: 200,
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
    sortable: true,
    cellRenderer: (params) => {
      if (!params.value) return '-';
      const phoneNumber = params.value.toString().replace(/\s+/g, '');
      return `<a href="tel:${phoneNumber}" class="text-primary" title="Click to call"><i class="bi bi-telephone me-1"></i>${params.value}</a>`;
    }
  },
  {
    field: 'Mobile',
    headerName: 'Mobile',
    width: 130,
    filter: 'agTextColumnFilter',
    sortable: true,
    cellRenderer: (params) => {
      if (!params.value) return '-';
      const phoneNumber = params.value.toString().replace(/\s+/g, '');
      return `<a href="tel:${phoneNumber}" class="text-primary" title="Click to call"><i class="bi bi-phone me-1"></i>${params.value}</a>`;
    }
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

// Load contact groups
const loadContactGroups = async () => {
  try {
    const response = await api.contacts.getGroups();
    if (response?.success) {
      allContactGroups.value = response.data || [];
      groupsLoaded.value = true;
      console.log('[DEBUG] Loaded', allContactGroups.value.length, 'contact groups');
    }
  } catch (err) {
    console.error('Error loading contact groups:', err);
    allContactGroups.value = [];
    groupsLoaded.value = true;
  }
};

// Handle group filter toggle
const handleGroupToggle = (groupCode) => {
  const index = selectedGroups.value.indexOf(groupCode);
  if (index === -1) {
    selectedGroups.value.push(groupCode);
  } else {
    selectedGroups.value.splice(index, 1);
  }
  loadData();
};

// Clear group filter
const clearGroupFilter = () => {
  selectedGroups.value = [];
  loadData();
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

    // Add group filter (comma-separated list)
    if (selectedGroups.value.length > 0) {
      params.group = selectedGroups.value.join(',');
    }

    console.log('[DEBUG] getContactsList called with params:', params);

    const response = await api.contacts.getList(params);

    if (response?.success) {
      rowData.value = response.data || [];
      totalSize.value = response.total || response.data?.length || 0;
      console.log('[DEBUG] Loaded', rowData.value.length, 'contacts');
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
  console.log('[FRONTEND] onGridReady called');
  gridApi.value = params.api;

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

  // Load saved column state
  loadColumnState();

  // Load contact groups and data
  loadContactGroups();
  loadData();
};

// Selection changed handler
const onSelectionChanged = () => {
  if (gridApi.value) {
    selectedRows.value = gridApi.value.getSelectedRows();
  }
};

// Save column state
const saveColumnState = async () => {
  if (!gridApi.value) return;

  try {
    const columnState = gridApi.value.getColumnState();
    const columnDefs = gridApi.value.getColumnDefs();

    // Build header names map from current column definitions
    const headerNames = {};
    columnDefs.forEach(colDef => {
      if (colDef.field) {
        headerNames[colDef.field] = colDef.headerName || colDef.field;
      }
    });

    const stateToSave = {
      state: columnState,
      headerNames: headerNames
    };

    await api.columnStates.save('contacts', stateToSave);
  } catch (err) {
    console.error('Error saving column state:', err);
  }
};

// Load column state
const loadColumnState = async () => {
  if (!gridApi.value) return;

  try {
    const response = await api.columnStates.get('contacts');

    if (response?.success && response.data) {
      const savedState = typeof response.data === 'string'
        ? JSON.parse(response.data)
        : response.data;

      // Apply column state
      if (savedState.state) {
        gridApi.value.applyColumnState({
          state: savedState.state,
          applyOrder: true
        });
      }

      // Apply custom header names
      if (savedState.headerNames) {
        const columnDefs = gridApi.value.getColumnDefs();
        columnDefs.forEach(colDef => {
          if (colDef.field && savedState.headerNames[colDef.field]) {
            colDef.headerName = savedState.headerNames[colDef.field];
          }
        });
        gridApi.value.setGridOption('columnDefs', columnDefs);
      }
    }
  } catch (err) {
    console.error('Error loading column state:', err);
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
    .filter(state => state.colId && state.colId !== 'ag-Grid-SelectionColumn')
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

// Toggle column visibility
const toggleColumnVisibility = (column) => {
  if (!gridApi.value) return;

  console.log('[DEBUG] toggleColumnVisibility called for:', column.field, 'visible:', column.visible);

  gridApi.value.applyColumnState({
    state: [{
      colId: column.field,
      hide: !column.visible
    }],
    defaultState: { hide: false }
  });

  console.log('[DEBUG] Column visibility toggled in grid');

  saveColumnState();
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

// Show all columns
const showAllColumns = () => {
  if (!gridApi.value) return;

  console.log('[DEBUG] showAllColumns called');

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

  console.log('[DEBUG] All columns shown');

  saveColumnState();
};

// Reset column settings
const resetColumnSettings = async () => {
  if (!gridApi.value) return;

  console.log('[DEBUG] resetColumnSettings called');

  try {
    // Delete saved state
    await api.columnStates.delete('contacts');

    // Reset column state in grid
    gridApi.value.applyColumnState({
      defaultState: {
        sort: null,
        sortIndex: null,
        flex: null,
        width: null,
        hide: false,
        pinned: null
      }
    });

    // Reset column definitions to original
    gridApi.value.setGridOption('columnDefs', columnDefs.value);

    console.log('[DEBUG] Column settings reset');

    // Reload managed columns
    openColumnPanel();

  } catch (err) {
    console.error('Error resetting column settings:', err);
  }
};

// Show rename column modal
const showRenameColumn = (column) => {
  columnToRename.value = column;
  newColumnName.value = column.headerName;

  if (renameColumnModal) {
    renameColumnModal.show();
  }
};

// Apply column rename
const applyColumnRename = () => {
  if (!gridApi.value || !columnToRename.value) return;

  const newName = newColumnName.value.trim();
  if (!newName) return;

  console.log('[DEBUG] applyColumnRename called for:', columnToRename.value.field, 'new name:', newName);

  // Update in managed columns
  columnToRename.value.headerName = newName;

  // Update in grid
  const columnDefs = gridApi.value.getColumnDefs();
  const colDefToUpdate = columnDefs.find(def => def.field === columnToRename.value.field);
  if (colDefToUpdate) {
    colDefToUpdate.headerName = newName;
    gridApi.value.setGridOption('columnDefs', columnDefs);
  }

  console.log('[DEBUG] Column renamed in grid');

  saveColumnState();

  if (renameColumnModal) {
    renameColumnModal.hide();
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

[data-theme="dark"] .modal-header {
  border-bottom-color: var(--border-color);
}

[data-theme="dark"] .list-group-item {
  background-color: var(--bg-primary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

[data-theme="dark"] .dropdown-divider {
  border-color: var(--border-color);
}

[data-theme="dark"] .form-check-label {
  color: var(--text-primary);
}

[data-theme="dark"] .dropdown-menu {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
}

[data-theme="dark"] .dropdown-item {
  color: var(--text-primary);
}

[data-theme="dark"] .dropdown-item:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

[data-theme="dark"] .form-check-input {
  background-color: var(--bg-primary);
  border-color: var(--border-color);
}

/* Ensure grid fills container */
.ag-theme-quartz {
  --ag-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Grid footer styling */
.grid-footer {
  background-color: var(--bg-primary);
  border-top: 1px solid var(--border-color, #dee2e6);
  font-size: 0.9rem;
  min-height: 45px;
}

[data-theme="dark"] .grid-footer {
  background-color: var(--bg-secondary);
  border-top-color: var(--border-color);
}
</style>
