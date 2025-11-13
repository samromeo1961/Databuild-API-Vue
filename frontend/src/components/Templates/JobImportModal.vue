<template>
  <div class="modal fade" id="jobImportModal" tabindex="-1" aria-labelledby="jobImportModalLabel" aria-hidden="true" ref="modalElement">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="jobImportModalLabel">
            <i class="bi bi-folder-symlink me-2"></i>
            Import Job as Template
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="modal-body">
          <!-- Step 1: Job Search -->
          <div v-if="step === 1" class="job-search-step">
            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              Enter a job number to import all items from that job as a new template.
            </div>

            <div class="row mb-3">
              <div class="col-md-6">
                <label for="jobNumber" class="form-label">
                  Job Number
                  <span v-if="loadingJobs" class="spinner-border spinner-border-sm ms-2"></span>
                </label>
                <input
                  type="text"
                  class="form-control"
                  id="jobNumber"
                  v-model="jobNumber"
                  list="jobsList"
                  placeholder="Type to search jobs..."
                  @keyup.enter="searchJob"
                  :disabled="loading"
                />
                <datalist id="jobsList">
                  <option
                    v-for="job in filteredJobs"
                    :key="job.JobNo"
                    :value="job.JobNo"
                  >
                    {{ job.JobNo }} - {{ job.Description }}
                  </option>
                </datalist>
                <small v-if="jobsList.length > 0" class="text-muted">
                  {{ filteredJobs.length }} of {{ jobsList.length }} jobs available
                </small>
              </div>
              <div class="col-md-6">
                <label for="defaultZzType" class="form-label">
                  Default zzType
                  <i class="bi bi-question-circle" title="Applied to items with quantity ≠ 1"></i>
                </label>
                <select
                  class="form-select"
                  id="defaultZzType"
                  v-model="defaultZzType"
                  :disabled="loading"
                >
                  <option value="area">area</option>
                  <option value="linear">linear</option>
                  <option value="segment">segment</option>
                  <option value="Count">Count</option>
                </select>
                <small class="text-muted">Items with Qty=1 will automatically use 'part'</small>
              </div>
            </div>

            <button
              class="btn btn-primary"
              @click="searchJob"
              :disabled="!jobNumber || loading"
            >
              <span v-if="loading">
                <span class="spinner-border spinner-border-sm me-2"></span>
                Searching...
              </span>
              <span v-else>
                <i class="bi bi-search me-2"></i>
                Search Job
              </span>
            </button>

            <div v-if="error" class="alert alert-danger mt-3">
              <i class="bi bi-exclamation-triangle me-2"></i>
              {{ error }}
            </div>
          </div>

          <!-- Step 2: Job Preview -->
          <div v-if="step === 2" class="job-preview-step">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="mb-0">
                Job {{ jobNumber }} - {{ jobItems.length }} items found
              </h6>
              <button class="btn btn-sm btn-outline-secondary" @click="backToSearch">
                <i class="bi bi-arrow-left me-1"></i>
                Back
              </button>
            </div>

            <div class="alert alert-success">
              <strong>zzType Logic:</strong>
              <ul class="mb-0 mt-2">
                <li>Items with <strong>Quantity = 1</strong> → <code>part</code></li>
                <li>Items with <strong>Quantity ≠ 1</strong> → <code>{{ defaultZzType }}</code> (your default)</li>
              </ul>
            </div>

            <!-- Job Items Table -->
            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
              <table class="table table-sm table-bordered table-hover">
                <thead class="table-light sticky-top">
                  <tr>
                    <th style="width: 15%;">Item Code</th>
                    <th style="width: 20%;">Cost Centre</th>
                    <th style="width: 10%;">Quantity</th>
                    <th style="width: 12%;">Unit Price</th>
                    <th style="width: 13%;">zzType</th>
                    <th style="width: 30%;">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in jobItems" :key="index">
                    <td>{{ item.ItemCode }}</td>
                    <td>
                      <span :title="item.CostCentreName">
                        {{ item.CostCentre || 'N/A' }}
                        <small v-if="item.CostCentreName" class="text-muted d-block">
                          {{ item.CostCentreName }}
                        </small>
                      </span>
                    </td>
                    <td class="text-end">
                      <span :class="{'text-primary fw-bold': item.Quantity === 1}">
                        {{ item.Quantity }}
                      </span>
                    </td>
                    <td class="text-end">
                      {{ formatCurrency(item.UnitPrice) }}
                    </td>
                    <td>
                      <span class="badge" :class="getBadgeClass(item.suggestedZzType)">
                        {{ item.suggestedZzType }}
                      </span>
                    </td>
                    <td>
                      <small>{{ item.Description || 'No description' }}</small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-3">
              <label for="templateName" class="form-label">Template Name</label>
              <input
                type="text"
                class="form-control"
                id="templateName"
                v-model="templateName"
                :placeholder="`Job ${jobNumber} Template`"
              />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
            Cancel
          </button>
          <button
            v-if="step === 2"
            type="button"
            class="btn btn-primary"
            @click="importAsTemplate"
            :disabled="!templateName || importing"
          >
            <span v-if="importing">
              <span class="spinner-border spinner-border-sm me-2"></span>
              Importing...
            </span>
            <span v-else>
              <i class="bi bi-check-circle me-2"></i>
              Import as Template
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { Modal } from 'bootstrap';
import { useElectronAPI } from '../../composables/useElectronAPI';

export default {
  name: 'JobImportModal',
  emits: ['template-imported'],
  setup(props, { emit }) {
    const modalElement = ref(null);
    let modalInstance = null;

    const api = useElectronAPI();

    // State
    const step = ref(1); // 1 = search, 2 = preview
    const jobNumber = ref('');
    const defaultZzType = ref('area');
    const templateName = ref('');
    const jobItems = ref([]);
    const jobsList = ref([]);
    const loading = ref(false);
    const loadingJobs = ref(false);
    const importing = ref(false);
    const error = ref('');

    // Computed: Filter jobs based on search input
    const filteredJobs = computed(() => {
      if (!jobNumber.value || jobsList.value.length === 0) {
        return jobsList.value;
      }

      const search = jobNumber.value.toLowerCase();
      return jobsList.value.filter(job => {
        const jobNo = (job.JobNo || '').toString().toLowerCase();
        const description = (job.Description || '').toLowerCase();
        return jobNo.includes(search) || description.includes(search);
      });
    });

    // Load jobs list from database
    const loadJobsList = async () => {
      loadingJobs.value = true;
      try {
        // Diagnostic: Check what columns exist in Orders table
        const columnsResult = await api.jobs.getOrdersColumns();
        if (columnsResult.success) {
          console.log('📊 Orders table columns:', columnsResult.data);
        }

        const result = await api.jobs.getList();
        if (result.success && result.data) {
          jobsList.value = result.data;
        } else {
          console.error('Failed to load jobs list:', result.message);
          jobsList.value = [];
        }
      } catch (err) {
        console.error('Error loading jobs list:', err);
        jobsList.value = [];
      } finally {
        loadingJobs.value = false;
      }
    };

    // Open modal
    const show = () => {
      if (modalElement.value && !modalInstance) {
        modalInstance = new Modal(modalElement.value);
      }
      if (modalInstance) {
        reset();
        loadJobsList(); // Load jobs when modal opens
        modalInstance.show();
      }
    };

    // Close modal
    const hide = () => {
      if (modalInstance) {
        modalInstance.hide();
      }
    };

    // Reset modal state
    const reset = () => {
      step.value = 1;
      jobNumber.value = '';
      defaultZzType.value = 'area';
      templateName.value = '';
      jobItems.value = [];
      jobsList.value = [];
      loading.value = false;
      loadingJobs.value = false;
      importing.value = false;
      error.value = '';
    };

    // Search for job
    const searchJob = async () => {
      if (!jobNumber.value) return;

      loading.value = true;
      error.value = '';

      try {
        const result = await api.jobs.searchJob(jobNumber.value, defaultZzType.value);

        if (result.success && result.data && result.data.length > 0) {
          jobItems.value = result.data;
          templateName.value = `Job ${jobNumber.value} Template`;
          step.value = 2;
        } else if (result.success && result.data.length === 0) {
          error.value = `Job ${jobNumber.value} not found or has no items.`;
        } else {
          error.value = result.message || 'Failed to search job.';
        }
      } catch (err) {
        error.value = 'Error searching job: ' + err.message;
      } finally {
        loading.value = false;
      }
    };

    // Back to search
    const backToSearch = () => {
      step.value = 1;
      jobItems.value = [];
      error.value = '';
    };

    // Import as template
    const importAsTemplate = async () => {
      if (!templateName.value || jobItems.value.length === 0) return;

      importing.value = true;

      try {
        // Transform job items to template items format
        const templateItems = jobItems.value.map((item, index) => ({
          itemCode: item.ItemCode,
          description: item.Description || '',
          unit: item.Unit || '',
          costCentre: item.CostCentre || '',
          costCentreName: item.CostCentreName || '',
          subGroup: item.SubGroup || '',
          price: item.UnitPrice || 0,
          quantity: item.Quantity || 1,
          zzType: item.suggestedZzType,
          sortOrder: index + 1
        }));

        const template = {
          templateName: templateName.value,
          description: `Imported from Job ${jobNumber.value}`,
          items: templateItems,
          metadata: {
            source: 'job_import',
            jobNumber: jobNumber.value,
            importedAt: new Date().toISOString(),
            defaultZzType: defaultZzType.value
          }
        };

        const result = await api.templatesStore.save(template);

        if (result.success) {
          emit('template-imported', result.data);
          hide();
        } else {
          error.value = result.message || 'Failed to create template.';
        }
      } catch (err) {
        error.value = 'Error creating template: ' + err.message;
      } finally {
        importing.value = false;
      }
    };

    // Format currency
    const formatCurrency = (value) => {
      if (value == null) return '$0.00';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    };

    // Get badge class based on zzType
    const getBadgeClass = (zzType) => {
      const classes = {
        part: 'bg-primary',
        area: 'bg-success',
        linear: 'bg-info',
        segment: 'bg-warning',
        Count: 'bg-secondary'
      };
      return classes[zzType] || 'bg-dark';
    };

    return {
      modalElement,
      step,
      jobNumber,
      defaultZzType,
      templateName,
      jobItems,
      jobsList,
      filteredJobs,
      loading,
      loadingJobs,
      importing,
      error,
      show,
      hide,
      searchJob,
      backToSearch,
      importAsTemplate,
      formatCurrency,
      getBadgeClass
    };
  }
};
</script>

<style scoped>
.sticky-top {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f8f9fa;
}

.table-hover tbody tr:hover {
  background-color: #f8f9fa;
}

.badge {
  font-size: 0.75rem;
  padding: 0.25em 0.6em;
}
</style>
