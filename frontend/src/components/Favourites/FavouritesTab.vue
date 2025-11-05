<template>
  <div class="favourites-tab h-100 d-flex flex-column">
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
              placeholder="Search favourites..."
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
              class="btn btn-outline-danger"
              @click="handleRemoveSelected"
              :disabled="selectedRows.length === 0"
              title="Remove from Favourites"
            >
              <i class="bi bi-star-fill"></i>
            </button>
            <button
              class="btn btn-outline-warning"
              @click="handleClearAll"
              :disabled="totalSize === 0"
              title="Clear All Favourites"
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
          <i class="bi bi-star me-1"></i>
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
            Are you sure you want to clear all {{ totalSize }} favourite items? This action cannot be undone.
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
import { ref, computed, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '../../composables/useElectronAPI';
import { Modal } from 'bootstrap';
import draggable from 'vuedraggable';

const api = useElectronAPI();
const theme = inject('theme');
const router = useRouter();

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

// Column management modal state
const columnManagementModal = ref(null);
let columnManagementModalInstance = null;
const managedColumns = ref([]);

// Rename column modal state
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
    field: 'zzType',
    headerName: 'zzType',
    width: 150,
    cellRenderer: (params) => {
      const value = params.value || 'count';

      // Create a container div
      const container = document.createElement('div');
      container.className = 'd-flex align-items-center h-100';

      // Create a span to display the current value
      const display = document.createElement('span');
      display.className = 'form-control-plaintext px-2';
      display.style.cursor = 'pointer';
      display.style.color = 'var(--ag-foreground-color, inherit)';
      const valueLabels = {
        'count': 'Count',
        'linear': 'Linear',
        'area': 'Area',
        'segment': 'Segment'
      };
      display.textContent = valueLabels[value] || 'Count';

      // Create the select element (hidden by default)
      const select = document.createElement('select');
      select.className = 'form-select form-select-sm';
      select.style.display = 'none';
      select.innerHTML = `
        <option value="area" ${value === 'area' ? 'selected' : ''}>Area</option>
        <option value="linear" ${value === 'linear' ? 'selected' : ''}>Linear</option>
        <option value="segment" ${value === 'segment' ? 'selected' : ''}>Segment</option>
        <option value="count" ${value === 'count' ? 'selected' : ''}>Count</option>
      `;

      // Double-click to show dropdown
      display.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        display.style.display = 'none';
        select.style.display = 'block';
        select.focus();
      });

      // Handle selection change
      select.addEventListener('change', (e) => {
        params.data.zzType = e.target.value;
        display.textContent = valueLabels[e.target.value] || 'Count';
        select.style.display = 'none';
        display.style.display = 'block';
        handleZzTypeChange(params.data);
      });

      // Handle blur (clicking away)
      select.addEventListener('blur', () => {
        select.style.display = 'none';
        display.style.display = 'block';
      });

      container.appendChild(display);
      container.appendChild(select);
      return container;
    }
  },
  {
    field: 'DateAdded',
    headerName: 'Date Added',
    width: 150,
    filter: 'agDateColumnFilter',
    sortable: true,
    valueFormatter: (params) => {
      if (!params.value) return '-';
      return new Date(params.value).toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 100,
    pinned: 'right',
    cellRenderer: (params) => {
      const button = document.createElement('button');
      button.className = 'btn btn-sm btn-warning';
      button.innerHTML = '<i class="bi bi-send"></i>';
      button.title = 'Send to zzTakeoff';
      button.addEventListener('click', () => {
        handleSendToZzTakeoff(params.data);
      });
      return button;
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
    const response = await api.favouritesStore.getList();

    if (response?.success) {
      rowData.value = response.data || [];
      totalSize.value = rowData.value.length;
    } else {
      error.value = 'Failed to load favourites';
    }
  } catch (err) {
    console.error('Error loading favourites:', err);
    error.value = 'Error loading favourites';
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

// Handle remove selected
const handleRemoveSelected = async () => {
  if (selectedRows.value.length === 0) return;

  try {
    for (const row of selectedRows.value) {
      await api.favouritesStore.remove(row.PriceCode);
    }

    success.value = `Removed ${selectedRows.value.length} item(s) from favourites`;
    setTimeout(() => (success.value = null), 3000);

    await loadData();

    if (gridApi.value) {
      gridApi.value.deselectAll();
    }
  } catch (err) {
    console.error('Error removing from favourites:', err);
    error.value = 'Failed to remove items from favourites';
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
    const response = await api.favouritesStore.clear();

    if (response?.success) {
      if (clearAllModalInstance) {
        clearAllModalInstance.hide();
      }

      success.value = 'All favourites cleared successfully';
      setTimeout(() => (success.value = null), 3000);

      await loadData();
    } else {
      error.value = 'Failed to clear favourites';
    }
  } catch (err) {
    console.error('Error clearing favourites:', err);
    error.value = 'Failed to clear favourites';
  }
};

// Export to Excel
const handleExportToExcel = () => {
  if (gridApi.value) {
    gridApi.value.exportDataAsCsv({
      fileName: 'favourites-export.csv'
    });
    success.value = 'Exported to CSV';
    setTimeout(() => (success.value = null), 3000);
  }
};

// Add to recents
const addToRecents = async (item) => {
  try {
    await api.recentsStore.add({
      PriceCode: item.PriceCode,
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

// Handle zzType change
const handleZzTypeChange = async (item) => {
  try {
    // Update the item in favourites store with new zzType
    const result = await api.favouritesStore.update({
      PriceCode: item.PriceCode,
      zzType: item.zzType
    });
    console.log(`[Favourites] zzType update result for ${item.PriceCode}:`, result);
    console.log(`[Favourites] Updated zzType to: ${item.zzType}`);

    // Verify the data was saved by reading it back
    const listResult = await api.favouritesStore.getList();
    const savedItem = listResult.data?.find(i => i.PriceCode === item.PriceCode);
    console.log(`[Favourites] Saved item from store:`, savedItem);
  } catch (err) {
    console.error('[Favourites] Error updating zzType:', err);
  }
};

// Send to zzTakeoff (real integration)
const handleSendToZzTakeoff = async (item) => {
  if (!item) return;

  try {
    console.log('[zzTakeoff] Preparing to send item:', item);

    // Navigate to zzTakeoff Web tab
    await router.push('/zztakeoff-web');

    // Wait for the tab to load and webview to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if we need to navigate to the takeoff page
    // Only navigate if NOT already on the takeoff page (e.g., if on Reports, Community, etc.)
    console.log('[zzTakeoff] Checking current page...');

    try {
      // Get the current URL
      const getCurrentUrlScript = `(function() { return window.location.href; })()`;
      const currentUrlResult = await api.webview.executeJavaScript(getCurrentUrlScript);
      const currentUrl = currentUrlResult?.result || '';

      console.log('[zzTakeoff] Current URL:', currentUrl);

      // Check if already on the takeoff page
      const isOnTakeoffPage = currentUrl.includes('/app/takeoff');

      if (!isOnTakeoffPage) {
        // Not on takeoff page - need to navigate
        console.log('[zzTakeoff] Not on takeoff page, navigating...');

        // Parse URL to extract projectId and pageId
        let projectId = '';
        let pageId = '';

        try {
          const url = new URL(currentUrl);
          projectId = url.searchParams.get('projectId') || '';
          pageId = url.searchParams.get('pageId') || '';
          console.log('[zzTakeoff] Extracted projectId:', projectId, 'pageId:', pageId);
        } catch (parseError) {
          console.warn('[zzTakeoff] Could not parse current URL:', parseError);
        }

        // Build takeoff URL with preserved project context
        let takeoffUrl = 'https://www.zztakeoff.com/app/takeoff';
        if (projectId) {
          const params = new URLSearchParams();
          params.append('projectId', projectId);
          if (pageId) {
            params.append('pageId', pageId);
          }
          takeoffUrl += '?' + params.toString();
        }

        console.log('[zzTakeoff] Navigating to takeoff page:', takeoffUrl);

        // Navigate to the takeoff page with preserved project context
        await api.webview.navigate(takeoffUrl);
        console.log('[zzTakeoff] Navigation initiated to takeoff page');

        // Wait for navigation and page load
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log('[zzTakeoff] Already on takeoff page, skipping navigation');
        // Small delay to ensure page is ready
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('[zzTakeoff] Ready to execute startTakeoffWithProperties');
    } catch (navError) {
      console.error('[zzTakeoff] Error checking/navigating to takeoff page:', navError);
      throw new Error('Failed to navigate to zzTakeoff page: ' + navError.message);
    }

    // Build the JavaScript code to execute in zzTakeoff.com
    const jsCode = `
      startTakeoffWithProperties({
        type: ${JSON.stringify(item.zzType || 'count')},
        properties: {
          name: {
            value: ${JSON.stringify(item.Description || '')}
          },
          sku: {
            value: ${JSON.stringify(item.PriceCode || '')}
          },
          unit: {
            value: ${JSON.stringify(item.Unit || '')}
          },
          'Cost Each': {
            value: ${JSON.stringify(item.Price ? item.Price.toString() : '0')}
          },
          'cost centre': {
            value: ${JSON.stringify(item.CostCentre || '')}
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
        code: item.PriceCode,
        description: item.Description,
        unit: item.Unit,
        price: item.Price,
        quantity: 1
      }],
      project: 'zzTakeoff Integration',
      status: result.success ? 'Success' : 'Failed',
      sentAt: new Date().toISOString(),
      itemCount: 1
    });

    // Add to recents
    await addToRecents(item);

    success.value = `Sent "${item.Description}" to zzTakeoff`;
    setTimeout(() => success.value = null, 3000);

  } catch (err) {
    console.error('Error sending to zzTakeoff:', err);
    error.value = `Failed to send items to zzTakeoff: ${err.message}`;
  }
};

// Column management functions
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

const toggleColumnVisibility = (column) => {
  if (!gridApi.value) return;
  gridApi.value.setColumnsVisible([column.field], column.visible);
  saveColumnState();
};

const pinColumn = (column, pinnedState) => {
  if (!gridApi.value) return;
  column.pinned = pinnedState;
  gridApi.value.setColumnPinned(column.field, pinnedState);
  saveColumnState();
};

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

const showAllColumns = () => {
  if (!gridApi.value) return;
  const allFields = managedColumns.value.map(col => col.field);
  gridApi.value.setColumnsVisible(allFields, true);
  managedColumns.value.forEach(col => col.visible = true);
  saveColumnState();
};

const resetColumnSettings = async () => {
  if (!gridApi.value) return;
  await api.columnStates.delete('favouritesColumnState');
  gridApi.value.resetColumnState();
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

  const colDefInRef = columnDefs.value.find(c => c.field === renameColumnField.value);
  if (colDefInRef) {
    colDefInRef.headerName = renameColumnName.value;
  }

  const columnDef = gridApi.value.getColumnDef(renameColumnField.value);
  if (columnDef) {
    columnDef.headerName = renameColumnName.value;
    gridApi.value.refreshHeader();

    const col = managedColumns.value.find(c => c.field === renameColumnField.value);
    if (col) {
      col.headerName = renameColumnName.value;
    }

    saveColumnState();
  }

  if (renameColumnModalInstance) {
    renameColumnModalInstance.hide();
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
      tabName: 'favouritesColumnState',
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
    const response = await api.columnStates.get('favouritesColumnState');
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
.favourites-tab {
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
