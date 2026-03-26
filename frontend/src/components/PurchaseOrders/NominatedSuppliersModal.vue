<template>
  <div class="modal fade show d-block" tabindex="-1" @click.self="closeModal">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <!-- Header -->
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-star me-2"></i>
            Manage Nominated Suppliers
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <!-- Cost Centre Selection -->
          <div class="mb-4">
            <label class="form-label fw-bold">Select Cost Centre</label>
            <select v-model="selectedCostCentre" @change="loadNominatedSuppliers" class="form-select">
              <option :value="null">-- Select a Cost Centre --</option>
              <option v-for="cc in costCentres" :key="cc.Code" :value="cc.Code">
                {{ cc.Code }} - {{ cc.Name }}
              </option>
            </select>
          </div>

          <!-- Nominated Suppliers List -->
          <div v-if="selectedCostCentre" class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label fw-bold mb-0">Nominated Suppliers for {{ selectedCostCentre }}</label>
              <span class="badge bg-primary">{{ nominatedSuppliers.length }} supplier(s)</span>
            </div>

            <div v-if="loading" class="text-center py-3">
              <div class="spinner-border spinner-border-sm text-primary"></div>
              <span class="ms-2">Loading...</span>
            </div>

            <div v-else-if="nominatedSuppliers.length === 0" class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              No nominated suppliers for this cost centre. Add suppliers below.
            </div>

            <div v-else class="list-group">
              <div
                v-for="supplier in nominatedSuppliers"
                :key="supplier.Supplier_Code"
                class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <strong>{{ supplier.SupplierName }}</strong>
                  <br>
                  <small class="text-muted">
                    Code: {{ supplier.Supplier_Code }}
                    <span v-if="supplier.AccountContact"> | Contact: {{ supplier.AccountContact }}</span>
                    <span v-if="supplier.AccountPhone"> | {{ supplier.AccountPhone }}</span>
                  </small>
                </div>
                <button
                  class="btn btn-sm btn-outline-danger"
                  @click="removeSupplier(supplier.Supplier_Code)"
                  title="Remove from nominated suppliers">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Add Supplier Section -->
          <div v-if="selectedCostCentre">
            <label class="form-label fw-bold">Add Supplier</label>
            <div class="d-flex gap-2">
              <div class="flex-grow-1">
                <SearchableSelect
                  v-model="selectedSupplierToAdd"
                  :options="availableSupplierOptions"
                  placeholder="Search and select a supplier..."
                  :clearable="true"
                />
              </div>
              <button
                class="btn btn-primary"
                @click="addSupplier"
                :disabled="!selectedSupplierToAdd || loading">
                <i class="bi bi-plus-circle me-1"></i>
                Add
              </button>
            </div>
          </div>

          <!-- Instructions -->
          <div v-else class="alert alert-secondary">
            <i class="bi bi-arrow-up me-2"></i>
            Select a cost centre above to manage its nominated suppliers.
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">
            Close
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
import SearchableSelect from '../common/SearchableSelect.vue';

export default {
  name: 'NominatedSuppliersModal',
  components: {
    SearchableSelect
  },
  emits: ['close', 'updated'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    // State
    const costCentres = ref([]);
    const allSuppliers = ref([]);
    const nominatedSuppliers = ref([]);
    const selectedCostCentre = ref(null);
    const selectedSupplierToAdd = ref(null);
    const loading = ref(false);

    // Computed
    const availableSuppliers = computed(() => {
      // Filter out suppliers that are already nominated
      const nominatedCodes = nominatedSuppliers.value.map(s => s.Supplier_Code);
      return allSuppliers.value.filter(s => !nominatedCodes.includes(s.Supplier_Code));
    });

    const availableSupplierOptions = computed(() => {
      return availableSuppliers.value.map(s => ({
        value: s.Supplier_Code,
        label: `${s.SupplierName} (${s.Supplier_Code})`
      }));
    });

    // Methods
    const loadCostCentres = async () => {
      try {
        const result = await api.purchaseOrders.getCostCentres();
        if (result.success) {
          costCentres.value = result.costCentres;
        } else {
          console.error('Failed to load cost centres:', result.message);
        }
      } catch (error) {
        console.error('Error loading cost centres:', error);
      }
    };

    const loadAllSuppliers = async () => {
      try {
        console.log('Loading all suppliers...');
        const result = await api.purchaseOrders.getAllSuppliers();
        console.log('getAllSuppliers result:', result);
        if (result.success) {
          allSuppliers.value = result.suppliers;
          console.log('Loaded suppliers:', allSuppliers.value.length);
        } else {
          console.error('Failed to load suppliers:', result.message);
        }
      } catch (error) {
        console.error('Error loading suppliers:', error);
      }
    };

    const loadNominatedSuppliers = async () => {
      if (!selectedCostCentre.value) {
        nominatedSuppliers.value = [];
        return;
      }

      loading.value = true;
      try {
        const result = await api.purchaseOrders.getSuppliersForCostCentre(selectedCostCentre.value);
        if (result.success) {
          nominatedSuppliers.value = result.suppliers;
        } else {
          console.error('Error loading nominated suppliers:', result.message);
        }
      } catch (error) {
        console.error('Error loading nominated suppliers:', error);
      } finally {
        loading.value = false;
      }
    };

    const addSupplier = async () => {
      if (!selectedSupplierToAdd.value || !selectedCostCentre.value) {
        return;
      }

      loading.value = true;
      try {
        const result = await api.purchaseOrders.addNominatedSupplier(
          selectedCostCentre.value,
          selectedSupplierToAdd.value
        );

        if (result.success) {
          // Reload nominated suppliers
          await loadNominatedSuppliers();
          selectedSupplierToAdd.value = null;
          emit('updated');
          console.log('✓ Supplier added successfully');
        } else {
          console.error('Error adding supplier:', result.message);
        }
      } catch (error) {
        console.error('Error adding supplier:', error);
      } finally {
        loading.value = false;
      }
    };

    const removeSupplier = async (supplierCode) => {
      if (!confirm('Remove this supplier from nominated suppliers list?')) {
        return;
      }

      loading.value = true;
      try {
        const result = await api.purchaseOrders.removeNominatedSupplier(
          selectedCostCentre.value,
          supplierCode
        );

        if (result.success) {
          // Reload nominated suppliers
          await loadNominatedSuppliers();
          emit('updated');
          console.log('✓ Supplier removed successfully');
        } else {
          console.error('Error removing supplier:', result.message);
        }
      } catch (error) {
        console.error('Error removing supplier:', error);
      } finally {
        loading.value = false;
      }
    };

    const closeModal = () => {
      emit('close');
    };

    // Lifecycle
    onMounted(async () => {
      await Promise.all([
        loadCostCentres(),
        loadAllSuppliers()
      ]);
    });

    return {
      costCentres,
      allSuppliers,
      nominatedSuppliers,
      selectedCostCentre,
      selectedSupplierToAdd,
      loading,
      availableSuppliers,
      availableSupplierOptions,
      loadNominatedSuppliers,
      addSupplier,
      removeSupplier,
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

.list-group-item {
  transition: background-color 0.2s;
}

.list-group-item:hover {
  background-color: #f8f9fa;
}
</style>
