<template>
  <div class="modal fade show d-block" tabindex="-1" @click.self="closeModal">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <!-- Header -->
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-folder2-open me-2"></i>
            Select Job
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>

        <!-- Search -->
        <div class="modal-body p-0">
          <div class="p-3 border-bottom bg-light">
            <div class="input-group">
              <span class="input-group-text">
                <i class="bi bi-search"></i>
              </span>
              <input
                v-model="searchQuery"
                type="text"
                class="form-control"
                placeholder="Search by job number, name, or client..."
                @input="filterJobs">
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="p-5 text-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">Loading jobs...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="p-5 text-center">
            <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
            <p class="mt-3 text-danger">{{ error }}</p>
            <button class="btn btn-primary" @click="loadJobs">
              <i class="bi bi-arrow-clockwise me-2"></i>
              Retry
            </button>
          </div>

          <!-- Empty State -->
          <div v-else-if="filteredJobs.length === 0" class="p-5 text-center">
            <i class="bi bi-folder-x text-muted" style="font-size: 3rem;"></i>
            <p class="mt-3 text-muted">
              {{ searchQuery ? 'No jobs match your search' : 'No jobs with orders found' }}
            </p>
          </div>

          <!-- Jobs List -->
          <div v-else class="jobs-list">
            <div
              v-for="job in filteredJobs"
              :key="job.JobNo"
              class="job-item p-3 border-bottom"
              :class="{ 'selected': selectedJobNo === job.JobNo }"
              @click="selectJob(job)">
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-fill">
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <strong class="job-number">{{ job.JobNo }}</strong>
                    <span v-if="job.Status" class="badge bg-secondary">{{ job.Status }}</span>
                  </div>
                  <div class="job-name text-primary mb-1">{{ job.JobName }}</div>
                  <div v-if="job.Client" class="job-client text-muted small">
                    <i class="bi bi-building me-1"></i>
                    {{ job.Client }}
                  </div>
                </div>
                <div class="job-stats text-end ms-3">
                  <div class="mb-1">
                    <span class="badge bg-light text-dark">
                      {{ job.OrderCount || 0 }} orders
                    </span>
                  </div>
                  <div v-if="job.LoggedCount > 0" class="small">
                    <span class="text-primary">
                      <i class="bi bi-check-circle me-1"></i>
                      {{ job.LoggedCount }} logged
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!selectedJobNo"
            @click="confirmSelection">
            <i class="bi bi-check-lg me-2"></i>
            Select Job
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useElectronAPI } from '../../composables/useElectronAPI';

export default {
  name: 'JobSelector',
  emits: ['job-selected', 'close'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    // State
    const jobs = ref([]);
    const loading = ref(false);
    const error = ref('');
    const searchQuery = ref('');
    const selectedJobNo = ref('');

    // Computed
    const filteredJobs = computed(() => {
      if (!searchQuery.value) return jobs.value;

      const query = searchQuery.value.toLowerCase();
      return jobs.value.filter(job => {
        return (
          job.JobNo.toLowerCase().includes(query) ||
          job.JobName.toLowerCase().includes(query) ||
          (job.Client && job.Client.toLowerCase().includes(query))
        );
      });
    });

    // Methods
    const loadJobs = async () => {
      loading.value = true;
      error.value = '';

      try {
        const result = await api.purchaseOrders.getJobsWithOrderCounts();

        if (result.success) {
          jobs.value = result.jobs;
        } else {
          error.value = result.message || 'Failed to load jobs';
        }
      } catch (err) {
        console.error('Error loading jobs:', err);
        error.value = err.message || 'Failed to load jobs';
      } finally {
        loading.value = false;
      }
    };

    const selectJob = (job) => {
      selectedJobNo.value = job.JobNo;
    };

    const confirmSelection = () => {
      const job = jobs.value.find(j => j.JobNo === selectedJobNo.value);
      if (job) {
        emit('job-selected', job);
      }
    };

    const closeModal = () => {
      emit('close');
    };

    const filterJobs = () => {
      // Triggered on search input - filteredJobs computed property handles the filtering
    };

    // Lifecycle
    onMounted(() => {
      loadJobs();
    });

    return {
      jobs,
      loading,
      error,
      searchQuery,
      selectedJobNo,
      filteredJobs,
      loadJobs,
      selectJob,
      confirmSelection,
      closeModal,
      filterJobs
    };
  }
};
</script>

<style scoped>
.modal {
  background: rgba(0, 0, 0, 0.5);
}

.jobs-list {
  max-height: 60vh;
  overflow-y: auto;
}

.job-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.job-item:hover {
  background-color: #f8f9fa;
}

.job-item.selected {
  background-color: #e7f3ff;
  border-left: 4px solid #0d6efd;
}

.job-number {
  font-size: 1.1rem;
  color: #212529;
}

.job-name {
  font-size: 1rem;
  font-weight: 500;
}

.job-client {
  font-size: 0.875rem;
}

.job-stats {
  min-width: 100px;
}
</style>
