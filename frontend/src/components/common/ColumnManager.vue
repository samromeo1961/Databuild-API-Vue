<template>
  <div class="column-manager">
    <!-- Trigger Button -->
    <button
      class="btn btn-outline-secondary btn-sm"
      @click="toggleModal"
      title="Manage Columns"
    >
      <i class="bi bi-layout-three-columns me-1"></i>
      Columns
    </button>

    <!-- Modal -->
    <div
      class="modal fade"
      :id="modalId"
      tabindex="-1"
      :aria-labelledby="`${modalId}Label`"
      aria-hidden="true"
      ref="modalRef"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" :id="`${modalId}Label`">
              <i class="bi bi-layout-three-columns me-2"></i>
              Manage Columns
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <!-- Column List with Drag & Drop -->
            <div class="mb-3">
              <h6>Column Order & Visibility</h6>
              <p class="text-muted small">Drag to reorder, toggle visibility, or rename columns</p>

              <div class="column-list">
                <draggable
                  v-model="localColumns"
                  item-key="field"
                  handle=".drag-handle"
                  @change="onColumnOrderChange"
                >
                  <template #item="{element, index}">
                    <div class="column-item" :class="{ 'column-hidden': !element.visible }">
                      <!-- Drag Handle -->
                      <div class="drag-handle">
                        <i class="bi bi-grip-vertical"></i>
                      </div>

                      <!-- Visibility Toggle -->
                      <div class="form-check">
                        <input
                          class="form-check-input"
                          type="checkbox"
                          :id="`col-${index}`"
                          v-model="element.visible"
                          @change="onVisibilityChange"
                        />
                        <label class="form-check-label" :for="`col-${index}`">
                          <span class="original-name text-muted small">{{ element.originalName }}</span>
                        </label>
                      </div>

                      <!-- Alias Input -->
                      <div class="alias-input flex-grow-1">
                        <input
                          type="text"
                          class="form-control form-control-sm"
                          v-model="element.alias"
                          :placeholder="element.originalName"
                          @blur="onAliasChange"
                        />
                      </div>

                      <!-- Reset Alias Button -->
                      <button
                        v-if="element.alias !== element.originalName"
                        class="btn btn-sm btn-outline-secondary"
                        @click="resetAlias(element)"
                        title="Reset to original name"
                      >
                        <i class="bi bi-arrow-counterclockwise"></i>
                      </button>
                    </div>
                  </template>
                </draggable>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="d-flex gap-2 mt-3">
              <button class="btn btn-sm btn-outline-primary" @click="showAll">
                <i class="bi bi-eye me-1"></i>
                Show All
              </button>
              <button class="btn btn-sm btn-outline-primary" @click="hideAll">
                <i class="bi bi-eye-slash me-1"></i>
                Hide All
              </button>
              <button class="btn btn-sm btn-outline-warning" @click="resetAll">
                <i class="bi bi-arrow-counterclockwise me-1"></i>
                Reset All
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" @click="applyChanges">
              <i class="bi bi-check-lg me-1"></i>
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { Modal } from 'bootstrap';
import draggable from 'vuedraggable';

const props = defineProps({
  columns: {
    type: Array,
    required: true
  },
  tabName: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:columns', 'apply']);

// Generate unique modal ID based on tab name
const modalId = computed(() => `columnManager${props.tabName.replace(/\s+/g, '')}`);

const modalRef = ref(null);
let modalInstance = null;

// Local copy of columns for editing
const localColumns = ref([]);

// Initialize local columns from props
const initializeColumns = () => {
  localColumns.value = props.columns.map(col => ({
    field: col.field,
    originalName: col.headerName || col.field,
    alias: col.headerName || col.field,
    visible: col.hide !== true,
    width: col.width,
    pinned: col.pinned,
    ...col
  }));
};

// Watch for prop changes
watch(() => props.columns, () => {
  initializeColumns();
}, { deep: true });

// Toggle modal
const toggleModal = () => {
  if (modalInstance) {
    modalInstance.show();
  }
};

// Column order changed
const onColumnOrderChange = () => {
  // Changes are automatically reflected in localColumns due to v-model
};

// Visibility changed
const onVisibilityChange = () => {
  // Changes are automatically reflected in localColumns due to v-model
};

// Alias changed
const onAliasChange = () => {
  // Changes are automatically reflected in localColumns due to v-model
};

// Reset alias to original
const resetAlias = (column) => {
  column.alias = column.originalName;
};

// Show all columns
const showAll = () => {
  localColumns.value.forEach(col => col.visible = true);
};

// Hide all columns
const hideAll = () => {
  localColumns.value.forEach(col => col.visible = false);
};

// Reset all to original state
const resetAll = () => {
  localColumns.value.forEach(col => {
    col.alias = col.originalName;
    col.visible = true;
  });
  // Reset order to original
  localColumns.value.sort((a, b) => {
    const aIndex = props.columns.findIndex(c => c.field === a.field);
    const bIndex = props.columns.findIndex(c => c.field === b.field);
    return aIndex - bIndex;
  });
};

// Apply changes
const applyChanges = () => {
  // Convert local columns back to AG Grid column format
  const updatedColumns = localColumns.value.map((col, index) => ({
    ...col,
    headerName: col.alias,
    hide: !col.visible,
    // Preserve column order
    sort: index
  }));

  emit('update:columns', updatedColumns);
  emit('apply', updatedColumns);

  // Save to local storage
  saveColumnState();

  if (modalInstance) {
    modalInstance.hide();
  }
};

// Save column state to localStorage
const saveColumnState = () => {
  const state = {
    columns: localColumns.value.map(col => ({
      field: col.field,
      alias: col.alias,
      visible: col.visible,
      width: col.width
    }))
  };

  localStorage.setItem(`columnState_${props.tabName}`, JSON.stringify(state));
};

// Load column state from localStorage
const loadColumnState = () => {
  const savedState = localStorage.getItem(`columnState_${props.tabName}`);

  if (savedState) {
    try {
      const state = JSON.parse(savedState);

      // Apply saved state to local columns
      if (state.columns) {
        const savedMap = new Map(state.columns.map(c => [c.field, c]));

        localColumns.value.forEach(col => {
          const saved = savedMap.get(col.field);
          if (saved) {
            col.alias = saved.alias || col.originalName;
            col.visible = saved.visible !== false;
            col.width = saved.width || col.width;
          }
        });

        // Reorder based on saved order
        const orderedColumns = [];
        state.columns.forEach(savedCol => {
          const col = localColumns.value.find(c => c.field === savedCol.field);
          if (col) {
            orderedColumns.push(col);
          }
        });

        // Add any new columns that weren't in saved state
        localColumns.value.forEach(col => {
          if (!orderedColumns.find(c => c.field === col.field)) {
            orderedColumns.push(col);
          }
        });

        localColumns.value = orderedColumns;
      }
    } catch (err) {
      console.error('Error loading column state:', err);
    }
  }
};

onMounted(() => {
  initializeColumns();
  loadColumnState();

  // Initialize Bootstrap modal
  if (modalRef.value) {
    modalInstance = new Modal(modalRef.value);
  }

  // Auto-apply saved state on mount
  if (localColumns.value.length > 0) {
    applyChanges();
  }
});
</script>

<style scoped>
.column-list {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.5rem;
}

.column-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  transition: all 0.2s;
}

.column-item:hover {
  background-color: var(--bg-secondary);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.column-item.column-hidden {
  opacity: 0.5;
}

.drag-handle {
  cursor: grab;
  color: var(--text-secondary);
  font-size: 1.2rem;
}

.drag-handle:active {
  cursor: grabbing;
}

.form-check {
  min-width: 150px;
}

.original-name {
  display: block;
  font-size: 0.75rem;
  margin-top: 2px;
}

.alias-input {
  max-width: 300px;
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

[data-theme="dark"] .column-list {
  background-color: var(--bg-primary);
}

[data-theme="dark"] .column-item {
  background-color: var(--bg-secondary);
}

[data-theme="dark"] .column-item:hover {
  background-color: var(--bg-tertiary);
}

[data-theme="dark"] .form-control {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

[data-theme="dark"] .form-control:focus {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--link-color);
}
</style>
