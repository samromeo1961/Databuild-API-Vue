<template>
  <div class="modal fade show d-block" tabindex="-1" @click.self="closeModal">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <!-- Header -->
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-pencil me-2"></i>
            Edit Order: {{ orderNumber }}
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <!-- Loading State -->
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">Loading order details...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="alert alert-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            {{ error }}
          </div>

          <!-- Edit Form -->
          <form v-else @submit.prevent="saveOrder">
            <!-- Order Info -->
            <div class="row mb-4">
              <div class="col-md-6">
                <label class="form-label fw-bold">Order Number:</label>
                <div>{{ orderNumber }}</div>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Cost Centre:</label>
                <div>{{ formData.CostCentre }} - {{ formData.CostCentreName }}</div>
              </div>
            </div>

            <!-- Status Badge -->
            <div class="mb-3">
              <label class="form-label fw-bold">Status:</label>
              <div>
                <span v-if="formData.IsLogged" class="badge bg-primary">
                  <i class="bi bi-check-circle me-1"></i>
                  Logged
                </span>
                <span v-else class="badge bg-success">
                  <i class="bi bi-cart-plus me-1"></i>
                  To Order
                </span>
              </div>
            </div>

            <!-- Supplier Selection -->
            <div class="mb-3">
              <label for="supplier" class="form-label fw-bold">
                Supplier
                <span v-if="!formData.IsLogged" class="text-danger">*</span>
              </label>
              <select
                id="supplier"
                v-model="formData.Supplier"
                class="form-select"
                :required="!formData.IsLogged"
                :disabled="loadingSuppliers">
                <option :value="null">-- Select Supplier --</option>
                <optgroup v-if="preferredSuppliers.length > 0" label="⭐ Preferred Suppliers">
                  <option
                    v-for="supplier in preferredSuppliers"
                    :key="supplier.Supplier_Code"
                    :value="supplier.Supplier_Code">
                    ★ {{ supplier.SupplierName }}
                  </option>
                </optgroup>
                <optgroup label="All Suppliers">
                  <option
                    v-for="supplier in otherSuppliers"
                    :key="supplier.Supplier_Code"
                    :value="supplier.Supplier_Code">
                    {{ supplier.SupplierName }}
                  </option>
                </optgroup>
              </select>
              <div v-if="loadingSuppliers" class="form-text">
                <span class="spinner-border spinner-border-sm me-1"></span>
                Loading suppliers...
              </div>
            </div>

            <!-- Delivery Date -->
            <div class="mb-3">
              <label for="delDate" class="form-label fw-bold">Delivery Date</label>
              <input
                id="delDate"
                v-model="formData.DelDate"
                type="date"
                class="form-control"
                placeholder="Leave blank for TBA" />
              <div class="form-text">Leave blank to show "TBA" on the purchase order</div>
            </div>

            <!-- Special Instructions -->
            <div class="mb-3">
              <label for="note" class="form-label fw-bold">Special Instructions</label>
              <textarea
                id="note"
                v-model="formData.Note"
                class="form-control"
                rows="4"
                placeholder="Enter any special instructions for this order..."></textarea>
            </div>

            <!-- Info Box for To Order Status -->
            <div v-if="!formData.IsLogged" class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              <strong>Note:</strong> Saving this order will log it and mark it as "Logged" status. You must select a supplier before logging.
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            @click="closeModal"
            :disabled="saving">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="saveOrder"
            :disabled="saving || loading || !canSave">
            <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-check-circle me-1"></i>
            {{ saving ? 'Saving...' : (formData.IsLogged ? 'Update Order' : 'Log Order') }}
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
  name: 'OrderEditModal',
  props: {
    orderNumber: {
      type: String,
      required: true
    }
  },
  emits: ['close', 'saved'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    // State
    const loading = ref(false);
    const saving = ref(false);
    const loadingSuppliers = ref(false);
    const error = ref('');
    const suppliers = ref([]);
    const formData = ref({
      OrderNumber: props.orderNumber,
      JobNo: '',
      CostCentre: '',
      CostCentreName: '',
      BLoad: null,
      Supplier: null,
      DelDate: null,
      Note: '',
      IsLogged: 0
    });

    // Computed
    const preferredSuppliers = computed(() => {
      return suppliers.value.filter(s => s.IsPreferred === 1);
    });

    const otherSuppliers = computed(() => {
      return suppliers.value.filter(s => s.IsPreferred !== 1);
    });

    const canSave = computed(() => {
      // For unlogged orders, supplier is required
      if (!formData.value.IsLogged && !formData.value.Supplier) {
        return false;
      }
      return true;
    });

    // Methods
    const loadOrderDetails = async () => {
      loading.value = true;
      error.value = '';

      try {
        const result = await api.purchaseOrders.getOrderDetails(props.orderNumber);

        if (result.success) {
          formData.value = {
            ...formData.value,
            ...result.order
          };

          // Convert date to YYYY-MM-DD format for input field
          if (formData.value.DelDate) {
            const date = new Date(formData.value.DelDate);
            formData.value.DelDate = date.toISOString().split('T')[0];
          }

          // Load suppliers for this cost centre
          await loadSuppliers();
        } else {
          error.value = result.message || 'Failed to load order details';
        }
      } catch (err) {
        console.error('Error loading order details:', err);
        error.value = err.message || 'Failed to load order details';
      } finally {
        loading.value = false;
      }
    };

    const loadSuppliers = async () => {
      if (!formData.value.CostCentre) return;

      loadingSuppliers.value = true;
      try {
        const result = await api.purchaseOrders.getSuppliersForCostCentre(formData.value.CostCentre);

        if (result.success) {
          suppliers.value = result.suppliers;
        } else {
          console.error('Failed to load suppliers:', result.message);
        }
      } catch (err) {
        console.error('Error loading suppliers:', err);
      } finally {
        loadingSuppliers.value = false;
      }
    };

    const saveOrder = async () => {
      if (!canSave.value) {
        alert('Please select a supplier before logging the order');
        return;
      }

      saving.value = true;
      try {
        const updates = {
          supplier: formData.value.Supplier,
          delDate: formData.value.DelDate || null,
          note: formData.value.Note || null
        };

        const result = await api.purchaseOrders.updateOrder(props.orderNumber, updates);

        if (result.success) {
          emit('saved');
          closeModal();
        } else {
          alert('Failed to save order: ' + (result.message || 'Unknown error'));
        }
      } catch (err) {
        console.error('Error saving order:', err);
        alert('Error saving order: ' + err.message);
      } finally {
        saving.value = false;
      }
    };

    const closeModal = () => {
      emit('close');
    };

    // Lifecycle
    onMounted(() => {
      loadOrderDetails();
    });

    return {
      loading,
      saving,
      loadingSuppliers,
      error,
      formData,
      suppliers,
      preferredSuppliers,
      otherSuppliers,
      canSave,
      saveOrder,
      closeModal
    };
  }
};
</script>

<style scoped>
.modal {
  background: rgba(0, 0, 0, 0.5);
  z-index: 1050;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.modal-backdrop {
  z-index: 1040;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}
</style>
