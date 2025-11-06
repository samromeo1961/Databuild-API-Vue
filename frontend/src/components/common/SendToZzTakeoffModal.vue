<template>
  <div
    class="modal fade"
    :id="modalId"
    tabindex="-1"
    aria-labelledby="sendToZzTakeoffLabel"
    aria-hidden="true"
    ref="modalRef"
  >
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="sendToZzTakeoffLabel">
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 30'%3E%3Ctext x='0' y='20' font-family='Arial' font-size='20' font-weight='bold'%3E%3Ctspan fill='%23FFB900'%3Ezz%3C/tspan%3E%3Ctspan fill='%23000'%3ETakeoff%3C/tspan%3E%3C/text%3E%3C/svg%3E"
                 alt="zzTakeoff" style="height: 24px; margin-right: 8px;" />
            Send to zzTakeoff
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="modal-body">
          <!-- Step 1: Select Project -->
          <div v-if="currentStep === 1" class="step-content">
            <h6 class="mb-3">
              <i class="bi bi-folder2-open me-2"></i>
              Step 1: Select Project
            </h6>

            <div class="mb-3">
              <input
                type="text"
                class="form-control"
                placeholder="Search projects..."
                v-model="projectSearch"
              />
            </div>

            <div class="project-list">
              <div class="list-group">
                <!-- Recent Projects -->
                <div class="list-group-item list-group-item-action disabled bg-light">
                  <i class="bi bi-clock-history me-2"></i>
                  <strong>Recent</strong>
                </div>
                <button
                  v-for="project in filteredRecentProjects"
                  :key="'recent-' + project.id"
                  type="button"
                  class="list-group-item list-group-item-action"
                  :class="{ 'active': selectedProject?.id === project.id }"
                  @click="selectProject(project)"
                >
                  <i class="bi bi-folder me-2"></i>
                  {{ project.name }}
                </button>

                <!-- All Projects -->
                <div class="list-group-item list-group-item-action disabled bg-light mt-2">
                  <i class="bi bi-collection me-2"></i>
                  <strong>All Projects</strong>
                </div>
                <button
                  v-for="project in filteredProjects"
                  :key="project.id"
                  type="button"
                  class="list-group-item list-group-item-action"
                  :class="{ 'active': selectedProject?.id === project.id }"
                  @click="selectProject(project)"
                >
                  <i class="bi bi-folder me-2"></i>
                  {{ project.name }}
                </button>

                <!-- Create New Project -->
                <button
                  type="button"
                  class="list-group-item list-group-item-action list-group-item-primary"
                  @click="showCreateProject = true"
                >
                  <i class="bi bi-plus-circle me-2"></i>
                  <strong>Create New Project</strong>
                </button>
              </div>
            </div>

            <!-- Create New Project Form -->
            <div v-if="showCreateProject" class="mt-3 p-3 border rounded">
              <h6>Create New Project</h6>
              <div class="mb-2">
                <label class="form-label">Project Name</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="newProjectName"
                  placeholder="Enter project name..."
                />
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-primary" @click="createNewProject">
                  <i class="bi bi-check-lg me-1"></i>
                  Create
                </button>
                <button class="btn btn-sm btn-secondary" @click="showCreateProject = false">
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <!-- Step 2: Configure Items -->
          <div v-if="currentStep === 2" class="step-content">
            <h6 class="mb-3">
              <i class="bi bi-gear me-2"></i>
              Step 2: Configure Items ({{ items.length }} items)
            </h6>

            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              Sending to project: <strong>{{ selectedProject?.name }}</strong>
            </div>

            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
              <table class="table table-sm table-hover">
                <thead class="sticky-top bg-light">
                  <tr>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Takeoff Type</th>
                    <th>Cost Type</th>
                    <th>Units</th>
                    <th>Cost Each</th>
                    <th>Markup %</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in itemsConfig" :key="index">
                    <td>{{ item.code }}</td>
                    <td>{{ item.description }}</td>
                    <td>
                      <select class="form-select form-select-sm" v-model="item.takeoffType">
                        <option value="Area">Area</option>
                        <option value="Linear">Linear</option>
                        <option value="Segment">Segment</option>
                        <option value="Count">Count</option>
                      </select>
                    </td>
                    <td>
                      <select class="form-select form-select-sm" v-model="item.costType">
                        <option value="Subcontra">Subcontra</option>
                        <option value="Material">Material</option>
                        <option value="Labor">Labor</option>
                        <option value="Equipment">Equipment</option>
                      </select>
                    </td>
                    <td>
                      <input type="text" class="form-control form-control-sm" v-model="item.units" />
                    </td>
                    <td>
                      <input type="number" class="form-control form-control-sm" v-model.number="item.costEach" step="0.01" />
                    </td>
                    <td>
                      <input type="number" class="form-control form-control-sm" v-model.number="item.markup" step="1" />
                    </td>
                    <td>
                      <input type="number" class="form-control form-control-sm" v-model.number="item.quantity" step="1" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Step 3: Review & Send -->
          <div v-if="currentStep === 3" class="step-content">
            <h6 class="mb-3">
              <i class="bi bi-check-circle me-2"></i>
              Step 3: Review & Send
            </h6>

            <div class="alert alert-success">
              <h6><i class="bi bi-check-circle me-2"></i>Ready to Send</h6>
              <p class="mb-0">
                <strong>Project:</strong> {{ selectedProject?.name }}<br />
                <strong>Items:</strong> {{ items.length }}<br />
                <strong>Total Cost:</strong> ${{ totalCost.toFixed(2) }}
              </p>
            </div>

            <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
              <table class="table table-sm">
                <thead class="sticky-top bg-light">
                  <tr>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Units</th>
                    <th>Cost</th>
                    <th>Markup</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in itemsConfig" :key="index">
                    <td>{{ item.code }}</td>
                    <td>{{ item.description }}</td>
                    <td>
                      <span class="badge bg-info">{{ item.takeoffType }}</span>
                      <span class="badge bg-secondary ms-1">{{ item.costType }}</span>
                    </td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ item.units }}</td>
                    <td>${{ item.costEach.toFixed(2) }}</td>
                    <td>{{ item.markup }}%</td>
                    <td>${{ ((item.costEach * item.quantity) * (1 + item.markup/100)).toFixed(2) }}</td>
                  </tr>
                </tbody>
                <tfoot class="fw-bold">
                  <tr>
                    <td colspan="7" class="text-end">Total:</td>
                    <td>${{ totalCost.toFixed(2) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div v-if="sendStatus" class="mt-3">
              <div :class="['alert', sendStatus.success ? 'alert-success' : 'alert-danger']">
                <i :class="['bi', sendStatus.success ? 'bi-check-circle' : 'bi-exclamation-triangle', 'me-2']"></i>
                {{ sendStatus.message }}
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            v-if="currentStep > 1"
            type="button"
            class="btn btn-outline-secondary"
            @click="previousStep"
          >
            <i class="bi bi-arrow-left me-1"></i>
            Previous
          </button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
            {{ currentStep === 3 && sendStatus?.success ? 'Close' : 'Cancel' }}
          </button>
          <button
            v-if="currentStep < 3"
            type="button"
            class="btn btn-primary"
            :disabled="!canProceed"
            @click="nextStep"
          >
            Next
            <i class="bi bi-arrow-right ms-1"></i>
          </button>
          <button
            v-if="currentStep === 3 && !sendStatus"
            type="button"
            class="btn btn-warning"
            @click="sendToZzTakeoff"
            :disabled="sending"
          >
            <span v-if="sending">
              <span class="spinner-border spinner-border-sm me-2"></span>
              Sending...
            </span>
            <span v-else>
              <i class="bi bi-send me-1"></i>
              Send to zzTakeoff
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Modal } from 'bootstrap';
import { useRouter } from 'vue-router';
import { useElectronAPI } from '../../composables/useElectronAPI';

const api = useElectronAPI();
const router = useRouter();

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  modalId: {
    type: String,
    default: 'sendToZzTakeoffModal'
  }
});

const emit = defineEmits(['sent', 'closed']);

// Modal ref
const modalRef = ref(null);
let modalInstance = null;

// Step management
const currentStep = ref(1);

// Project selection
const projects = ref([
  { id: 'demo-metric', name: 'Demo Metric' },
  { id: 'american-farmhouse', name: 'American Farmhouse' },
  { id: 'commercial-project', name: 'Commercial Project' },
  { id: 'farmhouse', name: 'farmhouse' },
  { id: 'farmhouse-demo', name: 'Farmhouse Demo' },
  { id: 'holidays', name: 'Holidays' }
]);

const recentProjects = ref([
  { id: 'demo-metric', name: 'Demo Metric' }
]);

const selectedProject = ref(null);
const projectSearch = ref('');
const showCreateProject = ref(false);
const newProjectName = ref('');

// Items configuration
const itemsConfig = ref([]);

// Send status
const sending = ref(false);
const sendStatus = ref(null);

// Filtered projects
const filteredProjects = computed(() => {
  if (!projectSearch.value) return projects.value;
  const search = projectSearch.value.toLowerCase();
  return projects.value.filter(p => p.name.toLowerCase().includes(search));
});

const filteredRecentProjects = computed(() => {
  if (!projectSearch.value) return recentProjects.value;
  const search = projectSearch.value.toLowerCase();
  return recentProjects.value.filter(p => p.name.toLowerCase().includes(search));
});

// Can proceed validation
const canProceed = computed(() => {
  if (currentStep.value === 1) return selectedProject.value !== null;
  if (currentStep.value === 2) return itemsConfig.value.length > 0;
  return true;
});

// Total cost calculation
const totalCost = computed(() => {
  return itemsConfig.value.reduce((sum, item) => {
    const itemTotal = (item.costEach * item.quantity) * (1 + item.markup/100);
    return sum + itemTotal;
  }, 0);
});

// Initialize items config
const initializeItems = () => {
  itemsConfig.value = props.items.map(item => ({
    code: item.ItemCode || item.PriceCode,
    description: item.Description,
    takeoffType: 'Area',
    costType: 'Subcontra',
    units: item.Unit || 'm2',
    costEach: item.Price || 0,
    markup: 35,
    quantity: item.quantity || 1,
    originalItem: item
  }));
};

// Select project
const selectProject = (project) => {
  selectedProject.value = project;
};

// Create new project
const createNewProject = () => {
  if (!newProjectName.value) return;

  const newProject = {
    id: `project-${Date.now()}`,
    name: newProjectName.value
  };

  projects.value.unshift(newProject);
  selectedProject.value = newProject;
  showCreateProject.value = false;
  newProjectName.value = '';
};

// Navigation
const nextStep = () => {
  if (canProceed.value) {
    currentStep.value++;
  }
};

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
    sendStatus.value = null;
  }
};

// Send to zzTakeoff
const sendToZzTakeoff = async () => {
  sending.value = true;
  sendStatus.value = null;

  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Transform items to zzTakeoff format
    const zzTakeoffItems = itemsConfig.value.map(item => {
      // Map takeoffType to lowercase for zzTakeoff
      const typeMapping = {
        'Area': 'area',
        'Linear': 'linear',
        'Segment': 'segment',
        'Count': 'count'
      };

      return {
        type: typeMapping[item.takeoffType] || 'count',
        properties: {
          name: {
            value: item.description
          },
          sku: {
            value: item.code
          },
          unit: {
            value: item.units
          },
          'Cost Each': {
            value: item.costEach.toString()
          },
          'cost centre': {
            value: item.originalItem?.CostCentre || ''
          }
        }
      };
    });

    const payload = {
      project: selectedProject.value,
      items: zzTakeoffItems,
      totalCost: totalCost.value,
      timestamp: new Date().toISOString()
    };

    // Save to send history (with original format for display)
    await api.sendHistory.add({
      project: selectedProject.value.name,
      items: itemsConfig.value.map(item => ({
        code: item.code,
        description: item.description,
        takeoffType: item.takeoffType,
        costType: item.costType,
        units: item.units,
        costEach: item.costEach,
        markup: item.markup,
        quantity: item.quantity,
        total: (item.costEach * item.quantity) * (1 + item.markup/100)
      })),
      status: 'Success (Simulated)',
      sentAt: payload.timestamp,
      itemCount: payload.items.length,
      totalCost: totalCost.value
    });

    sendStatus.value = {
      success: true,
      message: `Successfully sent ${payload.items.length} items to zzTakeoff project "${selectedProject.value.name}"`
    };

    console.log('[zzTakeoff] Items ready for startTakeoffWithProperties:', JSON.stringify(zzTakeoffItems, null, 2));

    // Navigate to zzTakeoff Web tab and execute Router.go() to open Takeoff tab
    try {
      // Only navigate if not already on the zzTakeoff tab (to preserve maximized state)
      if (router.currentRoute.value.path !== '/zztakeoff-web') {
        console.log('[zzTakeoff] Navigating to zzTakeoff Web tab...');
        await router.push('/zztakeoff-web');
        // Wait a moment for the BrowserView to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log('[zzTakeoff] Already on zzTakeoff Web tab, preserving maximized state');
        // Just a short delay to ensure modal has closed
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Execute zzTakeoff developer's code to navigate to Takeoff tab
      if (api.webview && api.webview.executeJavaScript) {
        const result = await api.webview.executeJavaScript(`
          (function() {
            try {
              // Check if Router and appLayout are available
              if (typeof Router === 'undefined') {
                return { success: false, error: 'Router is not defined' };
              }
              if (typeof appLayout === 'undefined') {
                return { success: false, error: 'appLayout is not defined' };
              }

              // Execute zzTakeoff's navigation code
              const takeoffUrl = appLayout.getAppUrl('takeoff');
              console.log('[zzTakeoff] Navigating to:', takeoffUrl);
              Router.go(takeoffUrl);

              return { success: true, url: takeoffUrl };
            } catch (error) {
              return { success: false, error: error.message, stack: error.stack };
            }
          })()
        `);

        console.log('[zzTakeoff] Router.go() execution result:', result);

        if (result && result.success) {
          console.log('[zzTakeoff] Successfully navigated to Takeoff tab:', result.url);
        } else {
          console.error('[zzTakeoff] Failed to navigate to Takeoff tab:', result?.error);
        }
      }
    } catch (error) {
      console.error('[zzTakeoff] Error navigating to Takeoff tab:', error);
      // Don't fail the whole send operation if navigation fails
    }

    emit('sent', payload);
  } catch (err) {
    console.error('Error sending to zzTakeoff:', err);
    sendStatus.value = {
      success: false,
      message: 'Failed to send items to zzTakeoff: ' + err.message
    };
  } finally {
    sending.value = false;
  }
};

// Show modal
const show = () => {
  initializeItems();
  currentStep.value = 1;
  selectedProject.value = null;
  sendStatus.value = null;
  if (modalInstance) {
    modalInstance.show();
  }
};

// Hide modal
const hide = () => {
  if (modalInstance) {
    modalInstance.hide();
  }
};

// Expose show/hide methods
defineExpose({
  show,
  hide
});

onMounted(() => {
  if (modalRef.value) {
    modalInstance = new Modal(modalRef.value);

    // Listen for modal close
    modalRef.value.addEventListener('hidden.bs.modal', () => {
      emit('closed');
    });
  }
});
</script>

<style scoped>
.step-content {
  min-height: 400px;
}

.project-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.list-group-item.active {
  background-color: #0d6efd;
  border-color: #0d6efd;
}

.sticky-top {
  position: sticky;
  top: 0;
  z-index: 10;
}

/* Dark mode styles */
[data-theme="dark"] .modal-content {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

[data-theme="dark"] .modal-header,
[data-theme="dark"] .modal-footer {
  border-color: var(--border-color);
}

[data-theme="dark"] .form-control,
[data-theme="dark"] .form-select {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

[data-theme="dark"] .table {
  color: var(--text-primary);
}

[data-theme="dark"] .table thead {
  background-color: var(--bg-tertiary);
}

[data-theme="dark"] .list-group-item {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

[data-theme="dark"] .list-group-item.active {
  background-color: #0d6efd;
  color: white;
}

[data-theme="dark"] .list-group-item.disabled {
  background-color: var(--bg-tertiary);
}

[data-theme="dark"] .bg-light {
  background-color: var(--bg-tertiary) !important;
}
</style>
