<template>
  <div class="preferences-tab p-4">
    <!-- Header -->
    <div class="row mb-4">
      <div class="col">
        <h4>
          <i class="bi bi-sliders text-primary me-2"></i>
          Preferences
        </h4>
        <p class="text-muted">
          Configure application settings and default values
        </p>
      </div>
      <div class="col-auto">
        <button
          class="btn btn-outline-danger me-2"
          @click="handleReset"
          :disabled="loading"
        >
          <i class="bi bi-arrow-counterclockwise me-1"></i>
          Reset to Defaults
        </button>
        <button
          class="btn btn-primary"
          @click="handleSave"
          :disabled="loading"
        >
          <i class="bi bi-save me-1"></i>
          {{ loading ? 'Saving...' : 'Save Preferences' }}
        </button>
      </div>
    </div>

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
              <select
                class="form-select"
                v-model="preferences.defaultSystemDatabase"
                :disabled="loadingOptions"
              >
                <option v-for="db in databases" :key="db.name" :value="db.name">
                  {{ db.name }}
                </option>
              </select>
              <div class="form-text">
                Select the default Databuild system database
              </div>
            </div>

            <!-- Test Connection Button -->
            <div class="mb-3">
              <button
                class="btn btn-outline-primary"
                @click="handleTestConnection"
                :disabled="testingConnection"
              >
                <span v-if="testingConnection" class="spinner-border spinner-border-sm me-2"></span>
                <i v-else class="bi bi-plug me-2"></i>
                {{ testingConnection ? 'Testing...' : 'Test Connection' }}
              </button>
            </div>

            <!-- Connection Test Result -->
            <div v-if="connectionTestResult" class="alert" :class="connectionTestResult.success && connectionTestResult.valid ? 'alert-success' : 'alert-danger'">
              <div v-if="connectionTestResult.success && connectionTestResult.valid">
                <i class="bi bi-check-circle me-2"></i>
                <strong>Connection Successful!</strong>
                <div v-if="connectionTestResult.tablesFound">
                  Found {{ connectionTestResult.tablesFound.length }} Databuild tables
                </div>
              </div>
              <div v-else>
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Connection Failed</strong>
                <div>{{ connectionTestResult.error || connectionTestResult.message }}</div>
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
                <option v-for="level in priceLevels" :key="level.value" :value="level.value">
                  {{ level.label }}
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
                <option v-for="bank in costCentreBanks" :key="bank.Bank" :value="bank.Bank">
                  {{ bank.Bank }} - {{ bank.Description }}
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
                    <td>{{ unit.Description }}</td>
                    <td>
                      <input
                        type="text"
                        class="form-control form-control-sm"
                        :value="preferences.unitTakeoffMappings?.[unit.Code] || ''"
                        @input="handleUnitMappingChange(unit.Code, $event.target.value)"
                        placeholder="e.g., Area, Linear, Item"
                      />
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

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useElectronAPI } from '../../composables/useElectronAPI';

const api = useElectronAPI();

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
    area: 'DBxArea',
    linear: 'DBxLinear',
    count: 'DBxCount',
    segment: 'DBxSegment',
    part: 'DBxPart',
    dragDrop: 'DBxD&D'
  },
  unitTakeoffMappings: {},
  itemsPerPage: 50,
  theme: 'light'
});

const loading = ref(false);
const success = ref(false);
const error = ref(null);
const units = ref([]);
const loadingUnits = ref(false);
const connectionInfo = ref(null);
const testingConnection = ref(false);
const connectionTestResult = ref(null);
const priceLevels = ref([]);
const databases = ref([]);
const costCentreBanks = ref([]);
const supplierGroups = ref([]);
const loadingOptions = ref(false);

// Load data on mount
onMounted(() => {
  loadPreferences();
  loadUnits();
  loadOptions();
});

// Load preferences
const loadPreferences = async () => {
  loading.value = true;
  try {
    const response = await api.preferencesStore.get();
    if (response?.success && response.data) {
      preferences.value = response.data;
    }
  } catch (err) {
    error.value = 'Failed to load preferences';
    console.error('Error loading preferences:', err);
  } finally {
    loading.value = false;
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

// Handle test connection
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
    const response = await api.preferencesStore.save(preferences.value);
    if (response?.success) {
      success.value = true;
      setTimeout(() => {
        success.value = false;
      }, 3000);

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('preferencesUpdated', {
        detail: preferences.value
      }));
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
</script>

<style scoped>
.preferences-tab {
  max-width: 1200px;
  margin: 0 auto;
}

.accordion-button:not(.collapsed) {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.table {
  color: var(--text-primary);
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
