<template>
  <div class="modal fade" id="jobImportModal" tabindex="-1" aria-labelledby="jobImportModalLabel" aria-hidden="true" ref="modalElement">
    <div class="modal-dialog modal-xl modal-dialog-scrollable" style="max-height: 90vh;">
      <div class="modal-content" style="min-height: 80vh;">
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
                <SearchableSelect
                  v-model="jobNumber"
                  :options="jobsList"
                  :label-key="formatJobLabel"
                  value-key="JobNo"
                  placeholder="Select or search for a job..."
                  :disabled="loading || loadingJobs"
                  @change="onJobSelected"
                />
                <small v-if="jobsList.length > 0" class="text-muted">
                  {{ jobsList.length }} jobs available
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

            <!-- Job Info: Schedule Profile and Address -->
            <div v-if="jobInfo" class="alert alert-info mb-3">
              <div class="row">
                <div class="col-md-6" v-if="jobInfo.ScheduleProfile">
                  <strong>Schedule Profile:</strong> {{ jobInfo.ScheduleProfile }}
                </div>
                <div class="col-md-6" v-if="jobInfo.Address">
                  <strong>Address:</strong> {{ jobInfo.Address }}<span v-if="jobInfo.City">, {{ jobInfo.City }}</span>
                </div>
              </div>
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
                    <th style="width: 10%;">Item Code</th>
                    <th style="width: 12%;">Cost Centre</th>
                    <th style="width: 18%;">Description</th>
                    <th style="width: 15%;">Workup</th>
                    <th style="width: 8%;">Quantity</th>
                    <th style="width: 8%;">Unit</th>
                    <th style="width: 10%;">Unit Price</th>
                    <th style="width: 10%;">zzType</th>
                    <th style="width: 9%;">Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in jobItems" :key="index">
                    <td><small>{{ item.ItemCode }}</small></td>
                    <td>
                      <small :title="item.CostCentreName">
                        {{ item.CostCentre || 'N/A' }}
                        <span v-if="item.CostCentreName" class="text-muted d-block" style="font-size: 0.7rem;">
                          {{ item.CostCentreName }}
                        </span>
                      </small>
                    </td>
                    <td><small>{{ item.Description || 'No description' }}</small></td>
                    <td><small class="text-muted">{{ item.Workup || '-' }}</small></td>
                    <td class="text-end">
                      <span :class="{'text-primary fw-bold': item.Quantity === 1}">
                        {{ item.Quantity }}
                      </span>
                    </td>
                    <td><small>{{ item.Unit || '' }}</small></td>
                    <td class="text-end">
                      <small>{{ formatCurrency(item.UnitPrice) }}</small>
                    </td>
                    <td>
                      <span class="badge" :class="getBadgeClass(item.suggestedZzType)">
                        {{ item.suggestedZzType }}
                      </span>
                    </td>
                    <td><small>{{ item.Supplier || '-' }}</small></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-3">
              <label for="templateName" class="form-label">Rename Template</label>
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

          <!-- Preview Job Button (Step 1) -->
          <button
            v-if="step === 1"
            type="button"
            class="btn btn-primary"
            @click="searchJob"
            :disabled="!jobNumber || loading"
          >
            <span v-if="loading">
              <span class="spinner-border spinner-border-sm me-2"></span>
              Loading...
            </span>
            <span v-else>
              <i class="bi bi-eye me-2"></i>
              Preview Job
            </span>
          </button>

          <!-- Back to Search Button (Step 2) -->
          <button
            v-if="step === 2"
            type="button"
            class="btn btn-outline-secondary"
            @click="backToSearch"
          >
            <i class="bi bi-arrow-left me-2"></i>
            Back to Search
          </button>

          <!-- Import as Template Button (Step 2) -->
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
import SearchableSelect from '../common/SearchableSelect.vue';

export default {
  name: 'JobImportModal',
  components: {
    SearchableSelect
  },
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
    const jobInfo = ref(null);  // Job info: Address, ScheduleProfile, etc.
    const jobsList = ref([]);
    const loading = ref(false);
    const loadingJobs = ref(false);
    const importing = ref(false);
    const error = ref('');

    // Format job label for dropdown: "JobNo - Address, City" or "JobNo - Description"
    const formatJobLabel = (job) => {
      if (!job) return '';

      const jobNo = job.JobNo || '';
      const address = job.Address || '';
      const city = job.City || '';
      const description = job.Description || '';

      // Priority: Address + City > Description
      if (address && address.trim()) {
        if (city && city.trim()) {
          return `${jobNo} - ${address}, ${city}`;
        }
        return `${jobNo} - ${address}`;
      }

      if (description && description.trim()) {
        return `${jobNo} - ${description}`;
      }

      return jobNo.toString();
    };

    // Handle job selection from dropdown
    const onJobSelected = () => {
      // Job number is automatically updated by v-model
      console.log('📋 Job selected:', jobNumber.value);

      // Optionally trigger search immediately on selection
      if (jobNumber.value) {
        console.log('✅ Search button should now be enabled');
        // You can uncomment this to auto-search on selection
        // searchJob();
      }
    };

    // Load jobs list from database
    const loadJobsList = async () => {
      loadingJobs.value = true;
      error.value = '';
      try {
        console.log('🔍 Loading jobs list...');
        const result = await api.jobs.getList();

        console.log('📊 Jobs result:', result);

        if (result.success && result.data) {
          jobsList.value = result.data;
          console.log(`✅ Loaded ${result.data.length} jobs`);

          if (result.data.length > 0) {
            console.log('📋 Sample job:', result.data[0]);
          }
        } else {
          console.error('❌ Failed to load jobs list:', result.message);
          error.value = `Failed to load jobs: ${result.message}`;
          jobsList.value = [];
        }
      } catch (err) {
        console.error('❌ Error loading jobs list:', err);
        error.value = `Error loading jobs: ${err.message}`;
        jobsList.value = [];
      } finally {
        loadingJobs.value = false;
      }
    };

    // Open modal
    const show = () => {
      if (modalElement.value && !modalInstance) {
        modalInstance = new Modal(modalElement.value);
        // Listen for modal hidden event to reset state
        modalElement.value.addEventListener('hidden.bs.modal', reset);
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
        // Reset is handled by hidden.bs.modal event listener
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
          jobInfo.value = result.jobInfo || null;

          // Build template name with Address if available
          let name = `Job ${jobNumber.value}`;
          if (jobInfo.value?.Address) {
            name += ` - ${jobInfo.value.Address}`;
            if (jobInfo.value.City) {
              name += `, ${jobInfo.value.City}`;
            }
          }
          templateName.value = name;

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
      let shouldClose = false;

      try {
        // Transform job items to template items format
        // IMPORTANT: Field names must match TemplatesTab AG Grid column definitions
        const templateItems = jobItems.value.map((item, index) => ({
          PriceCode: item.ItemCode,           // Code column expects PriceCode
          description: item.Description || '',
          workup: item.Workup || '',
          Unit: item.Unit || '',              // Unit column expects Unit (capitalized)
          CostCentre: item.CostCentre || '',  // Cost Centre column expects CostCentre
          costCentreName: item.CostCentreName || '',
          SubGroup: item.SubGroup || '',
          Price: item.UnitPrice || 0,         // Price column expects Price (capitalized)
          quantity: item.Quantity || 1,
          zzType: item.suggestedZzType,
          supplier: item.Supplier || '',
          orderNumber: item.OrderNumber || '',
          lineNumber: item.LineNumber || 0,
          sortOrder: item.CCSortOrder || index + 1
        }));

        const template = {
          templateName: templateName.value,
          description: `Imported from Job ${jobNumber.value}`,
          items: templateItems,
          metadata: {
            source: 'job_import',
            jobNumber: jobNumber.value,
            importedAt: new Date().toISOString(),
            defaultZzType: defaultZzType.value,
            itemCount: templateItems.length
          }
        };

        const result = await api.templatesStore.save(template);

        if (result.success) {
          // Save Workup data to notes-store for items that have workup content
          console.log('[Job Import] Saving Workup data to Notes...');
          console.log('[Job Import] Total items in job:', jobItems.value.length);
          let savedCount = 0;
          let skippedCount = 0;

          for (const item of jobItems.value) {
            console.log(`[Job Import] Processing item: ${item.ItemCode}, Workup: "${item.Workup || '(empty)'}"`);

            if (item.ItemCode && item.Workup && item.Workup.trim() !== '') {
              try {
                console.log(`[Job Import] Saving note for ${item.ItemCode}: "${item.Workup.substring(0, 50)}..."`);
                const saveResult = await api.notesStore.save(item.ItemCode, item.Workup);
                console.log(`[Job Import] Save result for ${item.ItemCode}:`, saveResult);
                savedCount++;
              } catch (noteErr) {
                console.error(`[Job Import] Failed to save note for ${item.ItemCode}:`, noteErr);
              }
            } else {
              skippedCount++;
              if (!item.ItemCode) {
                console.log(`[Job Import] Skipped item - no ItemCode`);
              } else if (!item.Workup) {
                console.log(`[Job Import] Skipped ${item.ItemCode} - no Workup data`);
              } else {
                console.log(`[Job Import] Skipped ${item.ItemCode} - Workup is empty/whitespace`);
              }
            }
          }

          console.log(`[Job Import] Saved ${savedCount} notes from Workup fields, skipped ${skippedCount} items`);

          // Emit template imported event
          emit('template-imported', result.data);

          // Mark that we should close modal after finally block
          shouldClose = true;
        } else {
          error.value = result.message || 'Failed to create template.';
        }
      } catch (err) {
        error.value = 'Error creating template: ' + err.message;
      } finally {
        importing.value = false;

        // Close modal after all state updates are complete
        if (shouldClose) {
          // Use setTimeout to ensure UI updates complete
          setTimeout(() => {
            if (modalInstance) {
              modalInstance.hide();
            }
          }, 100);
        }
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
      jobInfo,
      jobsList,
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
      getBadgeClass,
      formatJobLabel,
      onJobSelected
    };
  }
};
</script>

<style scoped>
/* Light Mode Styles */
.modal-content {
  background-color: white;
  color: #212529;
}

.modal-header {
  background-color: white;
  border-bottom: 1px solid #dee2e6;
}

.modal-body {
  background-color: white;
}

.modal-footer {
  background-color: white;
  border-top: 1px solid #dee2e6;
}

.alert-info {
  background-color: #cff4fc;
  border-color: #b6effb;
  color: #055160;
}

.alert-danger {
  background-color: #f8d7da;
  border-color: #f5c2c7;
  color: #842029;
}

.alert-success {
  background-color: #d1e7dd;
  border-color: #badbcc;
  color: #0f5132;
}

.form-label {
  color: #212529;
}

.form-select {
  background-color: white;
  border-color: #dee2e6;
  color: #212529;
}

.form-control {
  background-color: white;
  border-color: #dee2e6;
  color: #212529;
}

.sticky-top {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f8f9fa;
}

.table {
  color: #212529;
}

.table-light {
  background-color: #f8f9fa;
  color: #212529;
}

.table-hover tbody tr:hover {
  background-color: #f8f9fa;
}

.badge {
  font-size: 0.75rem;
  padding: 0.25em 0.6em;
}

.text-muted {
  color: #6c757d !important;
}

/* Job dropdown customization - Light Mode */
:deep(.searchable-select .dropdown-menu) {
  max-height: 600px; /* Increased to show ~10 records */
  min-width: 650px; /* Wider to show full addresses */
  border: 1px solid #dee2e6;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

:deep(.searchable-select .dropdown-item) {
  white-space: normal; /* Allow text wrapping */
  padding: 0.75rem 1rem; /* More padding for readability */
  line-height: 1.5;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.searchable-select .dropdown-item:last-child) {
  border-bottom: none;
}

:deep(.searchable-select .select-input input) {
  font-weight: 500; /* Make selected job number more visible */
}

/* Dark Mode Support */
[data-theme="dark"] .sticky-top {
  background: var(--bg-secondary);
}

[data-theme="dark"] .table-hover tbody tr:hover {
  background-color: var(--bg-tertiary);
}

[data-theme="dark"] :deep(.searchable-select .dropdown-menu) {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5);
}

[data-theme="dark"] :deep(.searchable-select .dropdown-item) {
  color: var(--text-primary);
  border-bottom-color: var(--border-color);
}

[data-theme="dark"] :deep(.searchable-select .dropdown-item:hover) {
  background-color: var(--bg-tertiary);
}

[data-theme="dark"] :deep(.searchable-select .dropdown-item.selected) {
  background-color: rgba(13, 110, 253, 0.15);
}

[data-theme="dark"] :deep(.searchable-select .select-input input) {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-primary) !important;
}

[data-theme="dark"] :deep(.searchable-select .select-input input:focus) {
  background-color: var(--bg-secondary);
  color: var(--text-primary) !important;
  border-color: #0d6efd;
}

[data-theme="dark"] :deep(.searchable-select .select-input input.has-value) {
  background-color: var(--bg-tertiary);
  color: var(--text-primary) !important;
}

[data-theme="dark"] :deep(.searchable-select .select-input input::placeholder) {
  color: var(--text-secondary) !important;
  opacity: 0.6;
}

[data-theme="dark"] :deep(.searchable-select .dropdown-toggle-icon) {
  color: var(--text-secondary) !important;
}

/* Dark Mode - Modal Structure */
[data-theme="dark"] .modal-content {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

[data-theme="dark"] .modal-header {
  background-color: var(--bg-secondary);
  border-bottom-color: var(--border-color);
  color: var(--text-primary);
}

[data-theme="dark"] .modal-header .modal-title {
  color: var(--text-primary);
}

[data-theme="dark"] .modal-header .btn-close {
  filter: invert(1);
}

[data-theme="dark"] .modal-body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

[data-theme="dark"] .modal-footer {
  background-color: var(--bg-secondary);
  border-top-color: var(--border-color);
}

/* Dark Mode - Alerts */
[data-theme="dark"] .alert-info {
  background-color: rgba(13, 202, 240, 0.15);
  border-color: rgba(13, 202, 240, 0.3);
  color: #6edff6;
}

[data-theme="dark"] .alert-danger {
  background-color: rgba(220, 53, 69, 0.15);
  border-color: rgba(220, 53, 69, 0.3);
  color: #ea868f;
}

[data-theme="dark"] .alert-success {
  background-color: rgba(25, 135, 84, 0.15);
  border-color: rgba(25, 135, 84, 0.3);
  color: #75b798;
}

/* Dark Mode - Forms */
[data-theme="dark"] .form-label {
  color: var(--text-primary);
}

[data-theme="dark"] .form-select {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-primary);
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
}

[data-theme="dark"] .form-select:focus {
  background-color: var(--bg-secondary);
  border-color: #0d6efd;
  color: var(--text-primary);
}

[data-theme="dark"] .form-select option {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

[data-theme="dark"] .form-control {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

[data-theme="dark"] .form-control:focus {
  background-color: var(--bg-secondary);
  border-color: #0d6efd;
  color: var(--text-primary);
}

[data-theme="dark"] .form-control::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

/* Dark Mode - Table with higher specificity */
[data-theme="dark"] .job-preview-step .table-responsive {
  background-color: var(--bg-primary) !important;
}

[data-theme="dark"] .job-preview-step .table-responsive .sticky-top {
  background: var(--bg-secondary) !important;
}

[data-theme="dark"] .job-preview-step .table-responsive .table {
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
  background-color: var(--bg-primary) !important;
}

[data-theme="dark"] .job-preview-step .table-responsive .table thead {
  background-color: var(--bg-secondary) !important;
}

[data-theme="dark"] .job-preview-step .table-responsive .table thead th {
  background-color: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

[data-theme="dark"] .job-preview-step .table-responsive .table tbody {
  background-color: var(--bg-primary) !important;
}

[data-theme="dark"] .job-preview-step .table-responsive .table tbody tr {
  background-color: var(--bg-primary) !important;
}

[data-theme="dark"] .job-preview-step .table-responsive .table tbody td {
  background-color: var(--bg-primary) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

[data-theme="dark"] .job-preview-step .table-responsive .table-light {
  background-color: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

[data-theme="dark"] .job-preview-step .table-responsive .table-bordered {
  border-color: var(--border-color) !important;
}

[data-theme="dark"] .job-preview-step .table-responsive .table-bordered td,
[data-theme="dark"] .job-preview-step .table-responsive .table-bordered th {
  border-color: var(--border-color) !important;
}

[data-theme="dark"] .job-preview-step .table-responsive .table-hover tbody tr:hover {
  background-color: var(--bg-tertiary) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .job-preview-step .table-responsive .table-hover tbody tr:hover td {
  background-color: var(--bg-tertiary) !important;
  color: var(--text-primary) !important;
}

/* Dark Mode - Additional catch-all rules for stubborn Bootstrap overrides */
[data-theme="dark"] .modal-body table {
  background-color: var(--bg-primary) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .modal-body table tbody,
[data-theme="dark"] .modal-body table thead {
  background-color: var(--bg-primary) !important;
}

[data-theme="dark"] .modal-body table th {
  background-color: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .modal-body table td {
  background-color: var(--bg-primary) !important;
  color: var(--text-primary) !important;
}

/* Dark Mode - Text Colors */
[data-theme="dark"] .text-muted {
  color: var(--text-secondary) !important;
}

[data-theme="dark"] .text-primary {
  color: #6ea8fe !important;
}

[data-theme="dark"] small {
  color: var(--text-secondary);
}

/* Dark Mode - Badges */
[data-theme="dark"] .badge.bg-primary {
  background-color: #0d6efd !important;
  color: white;
}

[data-theme="dark"] .badge.bg-success {
  background-color: #198754 !important;
  color: white;
}

[data-theme="dark"] .badge.bg-info {
  background-color: #0dcaf0 !important;
  color: black;
}

[data-theme="dark"] .badge.bg-warning {
  background-color: #ffc107 !important;
  color: black;
}

[data-theme="dark"] .badge.bg-secondary {
  background-color: #6c757d !important;
  color: white;
}

[data-theme="dark"] .badge.bg-dark {
  background-color: #495057 !important;
  color: white;
}

/* Dark Mode - Buttons */
[data-theme="dark"] .btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
  color: white;
}

[data-theme="dark"] .btn-secondary:hover {
  background-color: #5c636a;
  border-color: #565e64;
}

[data-theme="dark"] .btn-outline-secondary {
  color: #adb5bd;
  border-color: #6c757d;
}

[data-theme="dark"] .btn-outline-secondary:hover {
  background-color: #6c757d;
  border-color: #6c757d;
  color: white;
}
</style>
