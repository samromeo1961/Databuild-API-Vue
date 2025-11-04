<!--
  ColumnManagementModal Component

  Reusable modal for managing AG Grid column visibility, order, and pinning.
  Eliminates ~400 lines of duplicate code across multiple tab components.

  Usage:
  <ColumnManagementModal
    v-model:columns="managedColumns"
    @column-reorder="handleReorder"
    @column-toggle="handleToggle"
    @column-pin="handlePin"
    @rename-column="handleRename"
    @show-all="handleShowAll"
    @reset="handleReset"
  />
-->

<template>
  <div
    class="modal fade"
    :id="modalId"
    tabindex="-1"
    :aria-labelledby="`${modalId}Label`"
    aria-hidden="true"
    :ref="modalId"
  >
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" :id="`${modalId}Label`">
            <i class="bi bi-layout-three-columns me-2"></i>Manage Columns
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="row mb-3">
            <div class="col">
              <p class="text-muted mb-2">
                <i class="bi bi-info-circle me-1"></i>
                Drag to reorder, check to show/hide, or use pin buttons. Changes are saved automatically.
              </p>
            </div>
          </div>

          <draggable
            v-model="localColumns"
            item-key="field"
            @end="onColumnReorder"
            handle=".drag-handle"
            class="list-group"
          >
            <template #item="{element: col}">
              <div class="list-group-item d-flex align-items-center">
                <div class="drag-handle me-2" style="cursor: move;">
                  <i class="bi bi-grip-vertical text-muted"></i>
                </div>
                <div class="form-check me-3">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    :id="`col-${col.field}`"
                    v-model="col.visible"
                    @change="toggleColumn(col)"
                  />
                </div>
                <div class="flex-grow-1">
                  <label :for="`col-${col.field}`" class="mb-0 fw-medium">
                    {{ col.headerName }}
                    <span v-if="col.pinned" class="badge bg-primary ms-2">
                      <i class="bi bi-pin-angle-fill"></i> {{ col.pinned }}
                    </span>
                  </label>
                  <small class="d-block text-muted">{{ col.field }}</small>
                </div>
                <div class="btn-group btn-group-sm me-2">
                  <button
                    class="btn btn-outline-secondary"
                    :class="{ 'active': col.pinned === 'left' }"
                    @click="pinColumn(col, 'left')"
                    title="Pin Left"
                  >
                    <i class="bi bi-pin-angle"></i> Left
                  </button>
                  <button
                    class="btn btn-outline-secondary"
                    :class="{ 'active': !col.pinned }"
                    @click="pinColumn(col, null)"
                    title="Unpin"
                  >
                    <i class="bi bi-dash-circle"></i>
                  </button>
                  <button
                    class="btn btn-outline-secondary"
                    :class="{ 'active': col.pinned === 'right' }"
                    @click="pinColumn(col, 'right')"
                    title="Pin Right"
                  >
                    <i class="bi bi-pin-angle"></i> Right
                  </button>
                </div>
                <button
                  class="btn btn-sm btn-outline-secondary"
                  @click="renameColumn(col)"
                  title="Rename column"
                >
                  <i class="bi bi-pencil"></i>
                </button>
              </div>
            </template>
          </draggable>

          <div class="mt-3 d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" @click="showAll">
              <i class="bi bi-eye me-1"></i>Show All
            </button>
            <button class="btn btn-sm btn-outline-secondary" @click="reset">
              <i class="bi bi-arrow-clockwise me-1"></i>Reset to Default
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import draggable from 'vuedraggable';
import logger from '../../../utils/logger';

const props = defineProps({
  columns: {
    type: Array,
    required: true,
    default: () => []
  },
  modalId: {
    type: String,
    default: 'columnManagementModal'
  }
});

const emit = defineEmits([
  'update:columns',
  'column-reorder',
  'column-toggle',
  'column-pin',
  'rename-column',
  'show-all',
  'reset'
]);

// Local copy of columns for v-model on draggable
const localColumns = ref([...props.columns]);

// Watch for external changes to columns prop
watch(() => props.columns, (newColumns) => {
  localColumns.value = [...newColumns];
}, { deep: true });

// Watch for changes to localColumns and emit update
watch(localColumns, (newColumns) => {
  emit('update:columns', newColumns);
}, { deep: true });

/**
 * Handle column reorder via drag-and-drop
 */
const onColumnReorder = () => {
  logger.debug('ColumnManagementModal', 'Columns reordered');
  emit('column-reorder', localColumns.value);
};

/**
 * Toggle column visibility
 */
const toggleColumn = (col) => {
  logger.debug('ColumnManagementModal', `Toggle column: ${col.field}`, col.visible);
  emit('column-toggle', col);
};

/**
 * Pin/unpin column
 */
const pinColumn = (col, position) => {
  col.pinned = position;
  logger.debug('ColumnManagementModal', `Pin column: ${col.field}`, position);
  emit('column-pin', col, position);
};

/**
 * Show rename column dialog
 */
const renameColumn = (col) => {
  logger.debug('ColumnManagementModal', `Rename column: ${col.field}`);
  emit('rename-column', col);
};

/**
 * Show all columns
 */
const showAll = () => {
  localColumns.value.forEach(col => {
    col.visible = true;
  });
  logger.debug('ColumnManagementModal', 'Show all columns');
  emit('show-all');
};

/**
 * Reset column settings to default
 */
const reset = () => {
  logger.debug('ColumnManagementModal', 'Reset columns to default');
  emit('reset');
};
</script>

<style scoped>
.list-group-item {
  border-left: 3px solid transparent;
  transition: border-color 0.2s, background-color 0.2s;
}

.list-group-item:hover {
  background-color: var(--bs-light);
  border-left-color: var(--bs-primary);
}

.drag-handle {
  opacity: 0.5;
  transition: opacity 0.2s;
}

.list-group-item:hover .drag-handle {
  opacity: 1;
}

.badge {
  font-size: 0.7rem;
}
</style>
