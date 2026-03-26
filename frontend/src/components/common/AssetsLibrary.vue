<template>
  <div class="modal fade show d-block" tabindex="-1" @click.self="closeModal">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <!-- Header -->
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-folder2-open me-2"></i>
            Assets Library
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <!-- Upload Section -->
          <div class="card mb-3">
            <div class="card-body">
              <h6 class="card-title">
                <i class="bi bi-cloud-upload me-2"></i>
                Upload Assets
              </h6>

              <!-- Drag and Drop Zone -->
              <div
                class="upload-zone p-4 text-center border rounded"
                :class="{ 'drag-over': isDragging }"
                @drop.prevent="handleDrop"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false">
                <i class="bi bi-cloud-arrow-up fs-1 text-muted"></i>
                <p class="mb-2">
                  Drag and drop files here, or click to select
                </p>
                <input
                  ref="fileInput"
                  type="file"
                  multiple
                  accept="image/*,.css,.ttf,.woff,.woff2"
                  class="d-none"
                  @change="handleFileSelect" />
                <button
                  class="btn btn-primary btn-sm"
                  @click="$refs.fileInput.click()">
                  <i class="bi bi-file-earmark-plus me-1"></i>
                  Select Files
                </button>
                <small class="d-block mt-2 text-muted">
                  Supported: Images (PNG, JPG, SVG), CSS, Fonts (TTF, WOFF)
                </small>
              </div>
            </div>
          </div>

          <!-- Filter and Stats -->
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="btn-group" role="group">
              <button
                v-for="category in categories"
                :key="category.value"
                class="btn btn-sm"
                :class="selectedCategory === category.value ? 'btn-primary' : 'btn-outline-primary'"
                @click="selectedCategory = category.value">
                <i :class="category.icon" class="me-1"></i>
                {{ category.label }}
                <span v-if="getCategoryCount(category.value)" class="badge bg-light text-dark ms-1">
                  {{ getCategoryCount(category.value) }}
                </span>
              </button>
            </div>

            <div class="d-flex align-items-center gap-3">
              <button
                v-if="assets.length === 0"
                class="btn btn-sm btn-success"
                @click="loadExamples"
                title="Load example assets (logo, CSS)">
                <i class="bi bi-lightbulb me-1"></i>
                Load Examples
              </button>
              <div v-if="stats" class="text-muted small">
                <i class="bi bi-hdd me-1"></i>
                {{ formatBytes(stats.totalSize) }} used
              </div>
            </div>
          </div>

          <!-- Assets Grid -->
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-2 text-muted">Loading assets...</p>
          </div>

          <div v-else-if="filteredAssets.length === 0" class="text-center py-5 text-muted">
            <i class="bi bi-inbox fs-1"></i>
            <p class="mt-2">No assets found</p>
            <small>Upload some assets to get started</small>
          </div>

          <div v-else class="assets-grid">
            <div
              v-for="asset in filteredAssets"
              :key="asset.id"
              class="asset-card card">
              <!-- Asset Preview -->
              <div class="asset-preview">
                <img
                  v-if="isImage(asset.type)"
                  :src="getAssetPreview(asset.id)"
                  :alt="asset.name"
                  class="asset-image" />
                <div v-else class="asset-icon">
                  <i :class="getAssetIcon(asset.type)" class="fs-1 text-muted"></i>
                </div>
              </div>

              <!-- Asset Info -->
              <div class="card-body p-2">
                <h6 class="card-title text-truncate small mb-1" :title="asset.name">
                  {{ asset.name }}
                </h6>
                <div class="d-flex justify-content-between align-items-center">
                  <small class="text-muted">{{ formatBytes(asset.size) }}</small>
                  <div class="btn-group btn-group-sm">
                    <button
                      class="btn btn-outline-primary"
                      @click="copyReference(asset)"
                      title="Copy reference">
                      <i class="bi bi-code-square"></i>
                    </button>
                    <button
                      class="btn btn-outline-danger"
                      @click="deleteAsset(asset.id)"
                      title="Delete">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
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

export default {
  name: 'AssetsLibrary',
  emits: ['close'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    // State
    const assets = ref([]);
    const stats = ref(null);
    const loading = ref(false);
    const isDragging = ref(false);
    const selectedCategory = ref('all');
    const assetPreviews = ref({}); // Cache for loaded asset previews

    const categories = [
      { value: 'all', label: 'All', icon: 'bi-grid' },
      { value: 'logo', label: 'Logos', icon: 'bi-image' },
      { value: 'image', label: 'Images', icon: 'bi-file-image' },
      { value: 'css', label: 'CSS', icon: 'bi-file-earmark-code' },
      { value: 'font', label: 'Fonts', icon: 'bi-fonts' },
      { value: 'other', label: 'Other', icon: 'bi-file-earmark' }
    ];

    // Computed
    const filteredAssets = computed(() => {
      if (selectedCategory.value === 'all') {
        return assets.value;
      }
      return assets.value.filter(a => a.category === selectedCategory.value);
    });

    // Methods
    const loadAssets = async () => {
      loading.value = true;
      try {
        const result = await api.assets.getAll();
        if (result.success) {
          assets.value = result.assets;
        } else {
          console.error('Failed to load assets:', result.message);
        }
      } catch (error) {
        console.error('Error loading assets:', error);
      } finally {
        loading.value = false;
      }
    };

    const loadStats = async () => {
      try {
        const result = await api.assets.getStats();
        if (result.success) {
          stats.value = result.stats;
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    const handleFileSelect = (event) => {
      const files = Array.from(event.target.files);
      uploadFiles(files);
    };

    const handleDrop = (event) => {
      isDragging.value = false;
      const files = Array.from(event.dataTransfer.files);
      uploadFiles(files);
    };

    const uploadFiles = async (files) => {
      for (const file of files) {
        try {
          // Read file as base64
          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64Content = e.target.result.split(',')[1]; // Remove data:...;base64, prefix

            const assetData = {
              name: file.name,
              type: file.type,
              content: base64Content,
              category: categorizeFile(file),
              size: file.size
            };

            const result = await api.assets.upload(assetData);
            if (result.success) {
              console.log(`✓ Uploaded: ${file.name}`);
              await loadAssets();
              await loadStats();
            } else {
              console.error(`Failed to upload ${file.name}:`, result.message);
            }
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
        }
      }
    };

    const categorizeFile = (file) => {
      const name = file.name.toLowerCase();
      const type = file.type.toLowerCase();

      if (name.includes('logo') || name.includes('brand')) return 'logo';
      if (type.startsWith('image/')) return 'image';
      if (type.includes('css') || name.endsWith('.css')) return 'css';
      if (type.includes('font') || name.match(/\.(ttf|woff|woff2|otf)$/)) return 'font';
      return 'other';
    };

    const deleteAsset = async (id) => {
      if (!confirm('Delete this asset? It may be used in templates.')) {
        return;
      }

      try {
        const result = await api.assets.delete(id);
        if (result.success) {
          console.log('✓ Asset deleted');
          await loadAssets();
          await loadStats();
          delete assetPreviews.value[id]; // Remove from cache
        } else {
          console.error('Failed to delete asset:', result.message);
        }
      } catch (error) {
        console.error('Error deleting asset:', error);
      }
    };

    const copyReference = async (asset) => {
      // Get the full asset with content
      const result = await api.assets.get(asset.id);
      if (!result.success) {
        console.error('Failed to get asset:', result.message);
        return;
      }

      const fullAsset = result.asset;

      // Generate appropriate reference based on type
      let reference;
      if (asset.type.startsWith('image/')) {
        reference = `<img src="data:${fullAsset.type};base64,${fullAsset.content}" alt="${asset.name}" />`;
      } else if (asset.type.includes('css')) {
        reference = `<style>\n/* From ${asset.name} */\n${atob(fullAsset.content)}\n</style>`;
      } else {
        reference = `<!-- Asset: ${asset.name} -->`;
      }

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(reference);
        console.log(`✓ Copied reference for ${asset.name}`);
        // Could show a toast notification here
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    };

    const getAssetPreview = (id) => {
      // Return cached preview if available
      if (assetPreviews.value[id]) {
        return assetPreviews.value[id];
      }

      // Load preview asynchronously
      loadAssetPreview(id);
      return ''; // Return empty until loaded
    };

    const loadAssetPreview = async (id) => {
      try {
        const result = await api.assets.get(id);
        if (result.success) {
          const asset = result.asset;
          assetPreviews.value[id] = `data:${asset.type};base64,${asset.content}`;
        }
      } catch (error) {
        console.error('Error loading asset preview:', error);
      }
    };

    const isImage = (type) => {
      return type.startsWith('image/');
    };

    const getAssetIcon = (type) => {
      if (type.includes('css')) return 'bi-file-earmark-code';
      if (type.includes('font')) return 'bi-fonts';
      return 'bi-file-earmark';
    };

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getCategoryCount = (category) => {
      if (category === 'all') return assets.value.length;
      return assets.value.filter(a => a.category === category).length;
    };

    const loadExamples = async () => {
      if (!confirm('Load example assets (1 logo, 2 CSS files)?\n\nThis will add sample resources to help you get started.')) {
        return;
      }

      try {
        const result = await api.seed.assets();
        if (result.success) {
          if (result.result.skipped) {
            alert('Assets already exist. Clear all assets first to reload examples.');
          } else {
            console.log('✓ Example assets loaded:', result.result.count);
            await loadAssets();
            await loadStats();
            alert(`Successfully loaded ${result.result.count} example assets!`);
          }
        } else {
          alert('Failed to load examples: ' + result.message);
        }
      } catch (error) {
        console.error('Error loading examples:', error);
        alert('Error loading examples: ' + error.message);
      }
    };

    const closeModal = () => {
      emit('close');
    };

    // Lifecycle
    onMounted(async () => {
      await Promise.all([
        loadAssets(),
        loadStats()
      ]);
    });

    return {
      assets,
      stats,
      loading,
      isDragging,
      selectedCategory,
      categories,
      filteredAssets,
      handleFileSelect,
      handleDrop,
      deleteAsset,
      copyReference,
      getAssetPreview,
      isImage,
      getAssetIcon,
      formatBytes,
      getCategoryCount,
      loadExamples,
      closeModal
    };
  }
};
</script>

<style scoped>
.modal {
  background: rgba(0, 0, 0, 0.5);
  z-index: 1050;
}

.modal-backdrop {
  z-index: 1040;
}

.upload-zone {
  transition: all 0.3s;
  cursor: pointer;
  background-color: #f8f9fa;
}

.upload-zone:hover,
.upload-zone.drag-over {
  background-color: #e9ecef;
  border-color: #0d6efd !important;
  border-width: 2px !important;
}

.assets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  max-height: 500px;
  overflow-y: auto;
}

.asset-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.asset-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.asset-preview {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.asset-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.asset-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
