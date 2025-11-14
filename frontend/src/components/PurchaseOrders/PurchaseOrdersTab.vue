<template>
  <div class="purchase-orders-tab h-100 d-flex flex-column">
    <!-- Header -->
    <div class="tab-header d-flex justify-content-between align-items-center p-3 border-bottom">
      <div class="d-flex align-items-center gap-3">
        <h4 class="mb-0">
          <i class="bi bi-receipt-cutoff me-2"></i>
          Purchase Orders
        </h4>
        <div v-if="selectedJob" class="badge bg-primary">
          Job {{ selectedJob.JobNo }}: {{ selectedJob.JobName }}
        </div>
      </div>

      <div class="d-flex gap-2">
        <!-- Template Gallery Button -->
        <button
          class="btn btn-outline-secondary"
          @click="showTemplateGallery = true"
          title="Manage Templates">
          <i class="bi bi-file-earmark-text me-1"></i>
          Templates
        </button>

        <!-- Select Job Button -->
        <button
          class="btn btn-primary"
          @click="showJobSelector = true">
          <i class="bi bi-folder2-open me-1"></i>
          Select Job
        </button>

        <!-- Refresh Button -->
        <button
          class="btn btn-outline-secondary"
          @click="refreshOrders"
          :disabled="loading"
          title="Refresh Orders">
          <i class="bi bi-arrow-clockwise" :class="{ 'spin': loading }"></i>
        </button>
      </div>
    </div>

    <!-- Job Summary Bar -->
    <div v-if="selectedJob" class="job-summary p-3 bg-light border-bottom">
      <div class="row">
        <div class="col-md-3">
          <small class="text-muted">Client:</small>
          <div>{{ selectedJob.Client || 'N/A' }}</div>
        </div>
        <div class="col-md-3">
          <small class="text-muted">Total Orders:</small>
          <div><strong>{{ orders.length }}</strong></div>
        </div>
        <div class="col-md-3">
          <small class="text-muted">Logged:</small>
          <div class="text-primary">
            <strong>{{ loggedCount }}</strong>
          </div>
        </div>
        <div class="col-md-3">
          <small class="text-muted">To Order:</small>
          <div class="text-success">
            <strong>{{ toOrderCount }}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- No Job Selected State -->
    <div v-if="!selectedJob" class="flex-fill d-flex align-items-center justify-content-center">
      <div class="text-center">
        <i class="bi bi-folder2-open" style="font-size: 4rem; color: #ccc;"></i>
        <h5 class="mt-3 text-muted">No Job Selected</h5>
        <p class="text-muted">Select a job to view and manage purchase orders</p>
        <button class="btn btn-primary" @click="showJobSelector = true">
          <i class="bi bi-folder2-open me-2"></i>
          Select Job
        </button>
      </div>
    </div>

    <!-- Orders Grid -->
    <div v-else class="flex-fill position-relative">
      <!-- Loading Overlay -->
      <div v-if="loading" class="loading-overlay">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <!-- AG Grid -->
      <ag-grid-vue
        v-if="!loading"
        class="ag-theme-quartz"
        :class="{ 'ag-theme-quartz-dark': isDarkMode }"
        style="width: 100%; height: 100%;"
        :columnDefs="columnDefs"
        :rowData="orders"
        :defaultColDef="defaultColDef"
        :pagination="true"
        :paginationPageSize="20"
        :paginationPageSizeSelector="[10, 20, 50, 100]"
        :rowSelection="'multiple'"
        :suppressRowClickSelection="true"
        :enableCellTextSelection="true"
        :tooltipShowDelay="500"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
      ></ag-grid-vue>
    </div>

    <!-- Action Bar -->
    <div v-if="selectedJob && !loading" class="action-bar p-3 border-top bg-light">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <span v-if="selectedOrders.length > 0" class="text-muted">
            {{ selectedOrders.length }} order(s) selected
          </span>
        </div>
        <div class="d-flex gap-2">
          <button
            class="btn btn-sm btn-outline-secondary"
            :disabled="selectedOrders.length === 0"
            @click="previewSelected">
            <i class="bi bi-eye me-1"></i>
            Preview
          </button>
          <button
            class="btn btn-sm btn-primary"
            :disabled="selectedOrders.length === 0"
            @click="printSelected">
            <i class="bi bi-printer me-1"></i>
            Print
          </button>
          <button
            class="btn btn-sm btn-success"
            :disabled="selectedOrders.length === 0"
            @click="emailSelected">
            <i class="bi bi-envelope me-1"></i>
            Email
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <JobSelector
      v-if="showJobSelector"
      @job-selected="onJobSelected"
      @close="showJobSelector = false"
    />

    <TemplateGallery
      v-if="showTemplateGallery"
      @close="showTemplateGallery = false"
    />

    <OrderPreviewModal
      v-if="showOrderPreview"
      :orderNumber="previewOrderNumber"
      @close="showOrderPreview = false"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, inject } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '@/composables/useElectronAPI';
import JobSelector from './JobSelector.vue';
import TemplateGallery from './TemplateGallery.vue';
import OrderPreviewModal from './OrderPreviewModal.vue';

export default {
  name: 'PurchaseOrdersTab',
  components: {
    AgGridVue,
    JobSelector,
    TemplateGallery,
    OrderPreviewModal
  },
  setup() {
    const api = useElectronAPI();
    const isDarkMode = inject('isDarkMode', ref(false));

    // State
    const selectedJob = ref(null);
    const orders = ref([]);
    const loading = ref(false);
    const gridApi = ref(null);
    const selectedOrders = ref([]);

    // Modal states
    const showJobSelector = ref(false);
    const showTemplateGallery = ref(false);
    const showOrderPreview = ref(false);
    const previewOrderNumber = ref('');

    // Computed
    const loggedCount = computed(() => {
      return orders.value.filter(o => o.IsLogged === 1).length;
    });

    const toOrderCount = computed(() => {
      return orders.value.filter(o => o.IsLogged === 0).length;
    });

    // AG Grid Configuration
    const defaultColDef = {
      sortable: true,
      filter: true,
      resizable: true,
      floatingFilter: true
    };

    const columnDefs = [
      {
        headerName: '',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 50,
        pinned: 'left',
        lockPosition: true,
        suppressMenu: true,
        filter: false
      },
      {
        headerName: 'Status',
        field: 'IsLogged',
        width: 100,
        cellRenderer: (params) => {
          if (params.value === 1) {
            return '<span class="badge bg-primary">Logged</span>';
          } else {
            return '<span class="badge bg-success">To Order</span>';
          }
        },
        filter: 'agSetColumnFilter',
        filterParams: {
          valueFormatter: (params) => params.value === 1 ? 'Logged' : 'To Order'
        }
      },
      {
        headerName: 'Order Number',
        field: 'OrderNumber',
        width: 150,
        pinned: 'left',
        cellRenderer: (params) => {
          return `<strong>${params.value}</strong>`;
        }
      },
      {
        headerName: 'Cost Centre',
        field: 'CostCentre',
        width: 120
      },
      {
        headerName: 'Cost Centre Name',
        field: 'CostCentreName',
        width: 200,
        flex: 1
      },
      {
        headerName: 'Supplier',
        field: 'SupplierName',
        width: 200,
        cellRenderer: (params) => {
          if (!params.value) {
            return '<span class="text-muted fst-italic">Not assigned</span>';
          }
          return params.value;
        }
      },
      {
        headerName: 'Items',
        field: 'ItemCount',
        width: 100,
        type: 'numericColumn'
      },
      {
        headerName: 'Total',
        field: 'OrderTotal',
        width: 120,
        type: 'numericColumn',
        valueFormatter: (params) => {
          if (params.value === null || params.value === undefined) return '$0.00';
          return '$' + parseFloat(params.value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
      },
      {
        headerName: 'Order Date',
        field: 'OrderDate',
        width: 120,
        valueFormatter: (params) => {
          if (!params.value) return '';
          return new Date(params.value).toLocaleDateString('en-AU');
        }
      },
      {
        headerName: 'Actions',
        width: 150,
        pinned: 'right',
        cellRenderer: (params) => {
          return `
            <div class="d-flex gap-1">
              <button class="btn btn-sm btn-outline-primary preview-btn" data-order="${params.data.OrderNumber}" title="Preview">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-sm btn-outline-secondary edit-btn" data-order="${params.data.OrderNumber}" title="Edit">
                <i class="bi bi-pencil"></i>
              </button>
            </div>
          `;
        },
        suppressMenu: true,
        filter: false,
        sortable: false
      }
    ];

    // Methods
    const onGridReady = (params) => {
      gridApi.value = params.api;

      // Add event listeners for action buttons
      const gridElement = params.api.getGridElement();
      gridElement.addEventListener('click', (e) => {
        if (e.target.closest('.preview-btn')) {
          const orderNumber = e.target.closest('.preview-btn').dataset.order;
          previewOrder(orderNumber);
        } else if (e.target.closest('.edit-btn')) {
          const orderNumber = e.target.closest('.edit-btn').dataset.order;
          editOrder(orderNumber);
        }
      });
    };

    const onSelectionChanged = () => {
      if (gridApi.value) {
        selectedOrders.value = gridApi.value.getSelectedRows();
      }
    };

    const onJobSelected = async (job) => {
      selectedJob.value = job;
      showJobSelector.value = false;
      await loadOrders();
    };

    const loadOrders = async () => {
      if (!selectedJob.value) return;

      loading.value = true;
      try {
        const result = await api.purchaseOrders.getOrdersForJob(selectedJob.value.JobNo);

        if (result.success) {
          orders.value = result.orders;
        } else {
          console.error('Failed to load orders:', result.message);
          alert('Failed to load orders: ' + result.message);
        }
      } catch (error) {
        console.error('Error loading orders:', error);
        alert('Error loading orders: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    const refreshOrders = async () => {
      await loadOrders();
    };

    const previewOrder = (orderNumber) => {
      previewOrderNumber.value = orderNumber;
      showOrderPreview.value = true;
    };

    const previewSelected = () => {
      if (selectedOrders.value.length > 0) {
        previewOrder(selectedOrders.value[0].OrderNumber);
      }
    };

    const editOrder = (orderNumber) => {
      console.log('Edit order:', orderNumber);
      // TODO: Implement edit functionality
      alert('Edit functionality coming soon!');
    };

    const printSelected = () => {
      console.log('Print selected:', selectedOrders.value);
      // TODO: Implement print functionality
      alert('Print functionality coming soon!');
    };

    const emailSelected = () => {
      console.log('Email selected:', selectedOrders.value);
      // TODO: Implement email functionality
      alert('Email functionality coming soon!');
    };

    return {
      isDarkMode,
      selectedJob,
      orders,
      loading,
      selectedOrders,
      showJobSelector,
      showTemplateGallery,
      showOrderPreview,
      previewOrderNumber,
      loggedCount,
      toOrderCount,
      defaultColDef,
      columnDefs,
      onGridReady,
      onSelectionChanged,
      onJobSelected,
      refreshOrders,
      previewSelected,
      printSelected,
      emailSelected
    };
  }
};
</script>

<style scoped>
.purchase-orders-tab {
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.job-summary {
  font-size: 0.9rem;
}

.action-bar {
  box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
}
</style>
