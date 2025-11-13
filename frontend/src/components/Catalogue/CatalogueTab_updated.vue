<template>
  <div class="catalogue-tab h-100 d-flex flex-column">
    <!-- Header and Search -->
    <div class="py-3 px-4 border-bottom" style="position: relative; z-index: 10;">
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
        <div class="col-md-3">
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
        <div class="col-md-6" style="position: relative; z-index: 20;">
          <div class="d-flex justify-content-end align-items-center gap-3" style="position: relative; z-index: 20;">
            <button
              :class="onlyWithNotes ? 'btn btn-primary' : 'btn btn-outline-secondary'"
              @click="toggleNotesFilter"
              :title="onlyWithNotes ? 'Filter: Items with notes (active)' : 'Filter: Show only items with notes'"
            >
              <i class="bi bi-sticky"></i>
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
              class="btn btn-warning"
              @click="handleSendToZzTakeoff"
              :disabled="selectedRows.length === 0 || loading"
              title="Send to zzTakeoff"
              style="min-width: 45px;"
            >
              <i v-if="!loading" class="bi bi-send"></i>
              <span v-if="loading" class="spinner-border spinner-border-sm"></span>
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
    <div class="flex-grow-1 position-relative d-flex flex-column" style="z-index: 1;">
      <div class="flex-grow-1">
        <ag-grid-vue
          class="ag-theme-quartz h-100"
          :class="{ 'ag-theme-quartz-dark': isDarkMode }"
          theme="legacy"
          :columnDefs="columnDefs"
          :rowData="rowData"
          :defaultColDef="defaultColDef"
          :pagination="false"
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

      <!-- Custom Pagination Controls (AG Grid style - matching Recipes layout) -->
      <div class="ag-paging-panel ag-unselectable">
        <!-- Left side: Total count with hamburger icon -->
        <span class="ag-paging-row-summary-panel">
          <i class="bi bi-list"></i>
          <span class="ag-paging-total-text">Total: <strong>{{ totalSize.toLocaleString() }}</strong> items</span>
        </span>

        <!-- Right side: All pagination controls grouped together -->
        <span class="ag-paging-page-summary-panel">
          <!-- Page Size dropdown -->
          <span class="ag-paging-page-size">
            Page Size:
            <select
              class="ag-paging-page-size-selector"
              v-model="pageSize"
              @change="onPageSizeChange"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </span>

          <!-- Item range -->
          <span class="ag-paging-row-summary-panel-numbers">
            <span class="ag-paging-row-summary-panel-number">{{ ((currentPage * pageSize) + 1).toLocaleString() }}</span>
            to
            <span class="ag-paging-row-summary-panel-number">{{ Math.min((currentPage + 1) * pageSize, totalSize).toLocaleString() }}</span>
            of
            <span class="ag-paging-row-summary-panel-number">{{ totalSize.toLocaleString() }}</span>
          </span>

          <!-- Navigation buttons -->
          <div class="ag-paging-button-wrapper">
            <button
              type="button"
              class="ag-paging-button"
              @click="goToFirstPage"
              :disabled="currentPage === 0"
              ref="btFirst"
            >
              <span class="ag-icon ag-icon-first"></span>
            </button>
            <button
              type="button"
              class="ag-paging-button"
              @click="goToPreviousPage"
              :disabled="currentPage === 0"
              ref="btPrevious"
            >
              <span class="ag-icon ag-icon-previous"></span>
            </button>
            <button
              type="button"
              class="ag-paging-button"
              @click="goToNextPage"
              :disabled="currentPage >= totalPages - 1"
              ref="btNext"
            >
              <span class="ag-icon ag-icon-next"></span>
            </button>
            <button
              type="button"
              class="ag-paging-button"
              @click="goToLastPage"
              :disabled="currentPage >= totalPages - 1"
              ref="btLast"
            >
              <span class="ag-icon ag-icon-last"></span>
            </button>
          </div>

          <!-- Page number -->
          <span class="ag-paging-description">
            Page
            <span ref="lbCurrent">{{ (currentPage + 1).toLocaleString() }}</span>
            of
            <span ref="lbTotal">{{ totalPages.toLocaleString() }}</span>
          </span>
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

    <!-- Notes Edit Modal -->
    <NotesEditModal ref="notesEditModalRef" @note-saved="onNoteSaved" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue';
import { useRouter } from 'vue-router';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '../../composables/useElectronAPI';
import { useColumnNames } from '../../composables/useColumnNames';
import { Modal } from 'bootstrap';
import draggable from 'vuedraggable';
import SearchableSelect from '../common/SearchableSelect.vue';
import NotesEditModal from '../common/NotesEditModal.vue';

const api = useElectronAPI();
const columnNamesComposable = useColumnNames();
const router = useRouter();
const theme = inject('theme');

// State
const rowData = ref([]);
const loading = ref(false);
const error = ref(null);
const success = ref(null);
const searchTerm = ref('');
const costCentre = ref('');
const onlyWithNotes = ref(false);
const costCentres = ref([]);
const totalSize = ref(0);
const selectedRows = ref([]);
const gridApi = ref(null);
const pageSize = ref(50);
const currentPage = ref(0);
const pageSizeOptions = [25, 50, 100, 200];
const sortField = ref(null);
const sortOrder = ref('asc');

// Computed: Total pages
const totalPages = computed(() => {
  return Math.ceil(totalSize.value / pageSize.value) || 1;
});

// Pagination functions
const goToFirstPage = () => {
  currentPage.value = 0;
  loadData();
};

const goToPreviousPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--;
    loadData();
  }
};

const goToNextPage = () => {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++;
    loadData();
  }
};

const goToLastPage = () => {
  currentPage.value = totalPages.value - 1;
  loadData();
};

const onPageSizeChange = () => {
  currentPage.value = 0;
  loadData();
};

// Column Management Modal
const columnManagementModalRef = ref(null);
const renameColumnModalRef = ref(null);
let columnManagementModal = null;
let renameColumnModal = null;
const managedColumns = ref([]);
const renameColumnField = ref('');
const renameColumnName = ref('');

// Notes Modal
const notesEditModalRef = ref(null);

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
    field: 'notes',
    headerName: 'Notes',
    width: 300,
    filter: false, // Disabled - use "Only items with notes" checkbox instead (server-side filter)
    sortable: true,
    editable: false,
    cellRenderer: (params) => {
      const noteText = params.value || '';
      const preview = noteText.length > 50 ? noteText.substring(0, 50) + '...' : noteText;
      const displayText = noteText ? preview : '<i class="text-muted">Click to add notes...</i>';
      return `<div class="notes-cell" style="cursor: pointer;" data-action="edit-note">${displayText}</div>`;
    },
    tooltipValueGetter: (params) => params.value || 'Click to edit notes',
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
            <i class="bi bi-send" style="color: #000;"></i>
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

/**
 * Load catalogue data from the database with pagination and filtering
 * Fetches catalogue items, then resolves zzType for each based on:
 * 1. Explicit zzType override (from zzTypeStore)
 * 2. Unit-to-zzType mapping (from preferences)
 * 3. Default 'count' if no mapping
 *
 * Uses server-side pagination with pageSize and offset
 * @async
 * @returns {Promise<void>}
 */
const loadData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const params = {
      limit: pageSize.value,
      offset: currentPage.value * pageSize.value
    };

    if (searchTerm.value) {
      params.searchTerm = searchTerm.value;
    }

    if (costCentre.value) {
      params.costCentre = costCentre.value;
    }

    if (onlyWithNotes.value) {
      params.onlyWithNotes = true;
      console.log('[LoadData] Only items with notes filter: ENABLED');
    } else {
      console.log('[LoadData] Only items with notes filter: DISABLED');
    }

    if (sortField.value) {
      params.sortField = sortField.value;
      params.sortOrder = sortOrder.value;
    }

    console.log('[LoadData] Fetching with params:', params);
    const response = await api.catalogue.getItems(params);
    console.log('[LoadData] Response total:', response?.total);

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

      // Load notes for all items
      await loadNotesForItems();
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

// Sync ALL Template data from database to electron-store (one-time operation)
const syncAllTemplatesToNotesStore = async () => {
  try {
    const syncKey = 'catalogue_templates_synced';
    const lastSync = localStorage.getItem(syncKey);
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    // Only sync if not done in the last hour (or never synced)
    if (lastSync && (now - parseInt(lastSync)) < ONE_HOUR) {
      console.log('[Template Sync] Already synced recently, skipping');
      return;
    }

    console.log('[Template Sync] Starting full Template data sync...');
    const response = await api.catalogue.getAllTemplates();

    console.log('[Template Sync] API Response:', response);
    console.log('[Template Sync] Response success:', response?.success);
    console.log('[Template Sync] Response data:', response?.data ? `${response.data.length} items` : 'NO DATA');
    console.log('[Template Sync] Response count:', response?.count);

    if (response?.success && response.data) {
      console.log(`[Template Sync] Syncing ${response.count} templates to notes-store`);

      // Get all existing notes in ONE call (much faster!)
      const existingNotesResponse = await api.notesStore.getAll();
      const existingNotes = existingNotesResponse?.success ? existingNotesResponse.data : {};

      // Build object of new notes to save (only for items without existing custom notes)
      const notesToSync = {};
      let skippedCount = 0;

      for (const item of response.data) {
        // Only sync if no custom note exists (don't overwrite user edits)
        if (!existingNotes[item.PriceCode]) {
          notesToSync[item.PriceCode] = item.Template;
        } else {
          skippedCount++;
        }
      }

      // Save ALL notes in ONE batch IPC call (much faster!)
      const syncedCount = Object.keys(notesToSync).length;
      if (syncedCount > 0) {
        await api.notesStore.saveMultiple(notesToSync, false); // merge=false to avoid overwriting
      }

      // Mark as synced
      localStorage.setItem(syncKey, now.toString());
      console.log(`[Template Sync] Sync complete: ${syncedCount} synced, ${skippedCount} skipped (custom notes preserved)`);
    }
  } catch (err) {
    console.error('[Template Sync] Error syncing templates:', err);
  }
};

// Load notes for all items (from electron-store) - BATCH OPERATION
const loadNotesForItems = async () => {
  if (!rowData.value || rowData.value.length === 0) {
    console.log('[LoadNotes] No rowData to load notes for');
    return;
  }

  try {
    console.log(`[LoadNotes] Loading notes for ${rowData.value.length} items`);

    // Get ALL notes in ONE call (much faster than individual gets!)
    const notesResponse = await api.notesStore.getAll();
    const allNotes = notesResponse?.success ? notesResponse.data : {};

    console.log(`[LoadNotes] Found ${Object.keys(allNotes).length} notes in store`);
    console.log(`[LoadNotes] First 5 note keys:`, Object.keys(allNotes).slice(0, 5));
    console.log(`[LoadNotes] First 5 grid ItemCodes:`, rowData.value.slice(0, 5).map(i => i.ItemCode));

    let matchedCount = 0;
    let emptyCount = 0;

    // Merge notes into grid data
    for (const item of rowData.value) {
      if (item.ItemCode && allNotes[item.ItemCode]) {
        item.notes = allNotes[item.ItemCode];
        matchedCount++;
      } else {
        item.notes = '';
        emptyCount++;
      }
    }

    console.log(`[LoadNotes] Merged notes: ${matchedCount} with notes, ${emptyCount} without`);

    // Refresh grid to show notes
    if (gridApi.value) {
      gridApi.value.setGridOption('rowData', rowData.value);
      console.log('[LoadNotes] Grid refreshed with notes');
    }
  } catch (err) {
    console.error('[LoadNotes] Error loading notes:', err);
  }
};

// Handle edit note click
const handleEditNote = (priceCode, currentNote) => {
  if (notesEditModalRef.value) {
    notesEditModalRef.value.show(priceCode, currentNote || '');
  }
};

// Handle note saved
const onNoteSaved = async (data) => {
  try {
    const { priceCode, note } = data;

    // Save to notes-store
    const result = await api.notesStore.save(priceCode, note);

    if (result?.success) {
      // Update the rowData
      const item = rowData.value.find(row => row.ItemCode === priceCode);
      if (item) {
        item.notes = note;

        // Refresh the grid
        if (gridApi.value) {
          gridApi.value.setGridOption('rowData', rowData.value);
        }
      }

      success.value = 'Note saved successfully';
      setTimeout(() => success.value = null, 3000);
    } else {
      error.value = 'Failed to save note';
      setTimeout(() => error.value = null, 3000);
    }
  } catch (err) {
    console.error('Error saving note:', err);
    error.value = 'Error saving note';
    setTimeout(() => error.value = null, 3000);
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
    currentPage.value = 0;
    loadData();
  }, 500);
};

// Clear search
const clearSearch = () => {
  searchTerm.value = '';
  currentPage.value = 0;
  loadData();
};

// Filter change handler
const onFilterChange = () => {
  currentPage.value = 0;
  loadData();
};

// Toggle notes filter (for action button)
const toggleNotesFilter = () => {
  onlyWithNotes.value = !onlyWithNotes.value;
  onFilterChange();
};

// Grid ready handler
const onGridReady = (params) => {
  gridApi.value = params.api;

  // Load saved column state
  loadColumnState();

  // Add click event listener for row actions
  params.api.addEventListener('cellClicked', (event) => {
    // Check if clicked element or its parent has data-action attribute
    let target = event.event.target;
    let action = target.dataset.action;

    // If target doesn't have action, check parent (for icon clicks)
    if (!action && target.parentElement) {
      action = target.parentElement.dataset.action;
    }

    console.log('[Actions] Cell clicked, target:', target, 'action:', action);

    if (action === 'template') {
      console.log('[Actions] Template button clicked');
      handleAddSingleItemToTemplate(event.data);
    } else if (action === 'zztakeoff') {
      console.log('[Actions] zzTakeoff button clicked');
      handleSendSingleItemToZzTakeoff(event.data);
    } else if (action === 'edit-note') {
      console.log('[Actions] Edit note clicked');
      handleEditNote(event.data.ItemCode, event.data.notes);
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

/**
 * Toggle visibility of a column in the AG Grid
 * @param {Object} column - Column configuration object
 * @param {string} column.field - Column field identifier
 * @param {boolean} column.visible - Desired visibility state
 */
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

/**
 * Reorder columns in AG Grid based on managedColumns array order
 * Called after drag-and-drop reordering in the column management modal
 * Updates AG Grid column order and persists state to electron-store
 */
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

/**
 * Pin a column to left or right side of the grid
 * @param {Object} column - Column configuration object
 * @param {string} column.field - Column field identifier
 * @param {string|null} position - Pin position: 'left', 'right', or null (unpinned)
 */
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

const handleSendToZzTakeoff = async () => {
  console.log('[zzTakeoff] Button clicked! selectedRows:', selectedRows.value.length);

  if (selectedRows.value.length === 0) {
    error.value = 'Please select at least one item to send';
    setTimeout(() => error.value = null, 3000);
    return;
  }

  // Prevent multiple clicks
  if (loading.value) {
    console.log('[zzTakeoff] Already sending, please wait...');
    return;
  }

  loading.value = true;

  try {
    // Send the first selected item (single item at a time)
    const item = selectedRows.value[0];
    console.log('[zzTakeoff] Sending catalogue item to zzTakeoff:', item);

    // Check if zzTakeoff window is open
    const windowStatus = await api.zzTakeoffWindow.isOpen();

    if (!windowStatus?.isOpen) {
      console.log('[zzTakeoff] Opening zzTakeoff window for first time...');
      const openResult = await api.zzTakeoffWindow.open('https://www.zztakeoff.com/login');

      if (!openResult.success) {
        throw new Error('Failed to open zzTakeoff window');
      }

      error.value = 'zzTakeoff window opened. Please login, then click the send button again.';
      setTimeout(() => error.value = null, 5000);
      return;
    }

    console.log('[zzTakeoff] Window already open, focusing and sending item...');
    // Focus window without navigating
    await api.zzTakeoffWindow.open();

    // Generate properties using custom column names
    const fieldsToSend = ['Description', 'ItemCode', 'Unit', 'LatestPrice', 'CostCentre'];
    const customProperties = columnNamesComposable.getZzTakeoffProperties(item, fieldsToSend);

    // Execute BOTH Router.go AND startTakeoffWithProperties (Router.go FIRST)
    const jsCode = `
      (function() {
        try {
          // First: Navigate to Takeoff tab with active project and zoom state
          if (typeof Router !== 'undefined' && typeof appLayout !== 'undefined') {
            const takeoffUrl = appLayout.getAppUrl('takeoff');
            console.log('[zzTakeoff] Navigating to:', takeoffUrl);
            Router.go(takeoffUrl);
          }

          // Second: Open the takeoff dialogue with item properties
          if (typeof startTakeoffWithProperties !== 'function') {
            return { success: false, error: 'startTakeoffWithProperties function not found' };
          }

          startTakeoffWithProperties({
            type: ${JSON.stringify(item.zzType || 'count')},
            properties: ${JSON.stringify(customProperties)}
          });

          return { success: true, note: 'Router.go() then startTakeoffWithProperties executed' };
        } catch (error) {
          return { success: false, error: error.message, stack: error.stack };
        }
      })()
    `;

    const result = await api.zzTakeoffWindow.executeJavaScript(jsCode);

    if (result?.success && result.result?.success) {
      console.log('[zzTakeoff] Successfully sent item to zzTakeoff:', result.result.note);
      success.value = `Item sent to zzTakeoff: ${item.ItemCode}`;
      setTimeout(() => success.value = null, 3000);

      // Track in send history
      try {
        await api.sendHistory.add({
          priceCode: item.ItemCode,
          description: item.Description,
          unit: item.Unit,
          price: item.LatestPrice,
          costCentre: item.CostCentre,
          timestamp: new Date().toISOString()
        });
      } catch (historyError) {
        console.error('Failed to save to send history:', historyError);
      }
    } else {
      const errorMsg = result?.result?.error || result?.message || 'Unknown error';
      console.error('[zzTakeoff] Failed to send item:', errorMsg);

      if (errorMsg.includes('not defined') || errorMsg.includes('not found')) {
        error.value = 'Please make sure you are logged into zzTakeoff and on the main page, then try again.';
      } else {
        error.value = `Failed to send to zzTakeoff: ${errorMsg}`;
      }
      setTimeout(() => error.value = null, 5000);
    }
  } catch (err) {
    console.error('[zzTakeoff] Error in handleSendToZzTakeoff:', err);
    error.value = `Error sending to zzTakeoff: ${err.message}`;
    setTimeout(() => error.value = null, 5000);
  } finally {
    loading.value = false;
  }
};

const handleSendSingleItemToZzTakeoff = async (item) => {
  console.log('[Actions] handleSendSingleItemToZzTakeoff called with item:', item);
  selectedRows.value = [item];
  await handleSendToZzTakeoff();
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
// Apply custom column names to columnDefs
const applyCustomColumnNames = () => {
  const updatedColumnDefs = columnNamesComposable.applyColumnNames(columnDefs.value);
  columnDefs.value = updatedColumnDefs;

  // Refresh grid headers if grid is ready
  if (gridApi.value) {
    gridApi.value.refreshHeader();
  }
};

onMounted(async () => {
  loadPageSize();
  loadCostCentres();

  // Load custom column names
  await columnNamesComposable.loadColumnNames();
  applyCustomColumnNames();

  // Sync all Template data to notes-store (one-time operation) - AWAIT to ensure it completes before grid loads
  console.log('[Catalogue] Starting Template sync...');
  await syncAllTemplatesToNotesStore();
  console.log('[Catalogue] Template sync finished');

  // If grid already loaded while sync was happening, reload notes
  if (gridApi.value && rowData.value.length > 0) {
    console.log('[Catalogue] Grid already loaded, refreshing notes...');
    await loadNotesForItems();
  }

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

  // Listen for column name updates
  window.addEventListener('columnNamesUpdated', async () => {
    await columnNamesComposable.loadColumnNames();
    applyCustomColumnNames();
    // Reload data to refresh the grid
    if (gridApi.value) {
      loadData();
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

/* Notes cell styling */
.notes-cell {
  padding: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notes-cell:hover {
  background-color: rgba(0, 123, 255, 0.1);
}

[data-theme="dark"] .notes-cell:hover {
  background-color: rgba(13, 110, 253, 0.2);
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

/* Custom pagination styling to match AG Grid native and Recipes tab layout */
.ag-paging-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  border-top: 1px solid var(--ag-border-color, #babfc7);
  background-color: var(--ag-background-color, #fff);
  color: var(--ag-foreground-color, #000);
  font-size: 13px;
}

/* Left side: Total count with hamburger icon */
.ag-paging-row-summary-panel {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ag-paging-row-summary-panel .bi-list {
  font-size: 20px;
  opacity: 0.7;
}

.ag-paging-total-text {
  font-size: 13px;
}

.ag-paging-total-text strong {
  font-weight: 600;
}

/* Right side: All pagination controls grouped together */
.ag-paging-page-summary-panel {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Page size dropdown */
.ag-paging-page-size {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.ag-paging-page-size-selector {
  height: 28px;
  padding: 4px 8px;
  border: 1px solid var(--ag-border-color, #babfc7);
  background-color: var(--ag-background-color, #fff);
  color: var(--ag-foreground-color, #000);
  border-radius: 2px;
  font-size: 13px;
  cursor: pointer;
}

/* Item range on right side */
.ag-paging-row-summary-panel-numbers {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.ag-paging-row-summary-panel-number {
  font-weight: 600;
}

/* Navigation buttons */
.ag-paging-button-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ag-paging-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--ag-border-color, #babfc7);
  background-color: var(--ag-background-color, #fff);
  color: var(--ag-foreground-color, #000);
  cursor: pointer;
  border-radius: 2px;
  transition: background-color 0.15s ease;
}

.ag-paging-button:hover:not(:disabled) {
  background-color: var(--ag-row-hover-color, #f0f0f0);
}

.ag-paging-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Page description */
.ag-paging-description {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

/* AG Grid icons for pagination */
.ag-icon-first::before { content: "⟪"; }
.ag-icon-previous::before { content: "‹"; }
.ag-icon-next::before { content: "›"; }
.ag-icon-last::before { content: "⟫"; }

/* Dark theme pagination */
[data-theme="dark"] .ag-paging-panel {
  border-top-color: var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

[data-theme="dark"] .ag-paging-button {
  border-color: var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

[data-theme="dark"] .ag-paging-button:hover:not(:disabled) {
  background-color: var(--bg-primary);
}

[data-theme="dark"] .ag-paging-page-size-selector {
  border-color: var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
</style>
