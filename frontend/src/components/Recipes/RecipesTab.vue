<template>
  <div class="recipes-tab h-100 d-flex flex-column">
    <!-- Search and Actions -->
    <div class="py-3 px-4 border-bottom">
      <div class="row mb-3">
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
          <div class="btn-group w-100">
            <button
              class="btn btn-outline-secondary"
              @click="selectAllFiltered"
              title="Select all filtered recipes across all pages"
            >
              <i class="bi bi-check-square"></i> Select All
            </button>
            <button
              class="btn btn-outline-primary"
              @click="toggleExpandAll"
              :title="allExpanded ? 'Collapse All' : 'Expand All'"
            >
              <i :class="allExpanded ? 'bi bi-arrows-collapse' : 'bi bi-arrows-expand'"></i>
              {{ allExpanded ? 'Collapse' : 'Expand' }}
            </button>
            <button
              class="btn btn-outline-success"
              @click="handleAddToTemplate"
              :disabled="selectedRows.length === 0"
              title="Add to Template"
            >
              <i class="bi bi-plus-circle"></i> Template
            </button>
            <button
              class="btn btn-outline-info"
              @click="handleExportToExcel"
              title="Export to CSV"
            >
              <i class="bi bi-download"></i> CSV
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
        :rowData="displayData"
        :defaultColDef="defaultColDef"
        :pagination="true"
        :paginationPageSize="pageSize"
        :paginationPageSizeSelector="pageSizeOptions"
        :suppressPaginationPanel="false"
        :rowSelection="rowSelectionConfig"
        :loading="loading"
        :getRowClass="getRowClass"
        :getRowStyle="getRowStyle"
        :isRowSelectable="isRowSelectable"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @pagination-changed="onPaginationChanged"
        @cell-value-changed="onCellValueChanged"
      />
      <!-- Custom footer info overlaid on AG Grid pagination -->
      <div class="custom-grid-footer">
        <span class="text-muted small">
          <i class="bi bi-list-ul me-1"></i>
          <template v-if="filteredCount < totalSize">
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject, nextTick } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useRouter } from 'vue-router';
import { useElectronAPI } from '../../composables/useElectronAPI';
import SearchableMultiSelect from '../common/SearchableMultiSelect.vue';

const api = useElectronAPI();
const router = useRouter();
const theme = inject('theme');

// State
const rowData = ref([]);
const expandedRecipes = ref(new Set());
const subItemsCache = ref(new Map());
const allExpanded = ref(false);
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
const pageSize = ref(50);
const pageSizeOptions = [25, 50, 100, 200];
const currentPage = ref(0);

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
    // Don't allow selection of heading rows or child rows
    return !params.data.isChild && params.data.Unit !== 'HEADING';
  }
};

// Add class to heading rows for CSS targeting
const getRowClass = (params) => {
  if (params.data.Unit === 'HEADING') {
    return 'heading-row';
  }
  return null;
};

// Custom expand button cell renderer
const ExpandButtonRenderer = (params) => {
  if (params.data.isChild) {
    return '';
  }

  const expanded = expandedRecipes.value.has(params.data.RecipeCode);
  const icon = expanded ? 'bi-chevron-down' : 'bi-chevron-right';

  return `<button class="btn btn-sm btn-link p-0" data-action="toggle-expand">
    <i class="bi ${icon}"></i>
  </button>`;
};

// AG Grid column definitions
const columnDefs = ref([
  {
    headerName: '',
    width: 50,
    cellRenderer: ExpandButtonRenderer,
    pinned: 'left',
    lockPosition: true,
    suppressMovable: true,
    onCellClicked: (params) => {
      if (!params.data.isChild) {
        toggleExpand(params.data.RecipeCode);
      }
    }
  },
  {
    field: 'Type',
    headerName: 'Type',
    width: 100,
    hide: true, // Hidden in grid but available for export
    valueGetter: (params) => {
      // Return "Takeoff" for recipes, "Item" for ingredients
      return params.data.isChild ? 'Item' : 'Takeoff';
    },
    cellStyle: (params) => {
      if (params.data.isChild) {
        return { fontWeight: 'normal', fontStyle: 'italic' };
      }
      return { fontWeight: 'bold' };
    }
  },
  {
    field: 'RecipeCode',
    headerName: 'Code',
    width: 120,
    pinned: 'left',
    filter: 'agTextColumnFilter',
    sortable: true,
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
    cellStyle: (params) => {
      if (params.data.isChild) {
        return { paddingLeft: '30px' };
      }
      return null;
    }
  },
  {
    field: 'Formula',
    headerName: 'Formula',
    width: 150,
    cellStyle: (params) => {
      if (params.data.isChild) {
        return { paddingLeft: '30px', fontStyle: 'italic' };
      }
      return null;
    },
    valueFormatter: (params) => {
      // Only show formula for ingredient rows
      if (!params.data.isChild) return '';
      return params.value || '';
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
    field: 'SupplierCode',
    headerName: 'Supplier',
    width: 120,
    filter: 'agTextColumnFilter',
    sortable: true
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
      values: ['area', 'linear', 'segment', 'count']
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
    colId: 'actions',
    headerName: 'Actions',
    width: 200,
    pinned: 'right',
    lockPosition: true,
    suppressMovable: true,
    cellRenderer: (params) => {
      // Only show actions for parent recipes, not sub-items
      if (params.data.isChild) {
        return '';
      }

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
        </div>
      `;
    },
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
      }
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

// Display data with expanded sub-items
const displayData = computed(() => {
  const result = [];

  for (const recipe of rowData.value) {
    // Check if this recipe has any archived ingredients
    const subItems = subItemsCache.value.get(recipe.RecipeCode) || [];
    const hasArchivedIngredients = subItems.some(item => item.IsArchived === 1 || item.IsArchived === true);

    // Add parent recipe
    result.push({
      ...recipe,
      isChild: false,
      hasArchivedIngredients: hasArchivedIngredients
    });

    // If expanded, add sub-items
    if (expandedRecipes.value.has(recipe.RecipeCode)) {
      for (const subItem of subItems) {
        result.push({
          ...subItem,
          isChild: true,
          RecipeCode: subItem.SubItemCode,
          Description: subItem.SubItemDescription, // Backend returns SubItemDescription
          Formula: subItem.Formula, // Backend returns Formula
          Quantity: subItem.Quantity,
          Unit: subItem.Unit,
          Price: subItem.LatestPrice, // Backend returns LatestPrice
          CostCentre: subItem.Cost_Centre || recipe.CostCentre, // Backend returns Cost_Centre
          SupplierCode: '', // Sub-items don't have supplier
          IsArchived: subItem.IsArchived // Pass through archived status
        });
      }
    }
  }

  return result;
});

// Row styling
const getRowStyle = (params) => {
  // Style HEADING rows
  if (params.data.Unit === 'HEADING') {
    return {
      fontWeight: 'bold',
      backgroundColor: isDarkMode.value ? '#2d3748' : '#e8f4f8',
      color: isDarkMode.value ? '#cbd5e0' : '#2c5282'
    };
  }

  // Style archived ingredient rows (italic + warning color)
  if (params.data.isChild && (params.data.IsArchived === 1 || params.data.IsArchived === true)) {
    const isDark = theme && theme.value === 'dark';
    return {
      background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
      fontWeight: 'normal',
      fontStyle: 'italic',
      color: isDark ? '#fbbf24' : '#d97706'
    };
  }

  // Style recipes that have archived ingredients (warning color)
  if (!params.data.isChild && params.data.hasArchivedIngredients) {
    const isDark = theme && theme.value === 'dark';
    return {
      color: isDark ? '#fbbf24' : '#d97706',
      fontWeight: 'bold'
    };
  }

  // Style normal child/ingredient rows
  if (params.data.isChild) {
    const isDark = theme && theme.value === 'dark';
    if (isDark) {
      return { background: 'rgba(33, 150, 243, 0.15)', fontWeight: 'normal', color: '#e3f2fd' };
    } else {
      return { background: '#e3f2fd', fontWeight: 'normal', color: '#1976d2' };
    }
  }

  return null;
};

// Only parent rows can be selected
const isRowSelectable = (params) => {
  return !params.data.isChild;
};

// Toggle expand/collapse
const toggleExpand = async (recipeCode) => {
  if (expandedRecipes.value.has(recipeCode)) {
    // Collapse
    expandedRecipes.value.delete(recipeCode);
    allExpanded.value = false; // Reset all expanded state
  } else {
    // Expand - fetch sub-items if not cached
    if (!subItemsCache.value.has(recipeCode)) {
      try {
        const response = await api.recipes.getSubItems(recipeCode);
        if (response?.success && response.data) {
          subItemsCache.value.set(recipeCode, response.data);
        } else {
          subItemsCache.value.set(recipeCode, []);
        }
      } catch (err) {
        console.error('Error loading sub-items:', err);
        subItemsCache.value.set(recipeCode, []);
      }
    }
    expandedRecipes.value.add(recipeCode);

    // Check if all recipes are now expanded
    if (expandedRecipes.value.size === rowData.value.length) {
      allExpanded.value = true;
    }
  }

  // Force re-render
  expandedRecipes.value = new Set(expandedRecipes.value);
};

// Debounce timer
let searchDebounce = null;

// Cell value changed handler (for inline editing)
const onCellValueChanged = async (event) => {
  const { data, colDef, newValue, oldValue } = event;
  const field = colDef.field;

  // Only handle zzType changes
  if (field !== 'zzType' || newValue === oldValue) return;

  try {
    console.log('[zzType] Saving override:', data.RecipeCode, '→', newValue.toLowerCase());

    // Save zzType override to electron-store
    const result = await api.zzTypeStore.set(data.RecipeCode, newValue.toLowerCase());

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

// Load data
const loadData = async (resetPage = false) => {
  loading.value = true;
  error.value = null;

  // Reset to first page if filters changed
  if (resetPage) {
    currentPage.value = 0;
    if (gridApi.value) {
      gridApi.value.paginationGoToPage(0);
    }
  }

  try {
    const params = {
      limit: pageSize.value,
      offset: currentPage.value * pageSize.value
    };

    if (searchTerm.value) {
      params.searchTerm = searchTerm.value;
    }

    if (selectedCostCentres.value && selectedCostCentres.value.length > 0) {
      params.costCentres = selectedCostCentres.value.map(cc => String(cc));
      console.log('Sending costCentres filter:', params.costCentres);
    }

    console.log('Loading recipes - Page:', currentPage.value + 1, 'Offset:', params.offset, 'Limit:', params.limit);
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
        RecipeCode: item.PriceCode,
        Description: item.Description,
        Unit: item.Unit,
        Price: item.Price,
        CostCentre: item.CostCentre,
        SupplierCode: item.SupplierCode,
        zzType: item.zzType
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

// Pagination changed handler
const onPaginationChanged = () => {
  if (!gridApi.value) return;

  const newPage = gridApi.value.paginationGetCurrentPage();
  const newPageSize = gridApi.value.paginationGetPageSize();

  // Check if page size changed
  if (newPageSize !== pageSize.value) {
    console.log('Page size changed from', pageSize.value, 'to', newPageSize);
    pageSize.value = newPageSize;
    currentPage.value = 0; // Reset to first page
    loadData();
    return;
  }

  // Only load data if page actually changed
  if (newPage !== currentPage.value) {
    console.log('Page changed from', currentPage.value, 'to', newPage);
    currentPage.value = newPage;
    loadData();
  }
};

// Grid ready handler
const onGridReady = (params) => {
  gridApi.value = params.api;

  // Force show zzType column (in case saved column state is hiding it)
  const zzTypeCol = gridApi.value.getColumn('zzType');
  if (zzTypeCol) {
    gridApi.value.setColumnsVisible(['zzType'], true);
    console.log('[zzType] Column forced visible');
  }

  loadCostCentres();
  loadData();
};

// Selection changed handler
const onSelectionChanged = () => {
  if (gridApi.value) {
    selectedRows.value = gridApi.value.getSelectedRows().filter(row => !row.isChild);
  }
};

// Select all filtered items across all pages
const selectAllFiltered = () => {
  if (!gridApi.value) return;

  let count = 0;
  gridApi.value.forEachNodeAfterFilter((node) => {
    // Don't select heading rows or child (ingredient) rows
    if (node.data && !node.data.isChild && node.data.Unit !== 'HEADING') {
      node.setSelected(true);
      count++;
    }
  });

  console.log(`Selected all filtered recipes: ${count} items`);
};

// Update filtered count
const updateFilteredCount = () => {
  if (!gridApi.value) return;

  let count = 0;
  gridApi.value.forEachNodeAfterFilter((node) => {
    // Only count parent recipe rows, not ingredients or headings
    if (node.data && !node.data.isChild && node.data.Unit !== 'HEADING') {
      count++;
    }
  });

  filteredCount.value = count;
};

// Toggle expand/collapse all rows
const toggleExpandAll = async () => {
  if (allExpanded.value) {
    // Collapse all
    expandedRecipes.value = new Set();
    allExpanded.value = false;
  } else {
    // Expand all
    const recipeCodes = rowData.value.map(r => r.RecipeCode);

    // Fetch all sub-items that aren't cached
    const fetchPromises = [];
    for (const code of recipeCodes) {
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
    expandedRecipes.value = new Set(recipeCodes);
    allExpanded.value = true;
  }
};

// Add to template (placeholder)
const handleAddToTemplate = () => {
  if (selectedRows.value.length === 0) return;
  alert(`Add ${selectedRows.value.length} recipes to template - functionality coming soon!`);
};

// Export to Excel
const handleExportToExcel = () => {
  if (gridApi.value) {
    gridApi.value.exportDataAsCsv({
      fileName: 'recipes-export.csv'
    });
    success.value = 'Exported to CSV';
    setTimeout(() => success.value = null, 3000);
  }
};

// Add to Favourites
const handleAddToFavourites = async (item) => {
  try {
    const result = await api.favourites.add({
      priceCode: item.RecipeCode,
      description: item.Description,
      unit: item.Unit,
      price: item.Price,
      costCentre: item.CostCentre
    });

    if (result?.success) {
      success.value = `${item.RecipeCode} added to Favourites`;
      setTimeout(() => success.value = null, 3000);
    } else {
      error.value = 'Failed to add to Favourites';
      setTimeout(() => error.value = null, 3000);
    }
  } catch (err) {
    console.error('Error adding to favourites:', err);
    error.value = 'Error adding to Favourites';
    setTimeout(() => error.value = null, 3000);
  }
};

// Add single item to Template
const handleAddSingleToTemplate = async (item) => {
  // Add the single item to selectedRows temporarily
  const originalSelection = [...selectedRows.value];
  selectedRows.value = [item];

  // Call the existing template handler
  await handleAddToTemplate();

  // Restore original selection
  selectedRows.value = originalSelection;
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
              sku: { value: ${JSON.stringify(item.RecipeCode || '')} },
              unit: { value: ${JSON.stringify(item.Unit || '')} },
              'Cost Each': { value: ${JSON.stringify(item.Price ? item.Price.toString() : '0')} },
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
      success.value = `Recipe sent to zzTakeoff: ${item.RecipeCode}`;
      setTimeout(() => success.value = null, 3000);

      // Track in send history
      try {
        await api.sendHistory.add({
          priceCode: item.RecipeCode,
          description: item.Description,
          unit: item.Unit,
          price: item.Price,
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
    loadData(true); // Reset to first page when page size changes
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

/* Hide checkbox for heading rows */
.ag-row.heading-row .ag-selection-checkbox {
  visibility: hidden;
  pointer-events: none;
}

/* Custom grid footer */
.grid-with-custom-footer {
  position: relative;
}

.custom-grid-footer {
  position: absolute;
  bottom: 9px;
  left: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  pointer-events: none;
}

.custom-grid-footer span {
  pointer-events: auto;
}

/* Adjust AG Grid pagination to make room for custom footer */
:deep(.ag-paging-panel) {
  padding-left: 250px !important;
}
</style>
