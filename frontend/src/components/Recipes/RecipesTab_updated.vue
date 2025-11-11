<template>
  <div class="recipes-tab h-100 d-flex flex-column">
    <!-- Header and Search -->
    <div class="py-3 px-4 border-bottom">
      <!-- Search Bar and Actions -->
      <div class="row mb-3 align-items-center">
        <div class="col-md-4">
          <div class="input-group">
            <span class="input-group-text">
              <i class="bi bi-search"></i>
            </span>
            <input
              type="text"
              class="form-control"
              placeholder="Search recipes..."
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
        <div class="col-md-6">
          <div class="d-flex justify-content-end align-items-center gap-2">
            <!-- Show Archived Toggle -->
            <div class="form-check">
              <input
                class="form-check-input"
                type="checkbox"
                id="showArchivedRecipesCheckbox"
                v-model="showArchived"
                @change="onShowArchivedChange"
              />
              <label class="form-check-label" for="showArchivedRecipesCheckbox">
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
              class="btn"
              :class="isExpanded ? 'btn-outline-secondary' : 'btn-outline-primary'"
              @click="toggleExpandCollapse"
              :title="isExpanded ? 'Collapse All Recipes' : 'Expand All Recipes'"
            >
              <i :class="isExpanded ? 'bi bi-arrows-collapse' : 'bi bi-arrows-expand'"></i>
            </button>
            <button
              class="btn"
              :class="showArchivedOnly ? 'btn-warning' : 'btn-outline-warning'"
              @click="toggleArchivedFilter"
              title="Filter: Show only recipes with archived ingredients"
            >
              <i class="bi bi-exclamation-triangle"></i>
            </button>
            <button
              class="btn btn-outline-secondary"
              @click="selectAllFiltered"
              title="Select All Filtered Recipes"
            >
              <i class="bi bi-check-square"></i>
            </button>
            <button
              class="btn btn-outline-primary"
              @click="handleAddToFavourites"
              :disabled="selectedRows.length === 0"
              title="Add Selected to Favourites"
            >
              <i class="bi bi-star" style="color: #0d6efd;"></i>
            </button>
            <button
              class="btn btn-outline-success"
              @click="handleAddToTemplate"
              :disabled="selectedRows.length === 0"
              title="Add Selected to Template"
            >
              <i class="bi bi-plus-circle" style="color: #198754;"></i>
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
              @click="handleExportToCsv"
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
        :rowData="displayData"
        :defaultColDef="defaultColDef"
        :pagination="true"
        :paginationPageSize="pageSize"
        :paginationPageSizeSelector="pageSizeOptions"
        :rowSelection="rowSelectionConfig"
        :loading="loading"
        :getRowStyle="getRowStyle"
        :tooltipShowDelay="500"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @pagination-changed="onPaginationChanged"
        @column-resized="onColumnResized"
        @column-moved="onColumnMoved"
        @column-visible="onColumnVisible"
        @cell-value-changed="onCellValueChanged"
        @cell-clicked="onCellClicked"
        @row-double-clicked="onRowDoubleClicked"
      />
      <!-- Custom footer info overlaid on AG Grid pagination -->
      <div class="custom-grid-footer">
        <span class="text-muted small">
          <i class="bi bi-list-ul me-1"></i>
          <template v-if="showArchivedOnly">
            <i class="bi bi-exclamation-triangle text-warning me-1"></i>
            <strong>{{ filteredCount.toLocaleString() }}</strong> recipes with archived ingredients
          </template>
          <template v-else-if="filteredCount < totalSize">
            Showing: <strong>{{ filteredCount.toLocaleString() }}</strong> of <strong>{{ totalSize.toLocaleString() }}</strong> recipes
          </template>
          <template v-else>
            Total: <strong>{{ totalSize.toLocaleString() }}</strong> recipes
          </template>
        </span>
        <span v-if="selectedRows.length > 0" class="text-primary small ms-3">
          <i class="bi bi-check2-square me-1"></i>
          {{ selectedRows.length }} selected
        </span>
      </div>
    </div>

    <!-- Column Rename Modal -->
    <div class="modal fade" id="columnRenameModal" tabindex="-1" ref="renameModalRef">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Rename Column</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Column Name</label>
              <input
                type="text"
                class="form-control"
                v-model="renameColumnName"
                placeholder="Enter new column name"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="handleRenameColumn">Save</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Recipe Modal -->
    <div class="modal fade" id="editRecipeModal" tabindex="-1" ref="editRecipeModalRef">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-pencil me-2"></i>Edit Recipe
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label"><strong>Price Code:</strong></label>
              <input
                type="text"
                class="form-control"
                v-model="editingRecipe.PriceCode"
                disabled
                readonly
              />
            </div>
            <div class="mb-3">
              <label class="form-label"><strong>Description:</strong></label>
              <textarea
                class="form-control"
                v-model="editingRecipe.Description"
                rows="3"
                placeholder="Enter recipe description"
              ></textarea>
            </div>
            <div class="alert alert-info mb-0" v-if="editingRecipe.SubItemCount > 0">
              <i class="bi bi-info-circle me-2"></i>
              This recipe has {{ editingRecipe.SubItemCount }} ingredient(s)
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="handleSaveRecipe">
              <i class="bi bi-check-circle me-1"></i>Save Changes
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
              <i class="bi bi-sliders me-2"></i>Column Settings
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { AgGridVue } from 'ag-grid-vue3';
import { Modal } from 'bootstrap';
import { useElectronAPI } from '../../composables/useElectronAPI';
import SearchableMultiSelect from '../common/SearchableMultiSelect.vue';
import draggable from 'vuedraggable';

const api = useElectronAPI();
const router = useRouter();
const theme = inject('theme');

// State
const rowData = ref([]);
const expandedRecipes = ref(new Set());
const subItemsCache = ref(new Map());
const loading = ref(false);
const error = ref(null);
const success = ref(null);
const searchTerm = ref('');
const selectedCostCentres = ref([]);
const costCentres = ref([]);
const totalSize = ref(0);
const filteredCount = ref(0);
const selectedRows = ref([]);
const gridApi = ref(null);
const isExpanded = ref(false);
const showArchivedOnly = ref(false);
const showArchived = ref(false);
const dateFrom = ref('');
const dateTo = ref('');
const pageSize = ref(50);
const pageSizeOptions = [25, 50, 100, 200];
const currentPage = ref(0);
const renameModalRef = ref(null);
const renameColumnName = ref('');
const renameColumnField = ref('');
let renameModalInstance = null;
const columnManagementModal = ref(null);
let columnManagementModalInstance = null;
const managedColumns = ref([]);
const editRecipeModalRef = ref(null);
let editRecipeModalInstance = null;
const editingRecipe = ref({
  PriceCode: '',
  Description: '',
  SubItemCount: 0
});

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
  isRowSelectable: (params) => !params.data.isChild
};

// Custom expand button cell renderer
const ExpandButtonRenderer = (params) => {
  if (params.data.isChild) {
    return '';
  }

  const expanded = expandedRecipes.value.has(params.data.PriceCode);
  const icon = expanded ? 'bi-chevron-down' : 'bi-chevron-right';

  return `<button class="btn btn-sm btn-link p-0" data-action="toggle-expand">
    <i class="bi ${icon}"></i>
  </button>`;
};

// Actions cell renderer
const ActionsRenderer = (params) => {
  if (params.data.isChild) return '';

  const isArchived = params.data.Archived === 1 || params.data.Archived === true;
  const archiveButton = isArchived
    ? `<button class="btn btn-sm btn-outline-secondary" data-action="unarchive" title="Unarchive Recipe">
         <i class="bi bi-arrow-counterclockwise"></i>
       </button>`
    : `<button class="btn btn-sm btn-outline-secondary" data-action="archive" title="Archive Recipe">
         <i class="bi bi-archive"></i>
       </button>`;

  return `
    <div class="action-buttons d-flex gap-1">
      <button class="btn btn-sm btn-warning" data-action="zztakeoff" title="Send to zzTakeoff">
        <i class="bi bi-send" style="color: #000;"></i>
      </button>
      <button class="btn btn-sm btn-outline-primary" data-action="favourite" title="Add to Favourites">
        <i class="bi bi-star" style="color: #0d6efd;"></i>
      </button>
      <button class="btn btn-sm btn-outline-success" data-action="template" title="Add to Template">
        <i class="bi bi-plus-circle" style="color: #198754;"></i>
      </button>
      ${archiveButton}
    </div>
  `;
};

// AG Grid column definitions - All required columns
const columnDefs = ref([
  {
    headerName: '',
    width: 50,
    cellRenderer: ExpandButtonRenderer,
    pinned: 'left',
    lockPosition: true,
    suppressMovable: true,
    suppressColumnsToolPanel: true,
    onCellClicked: (params) => {
      if (!params.data.isChild) {
        toggleExpand(params.data.PriceCode);
      }
    }
  },
  {
    field: 'PriceCode',
    headerName: 'Price Code',
    width: 150,
    pinned: 'left',
    filter: 'agTextColumnFilter',
    sortable: true,
    tooltipValueGetter: (params) => params.value,
    cellStyle: (params) => {
      if (params.data.isChild) {
        return { paddingLeft: '30px', fontStyle: 'italic' };
      }
      return null;
    }
  },
  {
    field: 'Description',
    headerName: 'Description',
    flex: 1,
    minWidth: 300,
    filter: 'agTextColumnFilter',
    sortable: true,
    editable: (params) => !params.data.isChild,
    tooltipValueGetter: (params) => params.value,
    cellStyle: (params) => {
      if (params.data.isChild) {
        return { paddingLeft: '30px' };
      }
      return null;
    }
  },
  {
    field: 'Quantity',
    headerName: 'Qty',
    width: 100,
    cellStyle: { textAlign: 'right' },
    valueFormatter: (params) => {
      if (params.value == null || params.data.isChild === false) return '';
      return params.value.toFixed(3);
    }
  },
  {
    field: 'Formula',
    headerName: 'Formula',
    width: 150,
    filter: 'agTextColumnFilter',
    sortable: true,
    tooltipValueGetter: (params) => params.value,
    valueFormatter: (params) => {
      if (params.value == null) return '';
      return params.value;
    }
  },
  {
    field: 'Unit',
    headerName: 'Unit',
    width: 100,
    filter: 'agTextColumnFilter',
    sortable: true,
    tooltipValueGetter: (params) => params.value
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
    field: 'SubGroup',
    headerName: 'Sub Group',
    width: 150,
    filter: 'agTextColumnFilter',
    sortable: true,
    tooltipValueGetter: (params) => params.value
  },
  {
    field: 'LatestPrice',
    headerName: 'Price',
    width: 120,
    filter: 'agNumberColumnFilter',
    sortable: true,
    tooltipValueGetter: (params) => params.value != null ? `$${params.value.toFixed(2)}` : null,
    valueFormatter: (params) => {
      if (params.value == null) return '-';
      return `$${params.value.toFixed(2)}`;
    },
    cellStyle: { textAlign: 'right' }
  },
  {
    field: 'PriceDate',
    headerName: 'Price Date',
    width: 130,
    sortable: true,
    tooltipValueGetter: (params) => {
      if (!params.value) return null;
      const date = new Date(params.value);
      return date.toLocaleDateString();
    },
    valueFormatter: (params) => {
      if (!params.value) return '';
      const date = new Date(params.value);
      return date.toLocaleDateString();
    }
  },
  {
    field: 'Template',
    headerName: 'Template',
    width: 100,
    hide: true,
    valueFormatter: (params) => {
      return params.value ? 'Yes' : 'No';
    }
  },
  {
    field: 'zzType',
    headerName: 'zzType',
    width: 100,
    hide: false,
    filter: 'agTextColumnFilter',
    sortable: true,
    editable: (params) => !params.data.isChild && params.data.Unit !== 'HEADING',
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: ['', 'area', 'linear', 'segment', 'count']
    },
    valueFormatter: (params) => {
      // Don't show for child rows or heading rows
      if (params.data && (params.data.isChild || params.data.Unit === 'HEADING')) return '';
      // Capitalize first letter for display
      return params.value ? params.value.charAt(0).toUpperCase() + params.value.slice(1) : '';
    },
    tooltipValueGetter: (params) => {
      if (params.data && (params.data.isChild || params.data.Unit === 'HEADING')) return null;
      return params.value ? params.value.charAt(0).toUpperCase() + params.value.slice(1) : null;
    }
  },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 200,
    minWidth: 200,
    pinned: 'right',
    cellRenderer: ActionsRenderer,
    suppressColumnsToolPanel: true,
    suppressMovable: true,
    sortable: false,
    filter: false,
    resizable: true,
    onCellClicked: (params) => {
      const target = params.event.target;
      const button = target.closest('button');

      if (!button) return;

      const action = button.getAttribute('data-action');

      if (action === 'favourite' && !params.data.isChild) {
        handleAddToFavourites(params.data);
      } else if (action === 'template' && !params.data.isChild) {
        handleAddSingleToTemplate(params.data);
      } else if (action === 'zztakeoff' && !params.data.isChild) {
        handleSendToZzTakeoff(params.data);
      } else if (action === 'archive' && !params.data.isChild) {
        handleArchiveRecipe(params.data);
      } else if (action === 'unarchive' && !params.data.isChild) {
        handleUnarchiveRecipe(params.data);
      }
    }
  }
]);

// Default column properties
const defaultColDef = {
  resizable: true,
  sortable: false,
  filter: false,
  floatingFilter: false,
  singleClickEdit: true  // Enable single-click editing for better UX
};

// Display data with expanded sub-items
const displayData = computed(() => {
  const result = [];

  for (const recipe of rowData.value) {
    // Check if this recipe has any archived ingredients
    const subItems = subItemsCache.value.get(recipe.PriceCode) || [];
    const hasArchivedIngredients = subItems.some(item => item.IsArchived === 1 || item.IsArchived === true);

    // Skip recipe if archived filter is active and it doesn't have archived ingredients
    if (showArchivedOnly.value && !hasArchivedIngredients) {
      continue;
    }

    // Add parent recipe
    result.push({
      ...recipe,
      isChild: false,
      hasArchivedIngredients: hasArchivedIngredients
    });

    // If expanded, add sub-items
    if (expandedRecipes.value.has(recipe.PriceCode)) {
      for (const subItem of subItems) {
        result.push({
          ...subItem,
          isChild: true,
          PriceCode: subItem.SubItemCode,
          Description: subItem.SubItemDescription,
          Quantity: subItem.Quantity,
          Formula: subItem.Formula,
          Unit: subItem.Unit,
          LatestPrice: subItem.LatestPrice,
          PriceDate: subItem.PriceDate,
          CostCentre: subItem.Cost_Centre || recipe.CostCentre,
          CostCentreName: subItem.CostCentreName,
          SubGroup: subItem.SubGroup,
          IsArchived: subItem.IsArchived // Pass through archived status
        });
      }
    }
  }

  return result;
});

// Row styling
const getRowStyle = (params) => {
  // Style archived ingredient rows (italic, same color as parent, no bold)
  if (params.data.isChild && (params.data.IsArchived === 1 || params.data.IsArchived === true)) {
    const isDark = theme && theme.value === 'dark';
    return {
      background: isDark ? 'rgba(33, 150, 243, 0.15)' : '#e3f2fd',
      fontWeight: 'normal',
      fontStyle: 'italic'
      // color inherits from parent (no custom color)
    };
  }

  // Style recipes that have archived ingredients (warning color, bold)
  if (!params.data.isChild && params.data.hasArchivedIngredients) {
    const isDark = theme && theme.value === 'dark';
    return {
      color: isDark ? '#fbbf24' : '#d97706',
      fontWeight: 'bold'
    };
  }

  // Style normal child/ingredient rows (standard color, light background)
  if (params.data.isChild) {
    const isDark = theme && theme.value === 'dark';
    return {
      background: isDark ? 'rgba(33, 150, 243, 0.15)' : '#e3f2fd',
      fontWeight: 'normal'
      // color uses standard text color
    };
  }

  return null;
};

// Column state persistence functions
const saveColumnState = async () => {
  if (!gridApi.value) return;

  try {
    const columnState = gridApi.value.getColumnState();

    // Save to SQLite database via API
    const response = await api.columnStates.save({
      tabName: 'recipes',
      columnState: JSON.stringify(columnState)
    });

    if (!response?.success) {
      console.error('Failed to save column state:', response?.error);
    }
  } catch (err) {
    console.error('Error saving column state:', err);
  }
};

const restoreColumnState = async () => {
  if (!gridApi.value) return;

  try {
    const response = await api.columnStates.get('recipes');

    if (response?.success && response.data?.columnState) {
      const columnState = JSON.parse(response.data.columnState);

      // Apply column aliases (headerName) to columnDefs
      columnState.forEach(colState => {
        const colDef = columnDefs.value.find(def => def.field === colState.colId);
        if (colDef && colState.headerName) {
          colDef.headerName = colState.headerName;
        }
      });

      gridApi.value.applyColumnState({
        state: columnState,
        applyOrder: true
      });
    }
  } catch (err) {
    console.error('Error restoring column state:', err);
  }
};

// Column event handlers
const onColumnResized = (event) => {
  if (event.finished) {
    saveColumnState();
  }
};

const onColumnMoved = (event) => {
  if (event.finished) {
    saveColumnState();
  }
};

const onColumnVisible = () => {
  saveColumnState();
};

// Cell value changed handler (for inline editing)
const onCellValueChanged = async (event) => {
  const { data, colDef, newValue, oldValue } = event;
  const field = colDef.field;

  // Only handle zzType changes
  if (field !== 'zzType' || newValue === oldValue) return;

  try {
    console.log('[zzType] Saving override:', data.PriceCode, '→', newValue.toLowerCase());

    // Save zzType override to electron-store
    const result = await api.zzTypeStore.set(data.PriceCode, newValue.toLowerCase());

    if (result && result.success) {
      success.value = 'zzType updated successfully';
      setTimeout(() => success.value = null, 3000);
    } else {
      error.value = 'Failed to update zzType';
      setTimeout(() => error.value = null, 3000);
      // Revert the change
      data.zzType = oldValue;
      gridApi.value.refreshCells({ rowNodes: [event.node], force: true });
    }
  } catch (err) {
    console.error('Error updating zzType:', err);
    error.value = 'Error updating zzType';
    setTimeout(() => error.value = null, 3000);
    // Revert the change
    data.zzType = oldValue;
    gridApi.value.refreshCells({ rowNodes: [event.node], force: true });
  }
};

// Handle row double-click to edit Description
const onRowDoubleClicked = (event) => {
  // Don't allow editing of child rows (sub-items)
  if (event.data.isChild) return;

  // Start editing the Description column
  const descriptionColumn = gridApi.value.getColumn('Description');
  if (descriptionColumn) {
    gridApi.value.startEditingCell({
      rowIndex: event.rowIndex,
      colKey: 'Description'
    });
  }
};

// Open column management modal
const openColumnPanel = () => {
  if (!gridApi.value) return;

  // Populate managedColumns from current grid state
  const columnState = gridApi.value.getColumnState();
  managedColumns.value = columnState
    .filter(col => col.colId !== 'ag-Grid-SelectionColumn') // Exclude selection checkbox column
    .map(col => {
      const colDef = columnDefs.value.find(def => def.field === col.colId);
      return {
        field: col.colId,
        headerName: colDef?.headerName || col.colId,
        visible: !col.hide,
        pinned: col.pinned || null,
        width: col.width
      };
    });

  if (columnManagementModalInstance) {
    columnManagementModalInstance.show();
  }
};

// Toggle column visibility
const toggleColumnVisibility = (col) => {
  if (!gridApi.value) return;

  gridApi.value.setColumnsVisible([col.field], col.visible);
  saveColumnState();
};

// Pin column
const pinColumn = (col, position) => {
  if (!gridApi.value) return;

  col.pinned = position;
  gridApi.value.setColumnPinned(col.field, position);
  saveColumnState();
};

// Column reorder
const onColumnReorder = () => {
  if (!gridApi.value) return;

  const newOrder = managedColumns.value.map(col => col.field);
  gridApi.value.moveColumns(newOrder, 0);
  saveColumnState();
};

// Show all columns
const showAllColumns = () => {
  managedColumns.value.forEach(col => {
    col.visible = true;
  });

  if (gridApi.value) {
    const allFields = managedColumns.value.map(col => col.field);
    gridApi.value.setColumnsVisible(allFields, true);
    saveColumnState();
  }
};

// Reset column settings
const resetColumnSettings = async () => {
  if (!gridApi.value) return;

  // Clear saved state
  try {
    await api.columnStates.delete('recipes');
  } catch (err) {
    console.error('Error deleting column state:', err);
  }

  // Reset to default
  gridApi.value.resetColumnState();

  // Reload page to apply default settings
  window.location.reload();
};

// Show rename column dialog
const showRenameColumn = (col) => {
  renameColumnField.value = col.field;
  renameColumnName.value = col.headerName;

  if (columnManagementModalInstance) {
    columnManagementModalInstance.hide();
  }

  if (renameModalInstance) {
    renameModalInstance.show();
  }
};

// Column rename functionality
const openRenameModal = (field) => {
  const colDef = columnDefs.value.find(def => def.field === field);
  if (colDef) {
    renameColumnField.value = field;
    renameColumnName.value = colDef.headerName;
    if (renameModalInstance) {
      renameModalInstance.show();
    }
  }
};

const handleRenameColumn = async () => {
  const colDef = columnDefs.value.find(def => def.field === renameColumnField.value);
  if (colDef) {
    colDef.headerName = renameColumnName.value;

    // Update managed columns too
    const managedCol = managedColumns.value.find(col => col.field === renameColumnField.value);
    if (managedCol) {
      managedCol.headerName = renameColumnName.value;
    }

    // Refresh header
    if (gridApi.value) {
      gridApi.value.refreshHeader();
      await saveColumnState();
    }

    if (renameModalInstance) {
      renameModalInstance.hide();
    }

    // Reopen column management modal
    if (columnManagementModalInstance) {
      setTimeout(() => columnManagementModalInstance.show(), 300);
    }

    success.value = 'Column renamed successfully';
    setTimeout(() => success.value = null, 3000);
  }
};

// Toggle expand/collapse
const toggleExpand = async (priceCode) => {
  if (expandedRecipes.value.has(priceCode)) {
    // Collapse
    expandedRecipes.value.delete(priceCode);
  } else {
    // Expand - fetch sub-items if not cached
    if (!subItemsCache.value.has(priceCode)) {
      try {
        const response = await api.recipes.getSubItems(priceCode);
        if (response?.success && response.data) {
          subItemsCache.value.set(priceCode, response.data);
        } else {
          subItemsCache.value.set(priceCode, []);
        }
      } catch (err) {
        console.error('Error loading sub-items:', err);
        subItemsCache.value.set(priceCode, []);
      }
    }
    expandedRecipes.value.add(priceCode);
  }

  // Force re-render
  expandedRecipes.value = new Set(expandedRecipes.value);
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
    // Load ALL data - AG Grid will handle pagination client-side
    const params = {
      limit: 999999,
      offset: 0
    };

    if (searchTerm.value) {
      params.searchTerm = searchTerm.value;
    }

    if (selectedCostCentres.value && selectedCostCentres.value.length > 0) {
      params.costCentres = selectedCostCentres.value.map(cc => String(cc));
      console.log('Sending costCentres filter:', params.costCentres);
    }

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

    console.log('Loading recipes with filters:', params);
    const response = await api.recipes.getList(params);

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

      // Resolve zzType for each recipe
      items.forEach(item => {
        // Resolution priority: 1. Override, 2. Unit mapping, 3. Default to 'count'
        if (zzTypeOverrides[item.PriceCode]) {
          item.zzType = zzTypeOverrides[item.PriceCode];
          console.log(`[zzType] ${item.PriceCode}: Using override → ${item.zzType}`);
        } else if (item.Unit && unitMappings[item.Unit]) {
          item.zzType = unitMappings[item.Unit];
          console.log(`[zzType] ${item.PriceCode}: Using unit mapping ${item.Unit} → ${item.zzType}`);
        } else {
          item.zzType = 'count'; // Default
        }
      });

      rowData.value = items.map(item => ({
        PriceCode: item.PriceCode,
        Description: item.Description,
        Quantity: null, // Only for sub-items
        Formula: item.CalculationRoutine,
        Unit: item.Unit,
        CostCentre: item.CostCentre,
        CostCentreName: item.CostCentreName,
        SubGroup: item.SubGroup,
        zzType: item.zzType,
        LatestPrice: item.LatestPrice,
        PriceDate: item.PriceDate,
        Template: item.Template
      }));
      totalSize.value = response.total || response.data.length;
      filteredCount.value = totalSize.value; // Initialize to total

      console.log(`Loaded ${rowData.value.length} recipes. Total: ${totalSize.value}`);

      // Update filtered count after grid updates
      nextTick(() => {
        updateFilteredCount();
      });
    } else {
      error.value = 'Failed to load recipes';
    }
  } catch (err) {
    console.error('Error loading recipes:', err);
    error.value = 'Error loading recipes';
  } finally {
    loading.value = false;
  }
};

// Load cost centres (only those with recipes)
const loadCostCentres = async () => {
  try {
    const response = await api.recipes.getCostCentres({});
    if (response?.success) {
      costCentres.value = response.data || [];
      console.log(`Loaded ${costCentres.value.length} cost centres with recipes`);
    }
  } catch (err) {
    console.error('Error loading cost centres:', err);
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

// Date range filter handlers
const onDateRangeChange = () => {
  console.log('Date range changed:', { from: dateFrom.value, to: dateTo.value });
  loadData(true); // Reset to first page when date range changes
};

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

// Update filtered count
const updateFilteredCount = () => {
  if (!gridApi.value) return;

  let count = 0;
  gridApi.value.forEachNodeAfterFilter((node) => {
    // Only count parent recipe rows, not ingredients
    if (node.data && !node.data.isChild) {
      count++;
    }
  });

  filteredCount.value = count;
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

// Grid ready handler
const onGridReady = (params) => {
  gridApi.value = params.api;

  // Add cell click listener for actions
  params.api.addEventListener('cellClicked', (event) => {
    const target = event.event.target;
    const action = target.dataset.action || target.closest('[data-action]')?.dataset.action;

    if (action === 'edit') {
      handleEditRecipe(event.data);
    } else if (action === 'favourite') {
      handleAddToFavourites([event.data]);
    } else if (action === 'template') {
      handleAddToTemplate([event.data]);
    } else if (action === 'zztakeoff') {
      handleSendToZzTakeoff([event.data]);
    }
  });

  // Load cost centres and data, then restore column state
  loadCostCentres();
  loadData().then(() => {
    restoreColumnState();
  });
};

// Selection changed handler
const onSelectionChanged = () => {
  if (gridApi.value) {
    selectedRows.value = gridApi.value.getSelectedRows().filter(row => !row.isChild);
  }
};

const onCellClicked = (event) => {
  console.log('[zzType] Cell clicked:', {
    column: event.column.getColId(),
    data: event.data,
    value: event.value
  });

  // For zzType column, try to start editing manually
  if (event.column.getColId() === 'zzType') {
    console.log('[zzType] Attempting to start editing...');
    gridApi.value.startEditingCell({
      rowIndex: event.rowIndex,
      colKey: 'zzType'
    });
  }
};

// Select all filtered items
const selectAllFiltered = () => {
  if (!gridApi.value) return;

  // Select all nodes that pass the current filter (excluding child rows)
  let count = 0;
  gridApi.value.forEachNodeAfterFilter((node) => {
    // Only select parent recipe rows, not child sub-item rows
    if (node.data && !node.data.isChild) {
      node.setSelected(true);
      count++;
    }
  });

  console.log(`Selected all filtered recipes: ${count} items`);
};

// Add item to recents
const addToRecents = async (item) => {
  try {
    await api.recentsStore.add({
      PriceCode: item.PriceCode,
      Description: item.Description,
      Unit: item.Unit,
      Price: item.LatestPrice,
      CostCentre: item.CostCentre,
      LastAccessed: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error adding to recents:', err);
  }
};

// Expand all rows
const expandAll = async () => {
  const priceCodes = rowData.value.map(r => r.PriceCode);

  // Fetch all sub-items that aren't cached
  const fetchPromises = [];
  for (const code of priceCodes) {
    if (!subItemsCache.value.has(code)) {
      fetchPromises.push(
        api.recipes.getSubItems(code).then(response => {
          if (response?.success && response.data) {
            subItemsCache.value.set(code, response.data);
          } else {
            subItemsCache.value.set(code, []);
          }
        }).catch(() => {
          subItemsCache.value.set(code, []);
        })
      );
    }
  }

  await Promise.all(fetchPromises);

  // Expand all
  expandedRecipes.value = new Set(priceCodes);
};

// Collapse all rows
const collapseAll = () => {
  expandedRecipes.value = new Set();
  isExpanded.value = false;
};

// Toggle expand/collapse all
const toggleExpandCollapse = async () => {
  if (isExpanded.value) {
    collapseAll();
  } else {
    await expandAll();
    isExpanded.value = true;
  }
};

// Toggle archived ingredients filter
const toggleArchivedFilter = async () => {
  showArchivedOnly.value = !showArchivedOnly.value;

  // If turning on the filter, we need to fetch all sub-items to check for archived ingredients
  if (showArchivedOnly.value) {
    loading.value = true;
    const priceCodes = rowData.value.map(r => r.PriceCode);
    const fetchPromises = [];

    console.log(`Checking ${priceCodes.length} recipes for archived ingredients...`);

    for (const code of priceCodes) {
      if (!subItemsCache.value.has(code)) {
        fetchPromises.push(
          api.recipes.getSubItems(code).then(response => {
            if (response?.success && response.data) {
              subItemsCache.value.set(code, response.data);
              const archivedCount = response.data.filter(item => item.IsArchived === 1 || item.IsArchived === true).length;
              if (archivedCount > 0) {
                console.log(`Recipe ${code} has ${archivedCount} archived ingredient(s)`);
              }
            } else {
              subItemsCache.value.set(code, []);
            }
          }).catch((err) => {
            console.error(`Error loading sub-items for ${code}:`, err);
            subItemsCache.value.set(code, []);
          })
        );
      }
    }

    await Promise.all(fetchPromises);
    loading.value = false;

    // Show success message with count
    nextTick(() => {
      updateFilteredCount();
      const archivedCount = filteredCount.value;
      console.log(`Filter result: ${archivedCount} recipe(s) with archived ingredients`);

      if (archivedCount > 0) {
        success.value = `Found ${archivedCount} recipe(s) with archived ingredients`;
        setTimeout(() => success.value = null, 3000);
      } else {
        error.value = 'No recipes found with archived ingredients';
        setTimeout(() => error.value = null, 3000);
      }
    });
  } else {
    // Update count when turning off filter
    nextTick(() => {
      updateFilteredCount();
    });
  }
};

// Edit recipe handler
const handleEditRecipe = (recipe) => {
  if (!recipe || recipe.isChild) return;

  // Get sub-item count from cache or fetch it
  const subItems = subItemsCache.value.get(recipe.PriceCode) || [];

  // Populate the editing recipe object
  editingRecipe.value = {
    PriceCode: recipe.PriceCode,
    Description: recipe.Description || '',
    SubItemCount: subItems.length
  };

  // Show the modal
  if (editRecipeModalInstance) {
    editRecipeModalInstance.show();
  }
};

// Save edited recipe
const handleSaveRecipe = async () => {
  if (!editingRecipe.value.PriceCode) return;

  try {
    loading.value = true;

    // Call the API to update the recipe
    const response = await api.recipes.updateRecipe({
      priceCode: editingRecipe.value.PriceCode,
      description: editingRecipe.value.Description
    });

    if (response?.success) {
      success.value = 'Recipe updated successfully';

      // Update the local data
      const index = rowData.value.findIndex(r => r.PriceCode === editingRecipe.value.PriceCode);
      if (index !== -1) {
        rowData.value[index].Description = editingRecipe.value.Description;
      }

      // Close the modal
      if (editRecipeModalInstance) {
        editRecipeModalInstance.hide();
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        success.value = null;
      }, 3000);
    } else {
      error.value = response?.error || 'Failed to update recipe';
    }
  } catch (err) {
    console.error('Error updating recipe:', err);
    error.value = 'Error updating recipe: ' + err.message;
  } finally {
    loading.value = false;
  }
};

// Add to favourites
const handleAddToFavourites = async (items = null) => {
  const itemsToAdd = items || selectedRows.value;
  if (itemsToAdd.length === 0) return;

  try {
    for (const row of itemsToAdd) {
      await api.favouritesStore.add({
        PriceCode: row.PriceCode,
        Description: row.Description,
        Unit: row.Unit,
        Price: row.LatestPrice,
        CostCentre: row.CostCentre
      });

      // Also add to recents
      await addToRecents(row);
    }
    success.value = `Added ${itemsToAdd.length} recipe(s) to favourites`;
    setTimeout(() => success.value = null, 3000);
  } catch (err) {
    console.error('Error adding to favourites:', err);
    error.value = 'Failed to add recipes to favourites';
  }
};

// Add to template
const handleAddToTemplate = (items = null) => {
  const itemsToAdd = items || selectedRows.value;
  if (itemsToAdd.length === 0) return;
  alert(`Add ${itemsToAdd.length} recipe(s) to template - functionality coming soon!`);
};

// Add single item to Template
const handleAddSingleToTemplate = async (item) => {
  // Wrap single item in array and call handleAddToTemplate
  handleAddToTemplate([item]);
};

// Archive recipe
const handleArchiveRecipe = async (item) => {
  try {
    const result = await api.recipes.archiveRecipe({
      priceCode: item.PriceCode,
      archived: true
    });

    if (result.success) {
      success.value = `Recipe "${item.Description}" has been archived`;
      setTimeout(() => success.value = null, 3000);

      // Reload data to reflect the change
      await loadData();
    } else {
      error.value = result.message || 'Failed to archive recipe';
      setTimeout(() => error.value = null, 3000);
    }
  } catch (err) {
    console.error('Error archiving recipe:', err);
    error.value = 'Failed to archive recipe';
    setTimeout(() => error.value = null, 3000);
  }
};

// Unarchive recipe
const handleUnarchiveRecipe = async (item) => {
  try {
    const result = await api.recipes.archiveRecipe({
      priceCode: item.PriceCode,
      archived: false
    });

    if (result.success) {
      success.value = `Recipe "${item.Description}" has been unarchived`;
      setTimeout(() => success.value = null, 3000);

      // Reload data to reflect the change
      await loadData();
    } else {
      error.value = result.message || 'Failed to unarchive recipe';
      setTimeout(() => error.value = null, 3000);
    }
  } catch (err) {
    console.error('Error unarchiving recipe:', err);
    error.value = 'Failed to unarchive recipe';
    setTimeout(() => error.value = null, 3000);
  }
};

// Send to zzTakeoff
const handleSendToZzTakeoff = async (item) => {
  try {
    console.log('[zzTakeoff] Sending recipe to zzTakeoff:', item);

    // Navigate to zzTakeoff Web tab
    await router.push('/zztakeoff-web');

    // Wait for the tab to load and webview to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('[zzTakeoff] Skipping page navigation - Router.go() will handle it');

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
          startTakeoffWithProperties({
            type: ${JSON.stringify(item.zzType || 'count')},
            properties: {
              name: { value: ${JSON.stringify(item.Description || '')} },
              sku: { value: ${JSON.stringify(item.PriceCode || '')} },
              unit: { value: ${JSON.stringify(item.Unit || '')} },
              'Cost Each': { value: ${JSON.stringify(item.LatestPrice ? item.LatestPrice.toString() : '0')} },
              'cost centre': { value: ${JSON.stringify(item.CostCentre || '')} }
            }
          });

          return { success: true, note: 'Router.go() then startTakeoffWithProperties executed' };
        } catch (error) {
          return { success: false, error: error.message, stack: error.stack };
        }
      })()
    `;

    console.log('[zzTakeoff] Executing Router.go() + startTakeoffWithProperties (Router.go FIRST)');
    const result = await api.webview.executeJavaScript(jsCode);

    if (result?.success) {
      console.log('[zzTakeoff] Successfully sent recipe to zzTakeoff:', result.note);
      success.value = `Recipe sent to zzTakeoff: ${item.PriceCode}`;
      setTimeout(() => success.value = null, 3000);

      // Track in send history
      try {
        await api.sendHistory.add({
          priceCode: item.PriceCode,
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
      console.error('[zzTakeoff] Failed to send recipe:', result);
      error.value = `Failed to send to zzTakeoff: ${result?.error || 'Unknown error'}`;
      setTimeout(() => error.value = null, 5000);
    }
  } catch (err) {
    console.error('[zzTakeoff] Error in handleSendToZzTakeoff:', err);
    error.value = `Error sending to zzTakeoff: ${err.message}`;
    setTimeout(() => error.value = null, 5000);
  }
};

// Export to CSV
const handleExportToCsv = async () => {
  try {
    loading.value = true;

    // Fetch ALL filtered recipes (not just current page)
    const params = {
      limit: 999999, // Very high limit to get all recipes
      offset: 0
    };

    // Apply the same filters as current view
    if (searchTerm.value) {
      params.searchTerm = searchTerm.value;
    }

    if (selectedCostCentres.value && selectedCostCentres.value.length > 0) {
      params.costCentres = selectedCostCentres.value.map(cc => String(cc));
    }

    console.log('Exporting all filtered recipes with params:', params);
    const response = await api.recipes.getList(params);

    if (response?.success && response.data) {
      // Map backend data to frontend format
      const recipes = response.data.map(item => ({
        PriceCode: item.PriceCode,
        Description: item.Description,
        Unit: item.Unit,
        CostCentre: item.CostCentre,
        CostCentreName: item.CostCentreName,
        SubGroup: item.SubGroup,
        LatestPrice: item.LatestPrice,
        PriceDate: item.PriceDate
      }));

      // Convert to CSV format
      const csvRows = [];

      // Headers - use visible columns from grid
      const visibleColumns = gridApi.value.getAllDisplayedColumns()
        .filter(col => col.getColDef().field) // Only columns with field property
        .map(col => col.getColDef().headerName || col.getColDef().field);
      csvRows.push(visibleColumns.join(','));

      // Data rows
      for (const recipe of recipes) {
        const row = gridApi.value.getAllDisplayedColumns()
          .filter(col => col.getColDef().field)
          .map(col => {
            const field = col.getColDef().field;
            let value = recipe[field] || '';

            // Handle special formatting
            if (field === 'LatestPrice' && value) {
              value = `$${parseFloat(value).toFixed(2)}`;
            } else if (field === 'PriceDate' && value) {
              // Format date
              const date = new Date(value);
              value = date.toLocaleDateString();
            }

            // Escape quotes and commas for CSV
            if (typeof value === 'string') {
              value = value.replace(/"/g, '""');
              if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = `"${value}"`;
              }
            }

            return value;
          });
        csvRows.push(row.join(','));
      }

      // Create and download CSV file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `recipes-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      success.value = `Exported ${recipes.length} recipes to CSV`;
      setTimeout(() => success.value = null, 3000);
    } else {
      error.value = 'Failed to export recipes';
      setTimeout(() => error.value = null, 3000);
    }
  } catch (err) {
    console.error('Error exporting recipes:', err);
    error.value = 'Error exporting recipes';
    setTimeout(() => error.value = null, 3000);
  } finally {
    loading.value = false;
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
  loadCostCentres(); // Load the cost centres dropdown

  // Initialize rename modal
  if (renameModalRef.value) {
    renameModalInstance = new Modal(renameModalRef.value);
  }

  // Initialize column management modal
  if (columnManagementModal.value) {
    columnManagementModalInstance = new Modal(columnManagementModal.value);
  }

  // Initialize edit recipe modal
  if (editRecipeModalRef.value) {
    editRecipeModalInstance = new Modal(editRecipeModalRef.value);
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
</script>

<style scoped>
.recipes-tab {
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

/* Child row styling */
:deep(.ag-row) {
  cursor: pointer;
}

/* Expand button styling */
:deep(.ag-cell button) {
  color: inherit;
  text-decoration: none;
}

:deep(.ag-cell button:hover) {
  color: var(--link-color);
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
