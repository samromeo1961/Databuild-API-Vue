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
              placeholder="Search by code, description, unit, cost centre, price, or zzType..."
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
            class="btn btn-outline-primary"
            @click="handleAddFromCatalogue"
            :disabled="!selectedTemplate"
            title="Add Items from Catalogue"
          >
            <i class="bi bi-plus-square"></i>
          </button>
          <button
            class="btn btn-outline-warning"
            @click="handleImportFromJob"
            title="Import from Job Database"
          >
            <i class="bi bi-folder-symlink"></i>
          </button>
          <button
            class="btn btn-outline-info"
            @click="handleImportCSV"
            :disabled="!selectedTemplate"
            title="Import from CSV"
          >
            <i class="bi bi-filetype-csv"></i>
          </button>
          <button
            class="btn btn-outline-info"
            @click="handlePasteFromClipboard"
            :disabled="!selectedTemplate"
            title="Paste from Clipboard (Excel)"
          >
            <i class="bi bi-clipboard"></i>
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
            @click="handleDelete"
            :disabled="!selectedTemplate"
            :title="selectedRows.length > 0 ? `Delete ${selectedRows.length} Selected Item(s)` : 'Delete Template'"
          >
            <i class="bi bi-trash"></i>
            <span v-if="selectedRows.length > 0" class="ms-1">({{ selectedRows.length }})</span>
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
          @cell-value-changed="onCellValueChanged"
        />

        <!-- Custom footer info overlaid on AG Grid pagination -->
        <div class="custom-grid-footer">
          <span class="text-muted small">
            <i class="bi bi-folder me-1"></i>
            <template v-if="searchTerm && filteredData.length < (selectedTemplate?.items?.length || 0)">
              Showing: <strong>{{ filteredData.length.toLocaleString() }}</strong> of <strong>{{ (selectedTemplate?.items?.length || 0).toLocaleString() }}</strong> items
            </template>
            <template v-else>
              Total: <strong>{{ filteredData.length.toLocaleString() }}</strong> items
            </template>
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

    <!-- Delete Confirmation Modal -->
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
            <h5 class="modal-title" id="deleteTemplateModalLabel">
              {{ selectedRows.length > 0 ? 'Confirm Delete Items' : 'Confirm Delete Template' }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <template v-if="selectedRows.length > 0">
              Are you sure you want to delete {{ selectedRows.length }} selected item(s) from the template "{{ selectedTemplate?.templateName }}"?
              <div class="mt-3">
                <strong>Items to be deleted:</strong>
                <ul class="mt-2">
                  <li v-for="item in selectedRows.slice(0, 5)" :key="item.PriceCode">
                    {{ item.PriceCode }} - {{ item.description || item.Description }}
                  </li>
                  <li v-if="selectedRows.length > 5">
                    ... and {{ selectedRows.length - 5 }} more
                  </li>
                </ul>
              </div>
            </template>
            <template v-else>
              Are you sure you want to delete the template "{{ selectedTemplate?.templateName }}"?
              This action cannot be undone.
            </template>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" @click="confirmDelete">
              Delete {{ selectedRows.length > 0 ? `${selectedRows.length} Item(s)` : 'Template' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Job Import Modal -->
    <JobImportModal
      ref="jobImportModalRef"
      @template-imported="onTemplateImported"
    />

    <!-- Add from Catalogue Modal -->
    <div
      class="modal fade"
      id="addFromCatalogueModal"
      tabindex="-1"
      aria-labelledby="addFromCatalogueModalLabel"
      aria-hidden="true"
      ref="addFromCatalogueModal"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="addFromCatalogueModalLabel">Add Items from Catalogue</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <!-- Search and Filter Controls -->
            <div class="row mb-3">
              <div class="col-md-4">
                <label class="form-label">Cost Centre</label>
                <select
                  class="form-select"
                  v-model="catalogueCostCentre"
                  @change="onCatalogueCostCentreChange"
                >
                  <option value="">All Cost Centres</option>
                  <option v-for="cc in catalogueCostCentres" :key="cc.Code" :value="cc.Code">
                    {{ cc.Code }} - {{ cc.Name }}
                  </option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Search</label>
                <div class="input-group">
                  <span class="input-group-text">
                    <i class="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control"
                    placeholder="Search by code or description..."
                    v-model="catalogueSearchTerm"
                    @input="onCatalogueSearchChange"
                  />
                  <button
                    v-if="catalogueSearchTerm"
                    class="btn btn-outline-secondary"
                    @click="clearCatalogueSearch"
                  >
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>
              <div class="col-md-2">
                <label class="form-label">&nbsp;</label>
                <button
                  class="btn btn-primary w-100 d-block"
                  @click="loadCatalogueItems"
                  :disabled="loadingCatalogue"
                >
                  <span v-if="loadingCatalogue">
                    <span class="spinner-border spinner-border-sm me-1"></span>
                    Loading...
                  </span>
                  <span v-else>
                    <i class="bi bi-arrow-clockwise me-1"></i>
                    Refresh
                  </span>
                </button>
              </div>
            </div>

            <!-- Catalogue Items Grid -->
            <div v-if="catalogueItems.length > 0" style="height: 400px;">
              <ag-grid-vue
                class="ag-theme-quartz h-100"
                :class="{ 'ag-theme-quartz-dark': isDarkMode }"
                theme="legacy"
                :columnDefs="catalogueColumnDefs"
                :rowData="catalogueItems"
                :defaultColDef="catalogueDefaultColDef"
                :pagination="true"
                :paginationPageSize="50"
                :rowSelection="catalogueRowSelectionConfig"
                @grid-ready="onCatalogueGridReady"
                @selection-changed="onCatalogueSelectionChanged"
              />
            </div>
            <div v-else-if="!loadingCatalogue" class="text-center py-4 text-muted">
              <i class="bi bi-inbox" style="font-size: 3rem;"></i>
              <p class="mt-2">No items found. Try adjusting your search or filters.</p>
            </div>

            <!-- Selected Items Info -->
            <div v-if="catalogueSelectedRows.length > 0" class="mt-3 alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              {{ catalogueSelectedRows.length }} item(s) selected
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button
              type="button"
              class="btn btn-primary"
              @click="confirmAddFromCatalogue"
              :disabled="catalogueSelectedRows.length === 0"
            >
              <i class="bi bi-plus-circle me-1"></i>
              Add {{ catalogueSelectedRows.length }} Item(s) to Template
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Template Editor Modal -->
    <div
      class="modal fade"
      id="templateEditorModal"
      tabindex="-1"
      aria-labelledby="templateEditorModalLabel"
      aria-hidden="true"
      ref="templateEditorModal"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="templateEditorModalLabel">Template Editor</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <!-- Mode Selection -->
            <div class="row mb-3">
              <div class="col-12">
                <div class="btn-group w-100" role="group">
                  <input
                    type="radio"
                    class="btn-check"
                    id="editorModeNew"
                    value="new"
                    v-model="templateEditorMode"
                  />
                  <label class="btn btn-outline-primary" for="editorModeNew">
                    <i class="bi bi-plus-circle me-1"></i>Create New Template
                  </label>

                  <input
                    type="radio"
                    class="btn-check"
                    id="editorModeAdd"
                    value="add"
                    v-model="templateEditorMode"
                    :disabled="!selectedTemplate"
                  />
                  <label class="btn btn-outline-primary" for="editorModeAdd" :class="{ disabled: !selectedTemplate }">
                    <i class="bi bi-folder-plus me-1"></i>Add to Selected Template
                  </label>
                </div>
              </div>
            </div>

            <!-- Template Details (Only for New Template Mode) -->
            <div v-if="templateEditorMode === 'new'" class="row mb-3">
              <div class="col-md-6">
                <label class="form-label">Template Name <span class="text-danger">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  placeholder="Enter template name..."
                  v-model="newTemplateData.name"
                />
              </div>
              <div class="col-md-6">
                <label class="form-label">Description (Optional)</label>
                <input
                  type="text"
                  class="form-control"
                  placeholder="Enter template description..."
                  v-model="newTemplateData.description"
                />
              </div>
            </div>

            <!-- Current Template Info (Only for Add Mode) -->
            <div v-if="templateEditorMode === 'add' && selectedTemplate" class="alert alert-info mb-3">
              <i class="bi bi-info-circle me-2"></i>
              Adding items to: <strong>{{ selectedTemplate.templateName }}</strong>
              ({{ selectedTemplate.items?.length || 0 }} existing items)
            </div>

            <hr />

            <!-- Catalogue Search Section -->
            <h6 class="mb-3">Add Items from Catalogue</h6>
            <div class="row mb-3">
              <div class="col-md-4">
                <label class="form-label">Cost Centre</label>
                <select
                  class="form-select"
                  v-model="editorCatalogueCostCentre"
                  @change="onEditorCatalogueCostCentreChange"
                >
                  <option value="">All Cost Centres</option>
                  <option v-for="cc in editorCatalogueCostCentres" :key="cc.Code" :value="cc.Code">
                    {{ cc.Code }} - {{ cc.Name }}
                  </option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Search</label>
                <div class="input-group">
                  <span class="input-group-text">
                    <i class="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control"
                    placeholder="Search by code or description..."
                    v-model="editorCatalogueSearchTerm"
                    @input="onEditorCatalogueSearchChange"
                  />
                  <button
                    v-if="editorCatalogueSearchTerm"
                    class="btn btn-outline-secondary"
                    @click="clearEditorCatalogueSearch"
                  >
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>
              <div class="col-md-2">
                <label class="form-label">&nbsp;</label>
                <button
                  class="btn btn-primary w-100 d-block"
                  @click="loadEditorCatalogueItems"
                  :disabled="loadingEditorCatalogue"
                >
                  <span v-if="loadingEditorCatalogue">
                    <span class="spinner-border spinner-border-sm me-1"></span>
                    Loading...
                  </span>
                  <span v-else>
                    <i class="bi bi-arrow-clockwise me-1"></i>
                    Search
                  </span>
                </button>
              </div>
            </div>

            <!-- Catalogue Items Grid -->
            <div v-if="editorCatalogueItems.length > 0" style="height: 300px;">
              <ag-grid-vue
                class="ag-theme-quartz h-100"
                :class="{ 'ag-theme-quartz-dark': isDarkMode }"
                theme="legacy"
                :columnDefs="catalogueColumnDefs"
                :rowData="editorCatalogueItems"
                :defaultColDef="catalogueDefaultColDef"
                :pagination="true"
                :paginationPageSize="50"
                :rowSelection="catalogueRowSelectionConfig"
                @grid-ready="onEditorCatalogueGridReady"
                @selection-changed="onEditorCatalogueSelectionChanged"
              />
            </div>
            <div v-else-if="!loadingEditorCatalogue" class="text-center py-3 text-muted">
              <i class="bi bi-search" style="font-size: 2rem;"></i>
              <p class="mt-2">Search catalogue to add items to template</p>
            </div>

            <!-- Selected Items Section -->
            <div v-if="newTemplateData.items.length > 0" class="mt-3">
              <hr />
              <h6>Selected Items ({{ newTemplateData.items.length }})</h6>
              <div class="mt-2" style="max-height: 150px; overflow-y: auto;">
                <div v-for="item in newTemplateData.items" :key="item.PriceCode" class="d-flex align-items-center justify-content-between border-bottom py-2">
                  <div>
                    <strong>{{ item.PriceCode }}</strong> - {{ item.description }}
                    <span class="text-muted ms-2">{{ item.Unit }}</span>
                  </div>
                  <button
                    class="btn btn-sm btn-outline-danger"
                    @click="removeItemFromNewTemplate(item.PriceCode)"
                    title="Remove item"
                  >
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>
            </div>

            <div v-if="editorCatalogueSelectedRows.length > 0" class="mt-3">
              <button
                class="btn btn-success"
                @click="addItemsToNewTemplate"
              >
                <i class="bi bi-plus-circle me-1"></i>
                Add {{ editorCatalogueSelectedRows.length }} Item(s) to Template
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button
              v-if="templateEditorMode === 'new'"
              type="button"
              class="btn btn-primary"
              @click="confirmCreateTemplate"
              :disabled="!newTemplateData.name || newTemplateData.items.length === 0"
            >
              <i class="bi bi-check-circle me-1"></i>
              Create Template ({{ newTemplateData.items.length }} items)
            </button>
            <button
              v-if="templateEditorMode === 'add'"
              type="button"
              class="btn btn-primary"
              @click="confirmAddToTemplate"
              :disabled="newTemplateData.items.length === 0"
            >
              <i class="bi bi-plus-circle me-1"></i>
              Add {{ newTemplateData.items.length }} Item(s) to Template
            </button>
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
import { useColumnNames } from '../../composables/useColumnNames';
import { useRouter } from 'vue-router';
import { Modal } from 'bootstrap';
import draggable from 'vuedraggable';
import JobImportModal from './JobImportModal.vue';

const api = useElectronAPI();
const columnNamesComposable = useColumnNames();
const router = useRouter();
const theme = inject('theme');
const isMaximized = inject('webviewMaximized');

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

// Add from Catalogue Modal
const addFromCatalogueModal = ref(null);
let addFromCatalogueModalInstance = null;
const catalogueSearchTerm = ref('');
const catalogueCostCentre = ref('');
const catalogueCostCentres = ref([]);
const catalogueItems = ref([]);
const catalogueSelectedRows = ref([]);
const catalogueGridApi = ref(null);
const loadingCatalogue = ref(false);

// Job Import Modal
const jobImportModalRef = ref(null);
let catalogueSearchDebounce = null;

// Template Editor Modal
const templateEditorModal = ref(null);
let templateEditorModalInstance = null;
const templateEditorMode = ref('new'); // 'new' or 'add'
const newTemplateData = ref({
  name: '',
  description: '',
  items: []
});
const editorCatalogueSearchTerm = ref('');
const editorCatalogueCostCentre = ref('');
const editorCatalogueCostCentres = ref([]);
const editorCatalogueItems = ref([]);
const editorCatalogueSelectedRows = ref([]);
const editorCatalogueGridApi = ref(null);
const loadingEditorCatalogue = ref(false);
let editorCatalogueSearchDebounce = null;

// Check if dark mode
const isDarkMode = computed(() => {
  return theme && theme.value === 'dark';
});

// Filtered data based on search (advanced multi-word search)
const filteredData = computed(() => {
  if (!selectedTemplate.value || !selectedTemplate.value.items) return [];

  if (!searchTerm.value) return selectedTemplate.value.items;

  // Split search term into words and filter out empty strings
  const searchWords = searchTerm.value.trim().split(/\s+/).filter(word => word.length > 0);

  if (searchWords.length === 0) return selectedTemplate.value.items;

  return selectedTemplate.value.items.filter(item => {
    // Normalize item fields for searching
    const priceCode = (item.PriceCode || '').toLowerCase();
    const description = (item.description || item.Description || '').toLowerCase();
    const unit = (item.Unit || '').toLowerCase();
    const costCentre = (item.CostCentre || '').toLowerCase();
    const price = (item.Price || '').toString().toLowerCase();
    const zzType = (item.zzType || '').toLowerCase();

    if (searchWords.length === 1) {
      // Single word: search in any field
      const word = searchWords[0].toLowerCase();
      return priceCode.includes(word) ||
             description.includes(word) ||
             unit.includes(word) ||
             costCentre.includes(word) ||
             price.includes(word) ||
             zzType.includes(word);
    } else {
      // Multiple words: ALL words must be in description OR ALL words must be in priceCode
      const allWordsInDescription = searchWords.every(word =>
        description.includes(word.toLowerCase())
      );
      const allWordsInPriceCode = searchWords.every(word =>
        priceCode.includes(word.toLowerCase())
      );

      return allWordsInDescription || allWordsInPriceCode;
    }
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
    editable: true,
    singleClickEdit: true,
    valueGetter: (params) => {
      return params.data.description || params.data.Description || '';
    },
    valueSetter: (params) => {
      params.data.description = params.newValue;
      return true;
    }
  },
  {
    field: 'Unit',
    headerName: 'Unit',
    width: 80,
    filter: 'agTextColumnFilter',
    sortable: true,
    editable: true,
    singleClickEdit: true
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    width: 100,
    filter: 'agNumberColumnFilter',
    sortable: true,
    editable: true,
    singleClickEdit: true,
    valueFormatter: (params) => {
      if (params.value == null) return '-';
      return params.value.toString();
    },
    valueParser: (params) => {
      return parseFloat(params.newValue) || 1;
    },
    cellStyle: { textAlign: 'right' }
  },
  {
    field: 'Price',
    headerName: 'Price',
    width: 120,
    filter: 'agNumberColumnFilter',
    sortable: true,
    editable: true,
    singleClickEdit: true,
    valueFormatter: (params) => {
      if (params.value == null) return '-';
      return `$${params.value.toFixed(2)}`;
    },
    valueParser: (params) => {
      const cleaned = String(params.newValue).replace(/[$,]/g, '');
      return parseFloat(cleaned) || 0;
    },
    cellStyle: { textAlign: 'right' }
  },
  {
    field: 'CostCentre',
    headerName: 'Cost Centre',
    width: 130,
    filter: 'agTextColumnFilter',
    sortable: true,
    editable: true,
    singleClickEdit: true
  },
  {
    field: 'zzType',
    headerName: 'zzType',
    width: 100,
    filter: 'agTextColumnFilter',
    sortable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: ['area', 'linear', 'segment', 'count']
    },
    editable: true,
    singleClickEdit: true,
    tooltipValueGetter: (params) => params.value
  },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 170,
    minWidth: 170,
    pinned: 'right',
    cellRenderer: (params) => {
      return `
        <div class="action-buttons d-flex gap-1 justify-content-center">
          <button class="btn btn-sm btn-warning" data-action="zztakeoff" title="Send to zzTakeoff">
            <i class="bi bi-send" style="color: #000;"></i>
          </button>
          <button class="btn btn-sm btn-danger" data-action="delete" title="Delete Item">
            <i class="bi bi-trash"></i>
          </button>
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

// Catalogue Modal - Column definitions
const catalogueColumnDefs = ref([
  {
    field: 'ItemCode',
    headerName: 'Code',
    width: 120,
    pinned: 'left',
    sortable: true
  },
  {
    field: 'Description',
    headerName: 'Description',
    flex: 1,
    minWidth: 300,
    sortable: true
  },
  {
    field: 'Unit',
    headerName: 'Unit',
    width: 80,
    sortable: true
  },
  {
    field: 'LatestPrice',
    headerName: 'Price',
    width: 120,
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
    sortable: true
  },
  {
    field: 'CostCentreName',
    headerName: 'Cost Centre Name',
    width: 200,
    sortable: true
  }
]);

// Catalogue Modal - Default column properties
const catalogueDefaultColDef = {
  resizable: true,
  sortable: false,
  filter: false
};

// Catalogue Modal - Row selection configuration
const catalogueRowSelectionConfig = {
  mode: 'multiRow',
  checkboxes: true,
  headerCheckbox: true,
  enableClickSelection: false
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

          // Resolve zzType for all items in the refreshed template
          if (selectedTemplate.value && selectedTemplate.value.items) {
            await resolveZzTypesForItems(selectedTemplate.value.items);

            // Force grid refresh if grid is ready
            if (gridApi.value) {
              gridApi.value.refreshCells({ force: true });
            }
          }
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

// Resolve zzType for template items
const resolveZzTypesForItems = async (items) => {
  try {
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
  } catch (err) {
    console.error('[zzType] Error resolving zzTypes:', err);
    // Set default for all items on error
    items.forEach(item => {
      item.zzType = 'count';
    });
  }
};

// Template change handler
const onTemplateChange = async () => {
  if (selectedTemplateId.value) {
    selectedTemplate.value = templates.value.find(t => t.id === selectedTemplateId.value);

    // Resolve zzType for all items in the template
    if (selectedTemplate.value && selectedTemplate.value.items) {
      await resolveZzTypesForItems(selectedTemplate.value.items);

      // Force grid refresh by triggering reactivity
      if (gridApi.value) {
        gridApi.value.refreshCells({ force: true });
      }
    }

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
  }, 500);
};

// Clear search
const clearSearch = () => {
  searchTerm.value = '';
};

// Grid ready handler
const onGridReady = (params) => {
  gridApi.value = params.api;

  // Add click event listener for row actions
  params.api.addEventListener('cellClicked', (event) => {
    // Check both the target and its parent for data-action
    const target = event.event.target;
    const action = target.dataset.action || target.closest('[data-action]')?.dataset.action;

    if (action === 'zztakeoff') {
      handleSendSingleItemToZzTakeoff(event.data);
    } else if (action === 'delete') {
      handleDeleteItem(event.data);
    }
  });

  loadColumnState();
};

// Selection changed handler
const onSelectionChanged = () => {
  if (gridApi.value) {
    selectedRows.value = gridApi.value.getSelectedRows();
  }
};

// Cell value changed handler (for inline editing)
const onCellValueChanged = async (event) => {
  const field = event.colDef.field;
  const data = event.data;
  const newValue = event.newValue;
  const oldValue = event.oldValue;

  if (!selectedTemplate.value) return;

  try {
    // For zzType, also save override to zzType store
    if (field === 'zzType') {
      await api.zzTypeStore.set(data.PriceCode, newValue.toLowerCase());
      console.log('[zzType] Saved override:', data.PriceCode, '→', newValue.toLowerCase());
    }

    // Update the item in the template data
    const updatedItems = (selectedTemplate.value.items || []).map(item => {
      if (item.PriceCode === data.PriceCode) {
        return {
          ...item,
          [field]: newValue
        };
      }
      return item;
    });

    // Normalize all items to ensure they're serializable
    const normalizedItems = updatedItems.map(item => ({
      PriceCode: String(item.PriceCode),
      description: String(item.description || ''),
      Unit: String(item.Unit || ''),
      Price: Number(item.Price || 0),
      CostCentre: String(item.CostCentre || ''),
      zzType: String(item.zzType || 'count'),
      quantity: Number(item.quantity || 1)
    }));

    // Save the updated template
    const templateToSave = {
      id: String(selectedTemplate.value.id),
      templateName: String(selectedTemplate.value.templateName),
      description: String(selectedTemplate.value.description || ''),
      items: normalizedItems,
      dateCreated: String(selectedTemplate.value.dateCreated),
      dateModified: new Date().toISOString()
    };

    await api.templatesStore.save(templateToSave);

    // Reload templates to refresh
    await loadTemplates();

    console.log(`[Template] Updated ${field} for ${data.PriceCode}: ${oldValue} → ${newValue}`);
  } catch (err) {
    console.error('Error updating template item:', err);
    error.value = `Failed to update ${field}`;
    // Revert the change in the grid
    event.node.setDataValue(field, oldValue);
  }
};

// Handle new template
const handleNewTemplate = async () => {
  // Set mode based on whether a template is selected
  templateEditorMode.value = selectedTemplate.value ? 'add' : 'new';

  // Reset template data
  newTemplateData.value = {
    name: '',
    description: '',
    items: []
  };
  editorCatalogueSearchTerm.value = '';
  editorCatalogueCostCentre.value = '';
  editorCatalogueItems.value = [];
  editorCatalogueSelectedRows.value = [];

  // Open modal
  if (templateEditorModalInstance) {
    templateEditorModalInstance.show();
  }

  // Load cost centres
  await loadEditorCatalogueCostCentres();
};

// ===== Template Editor Modal Functions =====

// Load editor catalogue cost centres
const loadEditorCatalogueCostCentres = async () => {
  try {
    const response = await api.costCentres.getList({});
    if (response?.success) {
      editorCatalogueCostCentres.value = response.data || [];
      console.log(`Loaded ${editorCatalogueCostCentres.value.length} cost centres for editor`);
    }
  } catch (err) {
    console.error('Error loading editor cost centres:', err);
  }
};

// Load editor catalogue items
const loadEditorCatalogueItems = async () => {
  loadingEditorCatalogue.value = true;

  try {
    const params = {
      limit: 999999,
      offset: 0,
      showArchived: false
    };

    if (editorCatalogueSearchTerm.value) {
      params.searchTerm = editorCatalogueSearchTerm.value;
    }

    if (editorCatalogueCostCentre.value) {
      params.costCentre = editorCatalogueCostCentre.value;
    }

    const response = await api.catalogue.getItems(params);

    if (response?.success) {
      editorCatalogueItems.value = response.data || [];
    } else {
      error.value = 'Failed to load catalogue items';
      editorCatalogueItems.value = [];
    }
  } catch (err) {
    console.error('Error loading editor catalogue items:', err);
    error.value = 'Error loading catalogue items';
    editorCatalogueItems.value = [];
  } finally {
    loadingEditorCatalogue.value = false;
  }
};

// Editor catalogue search change handler with debounce
const onEditorCatalogueSearchChange = () => {
  clearTimeout(editorCatalogueSearchDebounce);
  editorCatalogueSearchDebounce = setTimeout(() => {
    loadEditorCatalogueItems();
  }, 500);
};

// Clear editor catalogue search
const clearEditorCatalogueSearch = () => {
  editorCatalogueSearchTerm.value = '';
  loadEditorCatalogueItems();
};

// Editor catalogue cost centre change handler
const onEditorCatalogueCostCentreChange = () => {
  loadEditorCatalogueItems();
};

// Editor catalogue grid ready handler
const onEditorCatalogueGridReady = (params) => {
  editorCatalogueGridApi.value = params.api;
};

// Editor catalogue selection changed handler
const onEditorCatalogueSelectionChanged = () => {
  if (editorCatalogueGridApi.value) {
    editorCatalogueSelectedRows.value = editorCatalogueGridApi.value.getSelectedRows();
  }
};

// Add items from catalogue grid to new template items array
const addItemsToNewTemplate = () => {
  if (editorCatalogueSelectedRows.value.length === 0) return;

  // Map selected rows to template items format
  const itemsToAdd = editorCatalogueSelectedRows.value.map(row => ({
    PriceCode: String(row.ItemCode),
    description: String(row.Description),
    Unit: String(row.Unit || ''),
    Price: Number(row.LatestPrice || 0),
    CostCentre: String(row.CostCentre || ''),
    quantity: 1
  }));

  // Add to items array (avoiding duplicates)
  const existingCodes = newTemplateData.value.items.map(item => item.PriceCode);
  const newItems = itemsToAdd.filter(item => !existingCodes.includes(item.PriceCode));

  if (newItems.length > 0) {
    newTemplateData.value.items = [...newTemplateData.value.items, ...newItems];
    success.value = `Added ${newItems.length} item(s) to selection`;
    setTimeout(() => success.value = null, 3000);
  } else {
    error.value = 'All selected items are already in the template';
    setTimeout(() => error.value = null, 3000);
  }

  // Clear grid selections
  if (editorCatalogueGridApi.value) {
    editorCatalogueGridApi.value.deselectAll();
  }
  editorCatalogueSelectedRows.value = [];
};

// Remove item from new template items array
const removeItemFromNewTemplate = (priceCode) => {
  newTemplateData.value.items = newTemplateData.value.items.filter(item => item.PriceCode !== priceCode);
};

// Confirm create new template
const confirmCreateTemplate = async () => {
  if (!newTemplateData.value.name || newTemplateData.value.items.length === 0) {
    error.value = 'Template name and at least one item are required';
    return;
  }

  try {
    // Create new template
    const templateToSave = {
      id: String(Date.now()), // Generate unique ID
      templateName: String(newTemplateData.value.name),
      description: String(newTemplateData.value.description || ''),
      items: newTemplateData.value.items.map(item => ({
        PriceCode: String(item.PriceCode),
        description: String(item.description),
        Unit: String(item.Unit || ''),
        Price: Number(item.Price || 0),
        CostCentre: String(item.CostCentre || ''),
        quantity: Number(item.quantity || 1)
      })),
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString()
    };

    await api.templatesStore.save(templateToSave);

    success.value = `Template "${newTemplateData.value.name}" created successfully with ${newTemplateData.value.items.length} item(s)`;
    setTimeout(() => success.value = null, 3000);

    // Hide modal
    if (templateEditorModalInstance) {
      templateEditorModalInstance.hide();
    }

    // Reload templates
    await loadTemplates();

    // Select the newly created template
    selectedTemplateId.value = templateToSave.id;
    await onTemplateChange();
  } catch (err) {
    console.error('Error creating template:', err);
    error.value = 'Failed to create template';
  }
};

// Confirm add items to existing template
const confirmAddToTemplate = async () => {
  if (!selectedTemplate.value || newTemplateData.value.items.length === 0) {
    error.value = 'No template selected or no items to add';
    return;
  }

  try {
    // Get existing items
    const existingItems = (selectedTemplate.value.items || []).map(item => ({
      PriceCode: String(item.PriceCode),
      description: String(item.description || item.Description),
      Unit: String(item.Unit || ''),
      Price: Number(item.Price || 0),
      CostCentre: String(item.CostCentre || ''),
      quantity: Number(item.quantity || 1)
    }));

    // Filter out duplicates from new items
    const existingCodes = existingItems.map(item => item.PriceCode);
    const newItems = newTemplateData.value.items
      .filter(item => !existingCodes.includes(item.PriceCode))
      .map(item => ({
        PriceCode: String(item.PriceCode),
        description: String(item.description),
        Unit: String(item.Unit || ''),
        Price: Number(item.Price || 0),
        CostCentre: String(item.CostCentre || ''),
        quantity: Number(item.quantity || 1)
      }));

    if (newItems.length === 0) {
      error.value = 'All selected items are already in the template';
      return;
    }

    // Create updated template
    const templateToSave = {
      id: String(selectedTemplate.value.id),
      templateName: String(selectedTemplate.value.templateName),
      description: String(selectedTemplate.value.description || ''),
      items: [...existingItems, ...newItems],
      dateCreated: String(selectedTemplate.value.dateCreated),
      dateModified: new Date().toISOString()
    };

    await api.templatesStore.save(templateToSave);

    success.value = `Added ${newItems.length} item(s) to template "${selectedTemplate.value.templateName}"`;
    setTimeout(() => success.value = null, 3000);

    // Hide modal
    if (templateEditorModalInstance) {
      templateEditorModalInstance.hide();
    }

    // Reload templates to refresh the current template
    await loadTemplates();
  } catch (err) {
    console.error('Error adding items to template:', err);
    error.value = 'Failed to add items to template';
  }
};

// Handle delete item from template
const handleDeleteItem = async (item) => {
  if (!selectedTemplate.value || !item) return;

  // Confirm deletion
  if (!confirm(`Are you sure you want to remove "${item.description || item.Description}" from this template?`)) {
    return;
  }

  try {
    // Filter out the item by PriceCode and serialize to plain objects
    const updatedItems = (selectedTemplate.value.items || [])
      .filter(i => i.PriceCode !== item.PriceCode)
      .map(i => ({
        PriceCode: String(i.PriceCode),
        description: String(i.description || i.Description),
        Unit: String(i.Unit || ''),
        Price: Number(i.Price || 0),
        CostCentre: String(i.CostCentre || ''),
        quantity: Number(i.quantity || 1)
      }));

    // Create updated template
    const templateToSave = {
      id: String(selectedTemplate.value.id),
      templateName: String(selectedTemplate.value.templateName),
      description: String(selectedTemplate.value.description || ''),
      items: updatedItems,
      dateCreated: String(selectedTemplate.value.dateCreated),
      dateModified: new Date().toISOString()
    };

    await api.templatesStore.save(templateToSave);

    success.value = `Removed "${item.description || item.Description}" from template`;
    setTimeout(() => success.value = null, 3000);

    // Reload templates to refresh the current template
    await loadTemplates();
  } catch (err) {
    console.error('Error deleting item from template:', err);
    error.value = 'Failed to delete item from template';
  }
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
    // Serialize items to ensure they can be cloned for IPC
    const serializedItems = selectedTemplate.value.items.map(item => ({
      PriceCode: String(item.PriceCode || ''),
      description: String(item.description || ''),
      Unit: String(item.Unit || ''),
      Price: Number(item.Price || 0),
      CostCentre: String(item.CostCentre || ''),
      zzType: String(item.zzType || 'count'),
      quantity: Number(item.quantity || 1)
    }));

    const response = await api.templates.updatePrices(selectedTemplate.value.id, {
      items: serializedItems
    });

    if (response?.success) {
      // Update the template with new prices - normalize items to ensure they're serializable
      const normalizedItems = (response.updatedItems || []).map(item => ({
        PriceCode: String(item.PriceCode),
        description: String(item.description),
        Unit: String(item.Unit || ''),
        Price: Number(item.Price || 0),
        CostCentre: String(item.CostCentre || ''),
        zzType: String(item.zzType || 'count'),
        quantity: Number(item.quantity || 1)
      }));

      const updatedTemplate = {
        id: String(selectedTemplate.value.id),
        templateName: String(selectedTemplate.value.templateName),
        description: String(selectedTemplate.value.description || ''),
        items: normalizedItems,
        dateCreated: String(selectedTemplate.value.dateCreated),
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

// Handle delete - shows modal for either deleting items or entire template
const handleDelete = () => {
  if (deleteTemplateModalInstance) {
    deleteTemplateModalInstance.show();
  }
};

// Confirm delete - routes to appropriate delete function
const confirmDelete = async () => {
  if (selectedRows.value.length > 0) {
    // Delete selected items
    await confirmDeleteItems();
  } else {
    // Delete entire template
    await confirmDeleteTemplate();
  }
};

// Confirm delete selected items
const confirmDeleteItems = async () => {
  if (!selectedTemplate.value || selectedRows.value.length === 0) return;

  try {
    // Get PriceCodes of items to delete
    const priceCodesToDelete = selectedRows.value.map(item => item.PriceCode);

    // Filter out the items
    const updatedItems = (selectedTemplate.value.items || [])
      .filter(item => !priceCodesToDelete.includes(item.PriceCode))
      .map(item => ({
        PriceCode: String(item.PriceCode),
        description: String(item.description),
        Unit: String(item.Unit || ''),
        Price: Number(item.Price || 0),
        CostCentre: String(item.CostCentre || ''),
        quantity: Number(item.quantity || 1)
      }));

    // Create updated template
    const templateToSave = {
      id: String(selectedTemplate.value.id),
      templateName: String(selectedTemplate.value.templateName),
      description: String(selectedTemplate.value.description || ''),
      items: updatedItems,
      dateCreated: String(selectedTemplate.value.dateCreated),
      dateModified: new Date().toISOString()
    };

    await api.templatesStore.save(templateToSave);

    // Hide modal
    if (deleteTemplateModalInstance) {
      deleteTemplateModalInstance.hide();
    }

    success.value = `Deleted ${selectedRows.value.length} item(s) from template "${selectedTemplate.value.templateName}"`;
    setTimeout(() => success.value = null, 3000);

    // Reload templates to refresh the current template
    await loadTemplates();

    // Clear selections
    if (gridApi.value) {
      gridApi.value.deselectAll();
    }
  } catch (err) {
    console.error('Error deleting items from template:', err);
    error.value = 'Failed to delete items from template';
  }
};

// Confirm delete entire template
const confirmDeleteTemplate = async () => {
  if (!selectedTemplate.value) return;

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
};

// ===== Add from Catalogue Modal Functions =====

// Handle add from catalogue button
const handleAddFromCatalogue = async () => {
  if (!selectedTemplate.value) return;

  // Open modal
  if (addFromCatalogueModalInstance) {
    addFromCatalogueModalInstance.show();
  }

  // Load cost centres and initial catalogue items
  await loadCatalogueCostCentres();
  await loadCatalogueItems();
};

// Handle Import from Job
const handleImportFromJob = () => {
  if (jobImportModalRef.value) {
    jobImportModalRef.value.show();
  }
};

// Handle template imported from job
const onTemplateImported = (template) => {
  // Refresh templates list
  loadTemplates();

  // Select the newly created template
  if (template && template.id) {
    selectedTemplateId.value = template.id;
    onTemplateChange();
  }

  // Show success message
  success.value = `Template "${template.templateName}" imported successfully from job!`;
  setTimeout(() => {
    success.value = null;
  }, 5000);
};

// Handle Import from CSV
const handleImportCSV = () => {
  if (!selectedTemplate.value) return;

  // Create file input element
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const items = parseCSV(text);

      if (items.length === 0) {
        error.value = 'No valid items found in CSV file';
        return;
      }

      await bulkImportItems(items);
      success.value = `Successfully imported ${items.length} items from CSV`;
      setTimeout(() => success.value = null, 3000);
    } catch (err) {
      console.error('Error importing CSV:', err);
      error.value = `Failed to import CSV: ${err.message}`;
    }
  };
  input.click();
};

// Handle Paste from Clipboard
const handlePasteFromClipboard = async () => {
  if (!selectedTemplate.value) return;

  try {
    const text = await navigator.clipboard.readText();

    if (!text || text.trim() === '') {
      error.value = 'Clipboard is empty';
      return;
    }

    // Try to parse as tab-separated (Excel) or CSV
    const items = parseClipboardData(text);

    if (items.length === 0) {
      error.value = 'No valid items found in clipboard data';
      return;
    }

    await bulkImportItems(items);
    success.value = `Successfully imported ${items.length} items from clipboard`;
    setTimeout(() => success.value = null, 3000);
  } catch (err) {
    console.error('Error pasting from clipboard:', err);
    error.value = `Failed to paste: ${err.message}`;
  }
};

// Parse CSV text
const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return []; // Need at least header and one row

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const items = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const item = {};

    headers.forEach((header, index) => {
      item[header.toLowerCase()] = values[index] || '';
    });

    // Map to template item structure
    if (item.pricecode || item.code || item.sku) {
      items.push({
        PriceCode: item.pricecode || item.code || item.sku || '',
        description: item.description || item.name || '',
        Unit: item.unit || '',
        Price: parseFloat(item.price || item['cost each'] || 0),
        CostCentre: item.costcentre || item['cost centre'] || '',
        zzType: item.zztype || item.type || 'count'
      });
    }
  }

  return items;
};

// Parse clipboard data (tab or comma separated)
// Parse a single line respecting quoted fields and escaped characters
const parseLine = (line, delimiter) => {
  const values = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote within quoted field
        current += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }

    if (!inQuotes && char === delimiter) {
      // End of field
      values.push(current.trim());
      current = '';
      i++;
      continue;
    }

    // Regular character
    current += char;
    i++;
  }

  // Add last field
  values.push(current.trim());
  return values;
};

const parseClipboardData = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 1) return [];

  // Detect delimiter (tab for Excel, comma for CSV)
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const items = [];

  // Check if first line looks like headers
  const firstLine = parseLine(lines[0], delimiter);
  const hasHeaders = firstLine.some(v =>
    v.toLowerCase().includes('code') ||
    v.toLowerCase().includes('description') ||
    v.toLowerCase().includes('price')
  );

  const startIndex = hasHeaders ? 1 : 0;
  const headers = hasHeaders ? firstLine.map(h => h.toLowerCase()) :
    ['pricecode', 'description', 'unit', 'price', 'costcentre', 'zztype'];

  for (let i = startIndex; i < lines.length; i++) {
    const values = parseLine(lines[i], delimiter);
    const item = {};

    headers.forEach((header, index) => {
      item[header] = values[index] || '';
    });

    // Map to template item structure
    if (item.pricecode || item.code || item.sku || values[0]) {
      items.push({
        PriceCode: item.pricecode || item.code || item.sku || values[0] || '',
        description: item.description || item.name || values[1] || '',
        Unit: item.unit || values[2] || '',
        Price: parseFloat(item.price || item['cost each'] || values[3] || 0),
        CostCentre: item.costcentre || item['cost centre'] || values[4] || '',
        zzType: item.zztype || item.type || values[5] || 'count'
      });
    }
  }

  return items;
};

// Bulk import items into current template
const bulkImportItems = async (items) => {
  if (!selectedTemplate.value || items.length === 0) return;

  try {
    // Get existing items
    const existingItems = selectedTemplate.value.items || [];
    const existingCodes = new Set(existingItems.map(item => item.PriceCode));

    // Filter out duplicates
    const newItems = items.filter(item => !existingCodes.has(item.PriceCode));

    if (newItems.length === 0) {
      error.value = 'All items already exist in this template';
      return;
    }

    // Normalize new items to match expected format
    const itemsToAdd = newItems.map(item => ({
      PriceCode: String(item.PriceCode),
      description: String(item.description),
      Unit: String(item.Unit || ''),
      Price: Number(item.Price || 0),
      CostCentre: String(item.CostCentre || ''),
      zzType: String(item.zzType || 'count'),
      quantity: Number(item.quantity || 1)
    }));

    // Normalize existing items to ensure they're serializable
    const normalizedExistingItems = existingItems.map(item => ({
      PriceCode: String(item.PriceCode),
      description: String(item.description),
      Unit: String(item.Unit || ''),
      Price: Number(item.Price || 0),
      CostCentre: String(item.CostCentre || ''),
      zzType: String(item.zzType || 'count'),
      quantity: Number(item.quantity || 1)
    }));

    // Create updated template
    const templateToSave = {
      id: String(selectedTemplate.value.id),
      templateName: String(selectedTemplate.value.templateName),
      description: String(selectedTemplate.value.description || ''),
      items: [...normalizedExistingItems, ...itemsToAdd],
      dateCreated: String(selectedTemplate.value.dateCreated),
      dateModified: new Date().toISOString()
    };

    await api.templatesStore.save(templateToSave);

    // Reload templates to refresh the current template
    await loadTemplates();

    const skipped = items.length - newItems.length;
    if (skipped > 0) {
      success.value += ` (${skipped} duplicate items skipped)`;
    }
  } catch (err) {
    throw err;
  }
};

// Load catalogue cost centres
const loadCatalogueCostCentres = async () => {
  try {
    const response = await api.costCentres.getList({});
    if (response?.success) {
      catalogueCostCentres.value = response.data || [];
      console.log(`Loaded ${catalogueCostCentres.value.length} cost centres for add modal`);
    }
  } catch (err) {
    console.error('Error loading cost centres:', err);
  }
};

// Load catalogue items
const loadCatalogueItems = async () => {
  loadingCatalogue.value = true;

  try {
    const params = {
      limit: 999999,
      offset: 0,
      showArchived: false
    };

    if (catalogueSearchTerm.value) {
      params.searchTerm = catalogueSearchTerm.value;
    }

    if (catalogueCostCentre.value) {
      params.costCentre = catalogueCostCentre.value;
    }

    const response = await api.catalogue.getItems(params);

    if (response?.success) {
      catalogueItems.value = response.data || [];
    } else {
      error.value = 'Failed to load catalogue items';
      catalogueItems.value = [];
    }
  } catch (err) {
    console.error('Error loading catalogue items:', err);
    error.value = 'Error loading catalogue items';
    catalogueItems.value = [];
  } finally {
    loadingCatalogue.value = false;
  }
};

// Catalogue search change handler with debounce
const onCatalogueSearchChange = () => {
  clearTimeout(catalogueSearchDebounce);
  catalogueSearchDebounce = setTimeout(() => {
    loadCatalogueItems();
  }, 500);
};

// Clear catalogue search
const clearCatalogueSearch = () => {
  catalogueSearchTerm.value = '';
  loadCatalogueItems();
};

// Catalogue cost centre change handler
const onCatalogueCostCentreChange = () => {
  loadCatalogueItems();
};

// Catalogue grid ready handler
const onCatalogueGridReady = (params) => {
  catalogueGridApi.value = params.api;
};

// Catalogue selection changed handler
const onCatalogueSelectionChanged = () => {
  if (catalogueGridApi.value) {
    catalogueSelectedRows.value = catalogueGridApi.value.getSelectedRows();
  }
};

// Confirm add from catalogue
const confirmAddFromCatalogue = async () => {
  if (!selectedTemplate.value || catalogueSelectedRows.value.length === 0) return;

  try {
    const itemsToAdd = catalogueSelectedRows.value.map(row => ({
      PriceCode: String(row.ItemCode),
      description: String(row.Description),
      Unit: String(row.Unit || ''),
      Price: Number(row.LatestPrice || 0),
      CostCentre: String(row.CostCentre || ''),
      quantity: 1
    }));

    // Get existing items
    const existingItems = (selectedTemplate.value.items || []).map(item => ({
      PriceCode: String(item.PriceCode),
      description: String(item.description),
      Unit: String(item.Unit || ''),
      Price: Number(item.Price || 0),
      CostCentre: String(item.CostCentre || ''),
      quantity: Number(item.quantity || 1)
    }));

    // Create updated template
    const templateToSave = {
      id: String(selectedTemplate.value.id),
      templateName: String(selectedTemplate.value.templateName),
      description: String(selectedTemplate.value.description || ''),
      items: [...existingItems, ...itemsToAdd],
      dateCreated: String(selectedTemplate.value.dateCreated),
      dateModified: new Date().toISOString()
    };

    await api.templatesStore.save(templateToSave);

    success.value = `Added ${catalogueSelectedRows.value.length} item(s) to template "${selectedTemplate.value.templateName}"`;
    setTimeout(() => success.value = null, 3000);

    // Hide modal
    if (addFromCatalogueModalInstance) {
      addFromCatalogueModalInstance.hide();
    }

    // Reload templates to refresh the current template
    await loadTemplates();

    // Clear selections
    catalogueSelectedRows.value = [];
    catalogueSearchTerm.value = '';
    catalogueCostCentre.value = '';
  } catch (err) {
    console.error('Error adding items to template:', err);
    error.value = 'Failed to add items to template';
  }
};

// ===== zzTakeoff Integration =====

// Send to zzTakeoff (real integration)
const handleSendToZzTakeoff = async () => {
  if (selectedRows.value.length === 0) return;

  try {
    console.log('[zzTakeoff] Preparing to send items:', selectedRows.value);

    // Check if zzTakeoff window is already open
    const windowStatus = await api.zzTakeoffWindow.isOpen();

    if (!windowStatus?.isOpen) {
      // First time - open window and ask user to login
      console.log('[zzTakeoff] Opening zzTakeoff window for login...');
      const openResult = await api.zzTakeoffWindow.open('https://www.zztakeoff.com/login');

      if (openResult?.success) {
        success.value = 'zzTakeoff window opened. Please login to zzTakeoff, then click "Send to zzTakeoff" again to send the items.';
        setTimeout(() => success.value = null, 5000);
      } else {
        error.value = 'Failed to open zzTakeoff window';
      }
      return;
    }

    // Window is already open - focus it without navigating (preserve login session)
    console.log('[zzTakeoff] zzTakeoff window already open, focusing and sending data...');
    await api.zzTakeoffWindow.open(); // Focus without URL parameter

    // Send the first item (single item mode)
    const row = selectedRows.value[0];

    // Use the item's zzType if already resolved, otherwise use default
    const zzType = row.zzType || 'count';
    console.log(`[zzType] Using type for ${row.PriceCode}: ${zzType}`);

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
            type: ${JSON.stringify(zzType)},
            properties: {
              name: {
                value: ${JSON.stringify(row.description || row.Description || '')}
              },
              sku: {
                value: ${JSON.stringify(row.PriceCode || '')}
              },
              unit: {
                value: ${JSON.stringify(row.Unit || '')}
              },
              'cost each': {
                value: ${JSON.stringify(row.Price ? row.Price.toString() : '0')}
              },
              'cost centre': {
                value: ${JSON.stringify(row.CostCentre || '')}
              }
            }
          });

          return { success: true, note: 'Router.go() then startTakeoffWithProperties executed' };
        } catch (error) {
          return { success: false, error: error.message, stack: error.stack };
        }
      })()
    `;

    console.log('[zzTakeoff] Executing Router.go() + startTakeoffWithProperties (Router.go FIRST)');

    // Execute the JavaScript in the zzTakeoff window
    const result = await api.zzTakeoffWindow.executeJavaScript(jsCode);

    console.log('[zzTakeoff] JavaScript execution result:', result);

    // Only add to send history if successful
    if (result?.success || result?.result?.success) {
      await api.sendHistory.add({
        items: [{
          code: row.PriceCode,
          description: row.description || row.Description,
          unit: row.Unit,
          price: row.Price,
          quantity: row.quantity || 1
        }],
        project: 'Template: ' + selectedTemplate.value.templateName,
        status: 'Success',
        sentAt: new Date().toISOString(),
        itemCount: 1
      });

      success.value = `Sent "${row.description || row.Description}" to zzTakeoff`;
      setTimeout(() => success.value = null, 3000);
    } else {
      error.value = 'Failed to send item to zzTakeoff';
    }

  } catch (err) {
    console.error('Error sending to zzTakeoff:', err);
    error.value = `Failed to send item to zzTakeoff: ${err.message}`;
  }
};

// Send single item to zzTakeoff
const handleSendSingleItemToZzTakeoff = async (item) => {
  selectedRows.value = [item];
  await handleSendToZzTakeoff();
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

        // Resolve zzType for all items in the template
        if (selectedTemplate.value && selectedTemplate.value.items) {
          await resolveZzTypesForItems(selectedTemplate.value.items);

          // Force grid refresh if grid is ready
          if (gridApi.value) {
            gridApi.value.refreshCells({ force: true });
          }
        }
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

  if (addFromCatalogueModal.value) {
    addFromCatalogueModalInstance = new Modal(addFromCatalogueModal.value);
  }

  if (columnManagementModalRef.value) {
    columnManagementModal = new Modal(columnManagementModalRef.value);
  }

  if (renameColumnModalRef.value) {
    renameColumnModal = new Modal(renameColumnModalRef.value);
  }

  if (templateEditorModal.value) {
    templateEditorModalInstance = new Modal(templateEditorModal.value);
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
