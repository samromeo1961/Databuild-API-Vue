<template>
  <div class="modal fade show d-block" tabindex="-1" @click.self="closeModal">
    <div class="modal-dialog modal-fullscreen">
      <div class="modal-content">
        <!-- Header -->
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-eye me-2"></i>
            Template Preview: {{ templateName }}
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>

        <!-- Settings Bar -->
        <div class="settings-bar p-3 border-bottom bg-light">
          <div class="row g-3">
            <div class="col-md-3">
              <label class="form-label small fw-bold">Price Display</label>
              <select v-model="settings.priceDisplay" @change="refreshPreview" class="form-select form-select-sm">
                <option value="all">Show All Prices</option>
                <option value="totalOnly">Total Only</option>
                <option value="none">No Prices</option>
                <option value="supplierOnly">Supplier Prices Only</option>
              </select>
            </div>

            <div class="col-md-2">
              <label class="form-label small fw-bold">GST Mode</label>
              <select v-model="settings.gstMode" @change="refreshPreview" class="form-select form-select-sm">
                <option value="none">No GST</option>
                <option value="perLine">GST Per Line</option>
                <option value="total">GST on Total</option>
              </select>
            </div>

            <div class="col-md-2">
              <label class="form-label small fw-bold">Item Code</label>
              <select v-model="settings.codeDisplay" @change="refreshPreview" class="form-select form-select-sm">
                <option value="our">Our Code Only</option>
                <option value="supplier">Supplier Reference</option>
                <option value="both">Both Codes</option>
              </select>
            </div>

            <div class="col-md-auto d-flex align-items-end">
              <button class="btn btn-sm btn-outline-secondary" @click="refreshPreview" :disabled="loading">
                <i class="bi bi-arrow-clockwise" :class="{ 'spin': loading }"></i>
                Refresh
              </button>
            </div>
          </div>
        </div>

        <!-- Preview Area -->
        <div class="modal-body p-0">
          <!-- Loading State -->
          <div v-if="loading" class="preview-loading">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">Rendering preview...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="preview-loading">
            <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
            <p class="mt-3 text-danger">{{ error }}</p>
            <button class="btn btn-primary" @click="loadPreview">
              <i class="bi bi-arrow-clockwise me-2"></i>
              Retry
            </button>
          </div>

          <!-- Preview Frame -->
          <div v-else class="preview-container">
            <div class="preview-frame" v-html="previewHTML"></div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useElectronAPI } from '../../composables/useElectronAPI';

export default {
  name: 'TemplatePreviewModal',
  props: {
    templateId: {
      type: String,
      required: true
    },
    templateName: {
      type: String,
      required: true
    },
    customHtml: {
      type: String,
      default: null
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    // State
    const previewHTML = ref('');
    const loading = ref(false);
    const error = ref('');
    const settings = ref({
      priceDisplay: 'all',
      gstMode: 'total',
      codeDisplay: 'our'
    });

    // Methods
    const loadPreview = async () => {
      loading.value = true;
      error.value = '';

      try {
        // Convert reactive settings to plain object for IPC
        const plainSettings = {
          priceDisplay: settings.value.priceDisplay,
          gstMode: settings.value.gstMode,
          codeDisplay: settings.value.codeDisplay
        };

        // Use sample data from the template system
        const result = await api.poTemplates.preview(props.templateId, plainSettings);

        if (result.success) {
          // If custom HTML provided (from editor), use that
          if (props.customHtml) {
            // We would need to render the custom HTML with sample data
            // For now, just show it
            previewHTML.value = props.customHtml;
          } else {
            previewHTML.value = result.html;
          }
        } else {
          error.value = result.message || 'Failed to render preview';
        }
      } catch (err) {
        console.error('Error loading preview:', err);
        error.value = err.message || 'Failed to load preview';
      } finally {
        loading.value = false;
      }
    };

    const refreshPreview = () => {
      loadPreview();
    };

    const closeModal = () => {
      emit('close');
    };

    // Lifecycle
    onMounted(() => {
      loadPreview();
    });

    return {
      previewHTML,
      loading,
      error,
      settings,
      loadPreview,
      refreshPreview,
      closeModal
    };
  }
};
</script>

<style scoped>
.modal {
  background: rgba(0, 0, 0, 0.5);
  z-index: 1060;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.modal-backdrop {
  z-index: 1055;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.settings-bar {
  background-color: #f8f9fa !important;
}

.preview-loading {
  height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.preview-container {
  height: calc(100vh - 250px);
  overflow-y: auto;
  background: #e9ecef;
  padding: 20px;
}

.preview-frame {
  background: white;
  min-height: 100%;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  margin: 0 auto;
  max-width: 210mm; /* A4 width */
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
</style>
