<template>
  <div
    class="modal fade"
    id="preferencesModal"
    tabindex="-1"
    aria-labelledby="preferencesModalLabel"
    aria-hidden="true"
    ref="modalRef"
  >
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="preferencesModalLabel">
            <i class="bi bi-sliders me-2"></i>
            Preferences
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="modal-body">
          <!-- Success/Error Alerts -->
          <div v-if="success" class="alert alert-success alert-dismissible fade show" role="alert">
            <i class="bi bi-check-circle me-2"></i>
            Preferences saved successfully!
            <button type="button" class="btn-close" @click="success = false"></button>
          </div>

          <div v-if="error" class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="bi bi-exclamation-triangle me-2"></i>
            {{ error }}
            <button type="button" class="btn-close" @click="error = null"></button>
          </div>

          <!-- Preferences Accordion -->
          <div class="accordion" id="preferencesAccordion">

            <!-- Database Settings -->
            <div class="accordion-item">
              <h2 class="accordion-header">
                <button
                  class="accordion-button"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#databaseSettings"
                  aria-expanded="true"
                >
                  <i class="bi bi-database me-2"></i>
                  Database Settings
                </button>
              </h2>
              <div id="databaseSettings" class="accordion-collapse collapse show" data-bs-parent="#preferencesAccordion">
                <div class="accordion-body">
                  <!-- Connection Info -->
                  <div v-if="connectionInfo" class="card bg-light mb-3">
                    <div class="card-body">
                      <h6 class="card-title">Current Connection</h6>
                      <div class="row">
                        <div class="col-md-6">
                          <strong>Server:</strong> {{ connectionInfo.server }}
                        </div>
                        <div class="col-md-6">
                          <strong>Database:</strong> {{ connectionInfo.database }}
                        </div>
                        <div class="col-md-6">
                          <strong>User:</strong> {{ connectionInfo.user }}
                        </div>
                        <div class="col-md-6">
                          <strong>Status:</strong>
                          <span class="badge bg-success">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Default System Database -->
                  <div class="mb-3">
                    <label class="form-label">Default System Database</label>
                    <div class="input-group">
                      <select
                        class="form-select"
                        v-model="preferences.defaultSystemDatabase"
                        :disabled="loadingOptions || testingConnection"
                        @change="handleDatabaseChange"
                      >
                        <option v-for="db in databases" :key="db" :value="db">
                          {{ db }}
                        </option>
                      </select>
                      <button
                        class="btn btn-outline-primary"
                        type="button"
                        @click="handleTestConnection"
                        :disabled="testingConnection || !preferences.defaultSystemDatabase"
                      >
                        <span v-if="testingConnection" class="spinner-border spinner-border-sm me-1"></span>
                        <i v-else class="bi bi-plug me-1"></i>
                        {{ testingConnection ? 'Testing...' : 'Test Connection' }}
                      </button>
                    </div>
                    <div class="form-text">
                      Select a Databuild system database and click "Test Connection" to validate.
                    </div>
                  </div>

                  <!-- Auto Validation Status -->
                  <div v-if="validatingDatabase" class="alert alert-info">
                    <span class="spinner-border spinner-border-sm me-2"></span>
                    Validating database schema...
                  </div>

                  <!-- Connection Test Result -->
                  <div v-if="connectionTestResult" class="alert" :class="connectionTestResult.success && connectionTestResult.valid ? 'alert-success' : 'alert-danger'">
                    <div v-if="connectionTestResult.success && connectionTestResult.valid">
                      <i class="bi bi-check-circle me-2"></i>
                      <strong>Valid Databuild Database!</strong>
                      <div v-if="connectionTestResult.connectionInfo">
                        <small>Database: {{ connectionTestResult.connectionInfo.database }}</small><br>
                        <small>Server: {{ connectionTestResult.connectionInfo.server }}</small><br>
                        <small>Tables Validated: {{ connectionTestResult.connectionInfo.tablesValidated }}/6</small>
                      </div>
                    </div>
                    <div v-else>
                      <i class="bi bi-exclamation-triangle me-2"></i>
                      <strong>Invalid Database</strong>
                      <div>{{ connectionTestResult.message }}</div>
                      <div v-if="connectionTestResult.details" class="mt-2">
                        <small>Database: {{ connectionTestResult.details.database }}</small><br>
                        <small v-if="connectionTestResult.details.tablesFound !== undefined">
                          Tables Found: {{ connectionTestResult.details.tablesFound }}/{{ connectionTestResult.details.tablesRequired }}
                        </small>
                      </div>
                    </div>
                  </div>

                  <!-- Price Level -->
                  <div class="mb-3">
                    <label class="form-label">Price Level</label>
                    <select
                      class="form-select"
                      v-model.number="preferences.priceLevel"
                      :disabled="loadingOptions"
                    >
                      <option v-for="level in priceLevels" :key="level" :value="level">
                        Level {{ level }}{{ level === 0 ? ' (Default)' : '' }}
                      </option>
                    </select>
                  </div>

                  <!-- Cost Centre Bank -->
                  <div class="mb-3">
                    <label class="form-label">Cost Centre Bank</label>
                    <select
                      class="form-select"
                      v-model="preferences.costCentreBank"
                      :disabled="loadingOptions"
                    >
                      <option value="">None</option>
                      <option v-for="bank in costCentreBanks" :key="bank.CCBankCode" :value="bank.CCBankCode">
                        {{ bank.CCBankCode }} - {{ bank.CCBankName }}
                      </option>
                    </select>
                  </div>

                  <!-- Supplier Sub Groups -->
                  <div class="mb-3">
                    <label class="form-label">Supplier Sub Groups</label>
                    <div class="form-text mb-2">
                      Select which supplier groups to display in the Suppliers tab
                    </div>
                    <div v-if="loadingOptions" class="text-muted">
                      <span class="spinner-border spinner-border-sm me-2"></span>
                      Loading supplier groups...
                    </div>
                    <div v-else class="row">
                      <div v-for="group in supplierGroups" :key="group.Group" class="col-md-4 mb-2">
                        <div class="form-check">
                          <input
                            class="form-check-input"
                            type="checkbox"
                            :id="'group-' + group.Group"
                            :value="group.Group"
                            :checked="preferences.supplierSubGroups?.includes(group.Group)"
                            @change="handleSupplierGroupChange(group.Group)"
                          />
                          <label class="form-check-label" :for="'group-' + group.Group">
                            {{ group.Group }} - {{ group.GroupName }}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Folder Structure Settings -->
            <div class="accordion-item">
              <h2 class="accordion-header">
                <button
                  class="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#folderSettings"
                >
                  <i class="bi bi-folder me-2"></i>
                  Folder Structure
                </button>
              </h2>
              <div id="folderSettings" class="accordion-collapse collapse" data-bs-parent="#preferencesAccordion">
                <div class="accordion-body">
                  <div class="mb-3">
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        id="useTemplateName"
                        v-model="preferences.folderStructure.useTemplateName"
                      />
                      <label class="form-check-label" for="useTemplateName">
                        Use Template Name in folder structure
                      </label>
                    </div>
                  </div>
                  <div class="mb-3">
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        id="useCostCentreFolders"
                        v-model="preferences.folderStructure.useCostCentreFolders"
                      />
                      <label class="form-check-label" for="useCostCentreFolders">
                        Use Cost Centre folders
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Default Takeoff Types -->
            <div class="accordion-item">
              <h2 class="accordion-header">
                <button
                  class="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#takeoffTypes"
                >
                  <i class="bi bi-rulers me-2"></i>
                  Default Takeoff Types
                </button>
              </h2>
              <div id="takeoffTypes" class="accordion-collapse collapse" data-bs-parent="#preferencesAccordion">
                <div class="accordion-body">
                  <div class="row">
                    <div class="col-md-6 mb-3">
                      <label class="form-label">Area</label>
                      <input
                        type="text"
                        class="form-control"
                        v-model="preferences.defaultTakeoffTypes.area"
                      />
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label">Linear</label>
                      <input
                        type="text"
                        class="form-control"
                        v-model="preferences.defaultTakeoffTypes.linear"
                      />
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label">Count</label>
                      <input
                        type="text"
                        class="form-control"
                        v-model="preferences.defaultTakeoffTypes.count"
                      />
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label">Segment</label>
                      <input
                        type="text"
                        class="form-control"
                        v-model="preferences.defaultTakeoffTypes.segment"
                      />
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label">Part</label>
                      <input
                        type="text"
                        class="form-control"
                        v-model="preferences.defaultTakeoffTypes.part"
                      />
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label">Drag & Drop</label>
                      <input
                        type="text"
                        class="form-control"
                        v-model="preferences.defaultTakeoffTypes.dragDrop"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Unit Mappings -->
            <div class="accordion-item">
              <h2 class="accordion-header">
                <button
                  class="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#unitMappings"
                >
                  <i class="bi bi-link-45deg me-2"></i>
                  Unit to Takeoff Type Mappings
                </button>
              </h2>
              <div id="unitMappings" class="accordion-collapse collapse" data-bs-parent="#preferencesAccordion">
                <div class="accordion-body">
                  <p class="text-muted">
                    Map units of measurement to zzTakeoff types
                  </p>
                  <div class="table-responsive">
                    <table class="table table-sm table-striped">
                      <thead>
                        <tr>
                          <th>Unit</th>
                          <th>Description</th>
                          <th>zzTakeoff Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="loadingUnits">
                          <td colspan="3" class="text-center">
                            <span class="spinner-border spinner-border-sm me-2"></span>
                            Loading units...
                          </td>
                        </tr>
                        <tr v-else v-for="unit in units" :key="unit.Code">
                          <td><strong>{{ unit.Code }}</strong></td>
                          <td>{{ unit.Printout }}</td>
                          <td>
                            <select
                              class="form-select form-select-sm"
                              :value="preferences.unitTakeoffMappings?.[unit.Printout] || preferences.unitTakeoffMappings?.[unit.Code] || ''"
                              @change="handleUnitMappingChange(unit.Printout, $event.target.value)"
                            >
                              <option value="">None</option>
                              <option value="area">Area</option>
                              <option value="linear">Linear</option>
                              <option value="count">Count</option>
                              <option value="segment">Segment</option>
                              <option value="part">Part</option>
                              <option value="item">Item</option>
                            </select>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- Display Settings -->
            <div class="accordion-item">
              <h2 class="accordion-header">
                <button
                  class="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#displaySettings"
                >
                  <i class="bi bi-eye me-2"></i>
                  Display Settings
                </button>
              </h2>
              <div id="displaySettings" class="accordion-collapse collapse" data-bs-parent="#preferencesAccordion">
                <div class="accordion-body">
                  <div class="mb-3">
                    <label class="form-label">Items Per Page</label>
                    <select
                      class="form-select"
                      v-model.number="preferences.itemsPerPage"
                    >
                      <option :value="25">25</option>
                      <option :value="50">50</option>
                      <option :value="100">100</option>
                      <option :value="200">200</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Theme</label>
                    <select
                      class="form-select"
                      v-model="preferences.theme"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                    <div class="form-text">
                      Changes will apply immediately in the main app
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Application Settings -->
            <div class="accordion-item">
              <h2 class="accordion-header">
                <button
                  class="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#applicationSettings"
                >
                  <i class="bi bi-gear me-2"></i>
                  Application Settings
                </button>
              </h2>
              <div id="applicationSettings" class="accordion-collapse collapse" data-bs-parent="#preferencesAccordion">
                <div class="accordion-body">
                  <div class="mb-3">
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        id="openExpanded"
                        v-model="preferences.openExpanded"
                      />
                      <label class="form-check-label" for="openExpanded">
                        Open application in expanded/maximized mode
                      </label>
                      <div class="form-text">
                        Application will start in fullscreen mode on launch
                      </div>
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Default Tab on Opening</label>
                    <select
                      class="form-select"
                      v-model="preferences.defaultTab"
                    >
                      <option value="/catalogue">Catalogue</option>
                      <option value="/recipes">Recipes</option>
                      <option value="/suppliers">Suppliers</option>
                      <option value="/contacts">Contacts</option>
                      <option value="/templates">Templates</option>
                      <option value="/favourites">Favourites</option>
                      <option value="/recents">Recents</option>
                      <option value="/zztakeoff-web">zzTakeoff Web</option>
                    </select>
                    <div class="form-text">
                      Choose which tab to display when the application starts
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- zzTakeoff Settings -->
            <div class="accordion-item">
              <h2 class="accordion-header">
                <button
                  class="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#zzTakeoffSettings"
                >
                  <i class="bi bi-box-arrow-in-right me-2"></i>
                  zzTakeoff Settings
                </button>
              </h2>
              <div id="zzTakeoffSettings" class="accordion-collapse collapse" data-bs-parent="#preferencesAccordion">
                <div class="accordion-body">
                  <div class="mb-3">
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        id="persistZzTakeoffSession"
                        v-model="preferences.persistZzTakeoffSession"
                      />
                      <label class="form-check-label" for="persistZzTakeoffSession">
                        Keep me signed in to zzTakeoff.com
                      </label>
                      <div class="form-text">
                        Your zzTakeoff session will persist between application restarts
                      </div>
                    </div>
                  </div>
                  <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    <small>
                      When enabled, you won't need to sign in to zzTakeoff.com each time you open the application.
                      This uses browser session persistence for the embedded zzTakeoff Web view.
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <!-- Column Name Customization -->
            <div class="accordion-item">
              <h2 class="accordion-header">
                <button
                  class="accordion-button collapsed"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#columnNameSettings"
                >
                  <i class="bi bi-textarea-t me-2"></i>
                  Column Name Customization
                </button>
              </h2>
              <div id="columnNameSettings" class="accordion-collapse collapse" data-bs-parent="#preferencesAccordion">
                <div class="accordion-body">
                  <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    <small>
                      Customize column names displayed in tables and property names used when sending to zzTakeoff.
                      Changes will apply across all tabs (Catalogue, Recipes, Templates, Favourites, Recents).
                    </small>
                  </div>

                  <!-- Column Names Table -->
                  <div class="table-responsive">
                    <table class="table table-hover table-sm">
                      <thead>
                        <tr>
                          <th style="width: 25%">Database Field</th>
                          <th style="width: 35%">Display Name (Column Header)</th>
                          <th style="width: 35%">zzTakeoff Property Name</th>
                          <th style="width: 5%"></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(columnData, field) in editableColumnNames" :key="field">
                          <td class="align-middle">
                            <code class="text-muted">{{ field }}</code>
                          </td>
                          <td>
                            <input
                              type="text"
                              class="form-control form-control-sm"
                              v-model="columnData.displayName"
                              :placeholder="field"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              class="form-control form-control-sm"
                              v-model="columnData.zzTakeoffProperty"
                              :placeholder="field.toLowerCase()"
                            />
                          </td>
                          <td class="align-middle text-center">
                            <button
                              class="btn btn-sm btn-outline-secondary"
                              @click="resetColumnName(field)"
                              title="Reset to default"
                            >
                              <i class="bi bi-arrow-counterclockwise"></i>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <!-- Actions -->
                  <div class="d-flex justify-content-end gap-2 mt-3">
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      @click="resetAllColumnNames"
                    >
                      <i class="bi bi-arrow-counterclockwise me-1"></i>
                      Reset All to Defaults
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-outline-danger me-auto"
            @click="handleReset"
            :disabled="loading"
          >
            <i class="bi bi-arrow-counterclockwise me-1"></i>
            Reset to Defaults
          </button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
            <i class="bi bi-x-lg me-1"></i>
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="handleSave"
            :disabled="loading"
          >
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            <i v-else class="bi bi-save me-1"></i>
            {{ loading ? 'Saving...' : 'Save Preferences' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Modal } from 'bootstrap';
import { useElectronAPI } from '../../composables/useElectronAPI';
import { useColumnNames } from '../../composables/useColumnNames';

const api = useElectronAPI();
const columnNamesComposable = useColumnNames();

// Modal ref
const modalRef = ref(null);
let modalInstance = null;

// State
const preferences = ref({
  priceLevel: 1,
  defaultSystemDatabase: 'CROWNESYS',
  costCentreBank: '',
  supplierSubGroups: [2],
  folderStructure: {
    useTemplateName: true,
    useCostCentreFolders: true,
    customFolders: []
  },
  defaultTakeoffTypes: {
    area: 'area',
    linear: 'linear',
    count: 'count',
    segment: 'segment',
    part: 'item',
    dragDrop: 'item'
  },
  unitTakeoffMappings: {},
  itemsPerPage: 50,
  theme: 'light',
  // Application Settings
  openExpanded: false,
  defaultTab: '/catalogue',
  // zzTakeoff Settings
  persistZzTakeoffSession: false
});

const loading = ref(false);
const success = ref(false);
const error = ref(null);
const units = ref([]);
const loadingUnits = ref(false);
const connectionInfo = ref(null);
const testingConnection = ref(false);
const validatingDatabase = ref(false);
const connectionTestResult = ref(null);
const priceLevels = ref([]);
const databases = ref([]);
const costCentreBanks = ref([]);
const supplierGroups = ref([]);
const loadingOptions = ref(false);

// Column Names State
const editableColumnNames = ref({});
const defaultColumnNames = ref({});
const originalDatabase = ref(null);
const initialDatabase = ref(null); // Track initial value when modal opens

// Show modal
const show = () => {
  if (modalInstance) {
    // Remove any stuck modal backdrops before showing
    const stuckBackdrops = document.querySelectorAll('.modal-backdrop');
    stuckBackdrops.forEach(backdrop => backdrop.remove());

    // Remove modal-open class from body if it exists
    document.body.classList.remove('modal-open');

    // Load fresh data when opening
    loadPreferences();
    loadColumnNames();
    loadUnits();
    loadOptions();
    loadCurrentDatabase();
    modalInstance.show();
  }
};

// Load current database info
const loadCurrentDatabase = async () => {
  try {
    // Get saved connection info from database settings
    const savedConfig = await api.db?.getSavedConnection?.();
    if (savedConfig?.database) {
      originalDatabase.value = savedConfig.database;
    }
  } catch (err) {
    console.error('Error loading current database:', err);
  }
};

// Load preferences
const loadPreferences = async () => {
  loading.value = true;
  try {
    const response = await api.preferencesStore.get();
    if (response?.success && response.data) {
      preferences.value = response.data;
      // Capture initial database value when modal opens
      initialDatabase.value = response.data.defaultSystemDatabase;
    }
  } catch (err) {
    error.value = 'Failed to load preferences';
    console.error('Error loading preferences:', err);
  } finally {
    loading.value = false;
  }
};

// Load column names
const loadColumnNames = async () => {
  try {
    await columnNamesComposable.loadColumnNames();
    // Create a deep copy for editing
    editableColumnNames.value = JSON.parse(JSON.stringify(columnNamesComposable.columnNames.value));
    defaultColumnNames.value = JSON.parse(JSON.stringify(columnNamesComposable.columnNames.value));
  } catch (err) {
    console.error('Error loading column names:', err);
    error.value = 'Failed to load column names';
  }
};

// Reset a single column name to default
const resetColumnName = (field) => {
  if (defaultColumnNames.value[field]) {
    editableColumnNames.value[field] = {
      ...defaultColumnNames.value[field]
    };
  }
};

// Reset all column names to defaults
const resetAllColumnNames = async () => {
  try {
    await columnNamesComposable.resetColumnNames();
    editableColumnNames.value = JSON.parse(JSON.stringify(columnNamesComposable.columnNames.value));
    defaultColumnNames.value = JSON.parse(JSON.stringify(columnNamesComposable.columnNames.value));
    success.value = true;
    setTimeout(() => success.value = false, 3000);
  } catch (err) {
    console.error('Error resetting column names:', err);
    error.value = 'Failed to reset column names';
  }
};

// Load units
const loadUnits = async () => {
  loadingUnits.value = true;
  try {
    const response = await api.preferences.getUnits();
    if (response?.success) {
      units.value = response.data;
    }
  } catch (err) {
    console.error('Error loading units:', err);
    error.value = 'Failed to load units of measurement';
  } finally {
    loadingUnits.value = false;
  }
};

// Load options (price levels, databases, banks, groups)
const loadOptions = async () => {
  loadingOptions.value = true;
  try {
    const [priceLevelsRes, databasesRes, banksRes, groupsRes] = await Promise.all([
      api.preferences.getPriceLevels(),
      api.preferences.getDatabases(),
      api.preferences.getCostCentreBanks(),
      api.preferences.getSupplierGroups()
    ]);

    if (priceLevelsRes?.success) priceLevels.value = priceLevelsRes.data;
    if (databasesRes?.success) databases.value = databasesRes.data;
    if (banksRes?.success) costCentreBanks.value = banksRes.data;
    if (groupsRes?.success) supplierGroups.value = groupsRes.data;
  } catch (err) {
    console.error('Error loading options:', err);
  } finally {
    loadingOptions.value = false;
  }
};

// Handle database change - auto validate
const handleDatabaseChange = async () => {
  validatingDatabase.value = true;
  connectionTestResult.value = null;

  try {
    const response = await api.preferences.testConnection({
      database: preferences.value.defaultSystemDatabase
    });
    connectionTestResult.value = response;

    if (response.success && response.valid && response.connectionInfo) {
      connectionInfo.value = response.connectionInfo;
    }
  } catch (err) {
    console.error('Error validating database:', err);
    connectionTestResult.value = {
      success: false,
      connected: false,
      valid: false,
      error: 'Database validation failed',
      message: err.message || 'Unable to validate database schema'
    };
  } finally {
    validatingDatabase.value = false;
  }
};

// Handle test connection (kept for manual testing if needed)
const handleTestConnection = async () => {
  testingConnection.value = true;
  connectionTestResult.value = null;
  try {
    const response = await api.preferences.testConnection({
      database: preferences.value.defaultSystemDatabase
    });
    connectionTestResult.value = response;

    if (response.success && response.valid && response.connectionInfo) {
      connectionInfo.value = response.connectionInfo;
    }
  } catch (err) {
    console.error('Error testing connection:', err);
    connectionTestResult.value = {
      success: false,
      connected: false,
      valid: false,
      error: 'Connection test failed',
      message: err.message
    };
  } finally {
    testingConnection.value = false;
  }
};

// Handle supplier group change
const handleSupplierGroupChange = (groupValue) => {
  const group = parseInt(groupValue);
  const currentGroups = preferences.value.supplierSubGroups || [];
  const isSelected = currentGroups.includes(group);

  if (isSelected) {
    preferences.value.supplierSubGroups = currentGroups.filter(g => g !== group);
  } else {
    preferences.value.supplierSubGroups = [...currentGroups, group];
  }
};

// Handle unit mapping change
const handleUnitMappingChange = (unit, takeoffType) => {
  if (!preferences.value.unitTakeoffMappings) {
    preferences.value.unitTakeoffMappings = {};
  }
  preferences.value.unitTakeoffMappings[unit] = takeoffType;
};

// Handle save
const handleSave = async () => {
  loading.value = true;
  success.value = false;
  error.value = null;

  try {
    // Check if database has changed from initial value (when modal opened)
    const databaseChanged = initialDatabase.value &&
                          preferences.value.defaultSystemDatabase &&
                          initialDatabase.value !== preferences.value.defaultSystemDatabase;

    if (databaseChanged) {
      // Validate the database is valid before switching
      if (!connectionTestResult.value || !connectionTestResult.value.valid) {
        error.value = 'Please validate the selected database before saving. The database must be a valid Databuild system database.';
        loading.value = false;
        return;
      }

      // Switch to the new database
      const switchResult = await api.preferences.switchDatabase({
        database: preferences.value.defaultSystemDatabase
      });

      if (!switchResult.success) {
        error.value = `Failed to switch database: ${switchResult.message}`;
        loading.value = false;
        return;
      }

      // Update original and initial database references
      originalDatabase.value = preferences.value.defaultSystemDatabase;
      initialDatabase.value = preferences.value.defaultSystemDatabase;

      // Reload options from new database
      await loadOptions();
    }

    // Create a plain object copy (remove Vue reactivity) for IPC
    const plainPreferences = JSON.parse(JSON.stringify(preferences.value));

    // Save preferences
    const response = await api.preferencesStore.save(plainPreferences);
    if (response?.success) {
      // Save column names
      const plainColumnNames = JSON.parse(JSON.stringify(editableColumnNames.value));
      await columnNamesComposable.saveColumnNames(plainColumnNames);

      success.value = true;

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('preferencesUpdated', {
        detail: plainPreferences
      }));

      // Dispatch event to notify tabs of column name changes
      window.dispatchEvent(new CustomEvent('columnNamesUpdated', {
        detail: plainColumnNames
      }));

      if (databaseChanged) {
        // Notify user that application data has been refreshed
        window.dispatchEvent(new CustomEvent('databaseChanged', {
          detail: { database: preferences.value.defaultSystemDatabase }
        }));
      }

      // Close the modal after successful save
      setTimeout(() => {
        success.value = false;
        if (modalInstance) {
          modalInstance.hide();
        }
      }, 1000);
    } else {
      error.value = 'Failed to save preferences';
    }
  } catch (err) {
    error.value = 'Error saving preferences';
    console.error('Error saving preferences:', err);
  } finally {
    loading.value = false;
  }
};

// Handle reset
const handleReset = async () => {
  if (confirm('Reset all preferences to default values?')) {
    loading.value = true;
    try {
      const response = await api.preferencesStore.reset();
      if (response?.success) {
        await loadPreferences();
        success.value = true;
        setTimeout(() => {
          success.value = false;
        }, 3000);

        // Dispatch event to notify other components
        const defaultsRes = await api.preferencesStore.getDefaults();
        if (defaultsRes?.success) {
          window.dispatchEvent(new CustomEvent('preferencesUpdated', {
            detail: defaultsRes.data
          }));
        }
      } else {
        error.value = 'Failed to reset preferences';
      }
    } catch (err) {
      error.value = 'Failed to reset preferences';
      console.error('Error resetting preferences:', err);
    } finally {
      loading.value = false;
    }
  }
};

// Expose methods
defineExpose({
  show
});

onMounted(() => {
  if (modalRef.value) {
    modalInstance = new Modal(modalRef.value);
  }
});

onBeforeUnmount(() => {
  if (modalInstance) {
    modalInstance.dispose();
    modalInstance = null;
  }
});
</script>

<style scoped>
.modal-content {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.modal-header,
.modal-footer {
  border-color: var(--border-color);
}

.accordion-button:not(.collapsed) {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.table {
  color: var(--text-primary);
}

[data-theme="dark"] .modal-content {
  background-color: var(--bg-secondary);
}

[data-theme="dark"] .accordion-item {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
}

[data-theme="dark"] .accordion-button {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

[data-theme="dark"] .accordion-button:not(.collapsed) {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

[data-theme="dark"] .accordion-body {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

[data-theme="dark"] .card {
  background-color: var(--bg-tertiary) !important;
  border-color: var(--border-color);
  color: var(--text-primary);
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

[data-theme="dark"] .table {
  color: var(--text-primary);
}

[data-theme="dark"] .table-striped > tbody > tr:nth-of-type(odd) > * {
  --bs-table-bg-type: var(--bg-tertiary);
  color: var(--text-primary);
}
</style>
