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
          Job {{ selectedJob.JobNo }}: {{ selectedJob.SiteStreet || selectedJob.JobName }}
        </div>
      </div>

      <div class="d-flex gap-2">
        <!-- Nominated Suppliers Button -->
        <button
          class="btn btn-outline-warning"
          @click="showNominatedSuppliers = true"
          title="Manage Nominated Suppliers">
          <i class="bi bi-star me-1"></i>
          Suppliers
        </button>

        <!-- Template Gallery Button -->
        <button
          class="btn btn-outline-secondary"
          @click="showTemplateGallery = true"
          title="Manage Templates">
          <i class="bi bi-file-earmark-text me-1"></i>
          Templates
        </button>

        <!-- Assets Library Button -->
        <button
          class="btn btn-outline-info"
          @click="showAssetsLibrary = true"
          title="Manage Assets (Logos, CSS, Fonts)">
          <i class="bi bi-folder2-open me-1"></i>
          Assets
        </button>

        <!-- Partials Library Button -->
        <button
          class="btn btn-outline-success"
          @click="showPartialsLibrary = true"
          title="Manage Template Partials (Reusable Fragments)">
          <i class="bi bi-puzzle me-1"></i>
          Partials
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
    <div v-if="selectedJob" class="job-summary p-3 border-bottom" :class="isDarkMode ? 'bg-dark' : 'bg-light'">
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
    <div v-else class="flex-fill position-relative" ref="gridContainer" @click="handleGridClick">
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
        theme="legacy"
        :columnDefs="columnDefs"
        :rowData="orders"
        :defaultColDef="defaultColDef"
        :pagination="true"
        :paginationPageSize="20"
        :paginationPageSizeSelector="[10, 20, 50, 100]"
        :rowSelection="rowSelectionConfig"
        :enableCellTextSelection="true"
        :tooltipShowDelay="500"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @cell-value-changed="onCellValueChanged"
      ></ag-grid-vue>
    </div>

    <!-- Action Bar -->
    <div v-if="selectedJob && !loading" class="action-bar p-3 border-top" :class="isDarkMode ? 'bg-dark' : 'bg-light'">
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
            class="btn btn-sm btn-outline-primary"
            :disabled="selectedOrders.length === 0"
            @click="saveAsPDFSelected">
            <i class="bi bi-file-pdf me-1"></i>
            Save as PDF
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

    <OrderEditModal
      v-if="showOrderEdit"
      :orderNumber="editOrderNumber"
      @close="showOrderEdit = false"
      @saved="onOrderSaved"
    />

    <NominatedSuppliersModal
      v-if="showNominatedSuppliers"
      @close="showNominatedSuppliers = false"
      @updated="onSuppliersUpdated"
    />

    <AssetsLibrary
      v-if="showAssetsLibrary"
      @close="showAssetsLibrary = false"
    />

    <PartialsLibrary
      v-if="showPartialsLibrary"
      @close="showPartialsLibrary = false"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, inject } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '../../composables/useElectronAPI';
import JobSelector from './JobSelector.vue';
import TemplateGallery from './TemplateGallery.vue';
import OrderPreviewModal from './OrderPreviewModal.vue';
import OrderEditModal from './OrderEditModal.vue';
import NominatedSuppliersModal from './NominatedSuppliersModal.vue';
import SupplierCellEditor from './SupplierCellEditor.vue';
import AssetsLibrary from '../common/AssetsLibrary.vue';
import PartialsLibrary from '../common/PartialsLibrary.vue';

export default {
  name: 'PurchaseOrdersTab',
  components: {
    AgGridVue,
    JobSelector,
    TemplateGallery,
    OrderPreviewModal,
    OrderEditModal,
    NominatedSuppliersModal,
    SupplierCellEditor,
    AssetsLibrary,
    PartialsLibrary
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
    const gridContainer = ref(null);
    const suppliersByCostCentre = ref({}); // Map of cost centre -> nominated suppliers

    // Modal states
    const showJobSelector = ref(false);
    const showTemplateGallery = ref(false);
    const showOrderPreview = ref(false);
    const previewOrderNumber = ref('');
    const showOrderEdit = ref(false);
    const editOrderNumber = ref('');
    const showNominatedSuppliers = ref(false);
    const showAssetsLibrary = ref(false);
    const showPartialsLibrary = ref(false);

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

    const rowSelectionConfig = {
      mode: 'multiRow',
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: false
    };

    const columnDefs = [
      {
        headerName: '',
        width: 50,
        pinned: 'left',
        lockPosition: true,
        suppressHeaderMenuButton: true,
        filter: false
      },
      {
        headerName: 'Status',
        field: 'Status',
        width: 120,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['Draft', 'Ordered', 'Cancelled']
        },
        cellRenderer: (params) => {
          const status = params.value || 'Draft';
          switch (status) {
            case 'Ordered':
              return '<span class="badge bg-primary">Ordered</span>';
            case 'Cancelled':
              return '<span class="badge bg-danger">Cancelled</span>';
            case 'Draft':
            default:
              return '<span class="badge bg-success">Draft</span>';
          }
        },
        filter: 'agTextColumnFilter',
        filterParams: {
          valueFormatter: (params) => params.value || 'Draft'
        },
        tooltipValueGetter: (params) => {
          return 'Click to change status (Draft / Ordered / Cancelled)';
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
        width: 250,
        editable: (params) => {
          // Only allow editing for unlogged orders
          return params.data.IsLogged === 0;
        },
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: (params) => {
          // Get pre-loaded nominated suppliers for this order's cost centre
          const costCentre = params.data.CostCentre;
          const suppliers = suppliersByCostCentre.value[costCentre] || [];

          const values = suppliers.map(s => s.SupplierName);

          console.log(`Supplier dropdown for ${costCentre}:`, values);

          return {
            values: values
          };
        },
        cellRenderer: (params) => {
          if (!params.value) {
            return '<span class="text-muted fst-italic">Click to assign...</span>';
          }
          // Show star icon for preferred suppliers
          const isPreferred = params.data.IsPreferredSupplier === 1;
          const star = isPreferred ? '<i class="bi bi-star-fill text-warning me-1" title="Preferred Supplier"></i>' : '';
          return `${star}${params.value}`;
        },
        tooltipValueGetter: (params) => {
          if (params.data.IsLogged === 1) {
            return 'Logged orders cannot be edited';
          }
          return 'Click to select supplier (only nominated suppliers shown)';
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
        suppressHeaderMenuButton: true,
        filter: false,
        sortable: false
      }
    ];

    // Methods
    const onGridReady = (params) => {
      gridApi.value = params.api;
      // Set popup parent to ensure dropdowns render on top
      if (gridContainer.value) {
        params.api.setGridOption('popupParent', document.body);
      }
    };

    const handleGridClick = (e) => {
      // Handle action button clicks via event delegation
      if (e.target.closest('.preview-btn')) {
        const orderNumber = e.target.closest('.preview-btn').dataset.order;
        previewOrder(orderNumber);
      } else if (e.target.closest('.edit-btn')) {
        const orderNumber = e.target.closest('.edit-btn').dataset.order;
        editOrder(orderNumber);
      }
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

          // Pre-load nominated suppliers for each unique cost centre
          const uniqueCostCentres = [...new Set(orders.value.map(o => o.CostCentre))];
          console.log('Loading suppliers for cost centres:', uniqueCostCentres);

          // Load suppliers for each cost centre in parallel
          const supplierPromises = uniqueCostCentres.map(async (costCentre) => {
            try {
              const suppResult = await api.purchaseOrders.getSuppliersForCostCentre(costCentre);
              if (suppResult.success) {
                return { costCentre, suppliers: suppResult.suppliers };
              }
            } catch (err) {
              console.error(`Error loading suppliers for ${costCentre}:`, err);
            }
            return { costCentre, suppliers: [] };
          });

          const supplierResults = await Promise.all(supplierPromises);

          // Build the map of cost centre -> suppliers
          const suppliersMap = {};
          supplierResults.forEach(({ costCentre, suppliers }) => {
            suppliersMap[costCentre] = suppliers;
            console.log(`Cost Centre ${costCentre}: ${suppliers.length} nominated suppliers`);
          });

          suppliersByCostCentre.value = suppliersMap;
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
        const orderNumbers = selectedOrders.value.map(o => o.OrderNumber);
        previewOrderNumber.value = orderNumbers;
        showOrderPreview.value = true;
      }
    };

    const editOrder = (orderNumber) => {
      editOrderNumber.value = orderNumber;
      showOrderEdit.value = true;
    };

    const onOrderSaved = async () => {
      // Reload orders to reflect the changes
      await loadOrders();
    };

    const onSuppliersUpdated = async () => {
      // Suppliers list has changed - reload suppliers for all cost centres
      console.log('Nominated suppliers updated - reloading supplier lists...');

      if (!selectedJob.value || orders.value.length === 0) {
        return;
      }

      try {
        // Get unique cost centres from current orders
        const uniqueCostCentres = [...new Set(orders.value.map(o => o.CostCentre))];

        // Reload suppliers for each cost centre
        const supplierPromises = uniqueCostCentres.map(async (costCentre) => {
          try {
            const suppResult = await api.purchaseOrders.getSuppliersForCostCentre(costCentre);
            if (suppResult.success) {
              return { costCentre, suppliers: suppResult.suppliers };
            }
          } catch (err) {
            console.error(`Error reloading suppliers for ${costCentre}:`, err);
          }
          return { costCentre, suppliers: [] };
        });

        const supplierResults = await Promise.all(supplierPromises);

        // Update the suppliers map
        const suppliersMap = {};
        supplierResults.forEach(({ costCentre, suppliers }) => {
          suppliersMap[costCentre] = suppliers;
          console.log(`✓ Cost Centre ${costCentre}: ${suppliers.length} nominated suppliers`);
        });

        suppliersByCostCentre.value = suppliersMap;
        console.log('✓ Supplier lists reloaded successfully');
      } catch (error) {
        console.error('Error reloading suppliers:', error);
      }
    };

    const printSelected = async () => {
      if (selectedOrders.value.length === 0) {
        return;
      }

      const orderNumbers = selectedOrders.value.map(o => o.OrderNumber);

      const confirmed = confirm(
        `Print ${orderNumbers.length} purchase order(s)?\n\n` +
        orderNumbers.join('\n')
      );

      if (!confirmed) {
        return;
      }

      try {
        loading.value = true;

        const settings = {
          silentPrint: false, // Show print dialog
          color: true,
          copies: 1
        };

        const result = await api.purchaseOrders.batchPrint(orderNumbers, settings);

        if (result.success) {
          alert(
            `Print Results:\n\n` +
            `Total: ${result.total}\n` +
            `Succeeded: ${result.succeeded}\n` +
            `Failed: ${result.failed}`
          );

          if (result.failed > 0) {
            const failures = result.results
              .filter(r => !r.success)
              .map(r => `${r.orderNumber}: ${r.error}`)
              .join('\n');
            console.error('Print failures:\n', failures);
          }
        } else {
          alert('Failed to print orders: ' + result.message);
        }
      } catch (error) {
        console.error('Error printing orders:', error);
        alert('Error printing orders: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    const emailSelected = async () => {
      if (selectedOrders.value.length === 0) {
        return;
      }

      const orderNumbers = selectedOrders.value.map(o => o.OrderNumber);

      // Check that all selected orders have supplier emails
      const ordersWithoutEmail = selectedOrders.value.filter(o => !o.SupplierEmail);
      if (ordersWithoutEmail.length > 0) {
        alert(
          `The following orders cannot be emailed (no supplier email):\n\n` +
          ordersWithoutEmail.map(o => o.OrderNumber).join('\n')
        );
        return;
      }

      const confirmed = confirm(
        `Email ${orderNumbers.length} purchase order(s) to suppliers?\n\n` +
        selectedOrders.value.map(o => `${o.OrderNumber} → ${o.SupplierName} (${o.SupplierEmail})`).join('\n')
      );

      if (!confirmed) {
        return;
      }

      try {
        loading.value = true;

        // TODO: Add email configuration dialog/modal
        // For now, using basic settings
        const settings = {
          emailFrom: 'noreply@company.com', // TODO: Get from preferences
          emailSubject: 'Purchase Order - {{OrderNumber}}',
          emailBody: 'Please find attached Purchase Order {{OrderNumber}}.\n\nRegards',
          emailConfig: {
            // TODO: Get from email settings store
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
              user: '', // TODO: Prompt for credentials
              pass: ''
            }
          }
        };

        // Show warning about email configuration
        alert(
          'Email Configuration Required:\n\n' +
          'Please configure your email settings before using this feature.\n' +
          'This will be implemented in the next update.'
        );

        // TODO: Uncomment when email configuration is ready
        // const result = await api.purchaseOrders.batchEmail(orderNumbers, settings);
        //
        // if (result.success) {
        //   alert(
        //     `Email Results:\n\n` +
        //     `Total: ${result.total}\n` +
        //     `Succeeded: ${result.succeeded}\n` +
        //     `Failed: ${result.failed}`
        //   );
        //
        //   if (result.failed > 0) {
        //     const failures = result.results
        //       .filter(r => !r.success)
        //       .map(r => `${r.orderNumber}: ${r.error}`)
        //       .join('\n');
        //     console.error('Email failures:\n', failures);
        //   }
        // } else {
        //   alert('Failed to email orders: ' + result.message);
        // }
      } catch (error) {
        console.error('Error emailing orders:', error);
        alert('Error emailing orders: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    const saveAsPDFSelected = async () => {
      if (selectedOrders.value.length === 0) {
        return;
      }

      const orderNumbers = selectedOrders.value.map(o => o.OrderNumber);

      const confirmed = confirm(
        `Save ${orderNumbers.length} purchase order(s) as PDF?\n\n` +
        orderNumbers.join('\n')
      );

      if (!confirmed) {
        return;
      }

      try {
        loading.value = true;

        const settings = {
          format: 'A4',
          landscape: false,
          printBackground: true
        };

        // Backend handles folder picker dialog and saving
        const result = await api.purchaseOrders.batchSavePDF(orderNumbers, settings);

        if (result.cancelled) {
          return; // User cancelled folder picker
        }

        if (!result.success) {
          alert('Failed to save PDFs: ' + result.message);
          return;
        }

        alert(
          `PDF Save Results:\n\n` +
          `Total: ${result.total}\n` +
          `Saved: ${result.saved}\n` +
          `Failed: ${result.failed}\n\n` +
          `Location: ${result.saveDir}`
        );

        if (result.failed > 0 && result.errors.length > 0) {
          console.error('PDF save errors:\n', result.errors.join('\n'));
        }

      } catch (error) {
        console.error('Error saving PDFs:', error);
        alert('Error saving PDFs: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    const onCellValueChanged = async (event) => {
      // Handle supplier assignment changes
      if (event.colDef.field === 'SupplierName') {
        const orderNumber = event.data.OrderNumber;
        const supplierName = event.newValue;
        const costCentre = event.data.CostCentre;

        if (!supplierName) {
          console.log('Supplier cleared for order:', orderNumber);
          return;
        }

        try {
          // Get pre-loaded nominated suppliers for this cost centre
          const suppliers = suppliersByCostCentre.value[costCentre] || [];

          // Find the supplier by name to get the code
          const supplier = suppliers.find(s => s.SupplierName === supplierName);

          if (!supplier) {
            console.error('Supplier not found in nominated suppliers list');
            // Revert the change
            event.node.setDataValue('SupplierName', event.oldValue);
            return;
          }

          // Update the order with the supplier code
          const updateResult = await api.purchaseOrders.updateOrder(orderNumber, {
            supplier: supplier.Supplier_Code
          });

          if (!updateResult.success) {
            console.error('Failed to assign supplier:', updateResult.message);
            // Revert the change
            event.node.setDataValue('SupplierName', event.oldValue);
            return;
          }

          // Update the row data with supplier details
          event.node.setDataValue('SupplierCode', supplier.Supplier_Code);
          event.node.setDataValue('SupplierEmail', supplier.AccountEmail || '');
          event.node.setDataValue('SupplierPhone', supplier.AccountPhone || '');
          event.node.setDataValue('Status', 'Draft'); // Set status to Draft when supplier is assigned
          event.node.setDataValue('IsLogged', 1); // Mark as logged (has entry in Orders table)

          console.log(`✓ Supplier assigned: ${supplierName} (${supplier.Supplier_Code}) to order ${orderNumber}`);

        } catch (error) {
          console.error('Error assigning supplier:', error);
          // Revert the change
          event.node.setDataValue('SupplierName', event.oldValue);
        }
      }

      // Handle status changes
      if (event.colDef.field === 'Status') {
        const orderNumber = event.data.OrderNumber;
        const newStatus = event.newValue;
        const oldStatus = event.oldValue;

        if (!newStatus || newStatus === oldStatus) {
          return;
        }

        try {
          // Update the order status in the database
          const updateResult = await api.purchaseOrders.updateOrder(orderNumber, {
            status: newStatus
          });

          if (!updateResult.success) {
            console.error('Failed to update status:', updateResult.message);
            // Revert the change
            event.node.setDataValue('Status', oldStatus);
            return;
          }

          console.log(`✓ Status updated: ${orderNumber} → ${newStatus}`);

        } catch (error) {
          console.error('Error updating status:', error);
          // Revert the change
          event.node.setDataValue('Status', oldStatus);
        }
      }
    };

    return {
      isDarkMode,
      selectedJob,
      orders,
      loading,
      selectedOrders,
      gridContainer,
      showJobSelector,
      showTemplateGallery,
      showOrderPreview,
      previewOrderNumber,
      showOrderEdit,
      editOrderNumber,
      showNominatedSuppliers,
      showAssetsLibrary,
      showPartialsLibrary,
      loggedCount,
      toOrderCount,
      defaultColDef,
      rowSelectionConfig,
      columnDefs,
      onGridReady,
      handleGridClick,
      onSelectionChanged,
      onCellValueChanged,
      onJobSelected,
      refreshOrders,
      previewOrder,
      previewSelected,
      editOrder,
      onOrderSaved,
      onSuppliersUpdated,
      printSelected,
      saveAsPDFSelected,
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

/* Fix AG Grid cell editor dropdown z-index */
:deep(.ag-popup) {
  z-index: 9999 !important;
}

:deep(.ag-select-editor) {
  z-index: 9999 !important;
}

:deep(.ag-cell-editor) {
  z-index: 9999 !important;
}

/* Ensure grid doesn't clip the dropdown */
:deep(.ag-root-wrapper) {
  overflow: visible !important;
}

:deep(.ag-body-viewport) {
  overflow-x: auto !important;
  overflow-y: auto !important;
}
</style>
