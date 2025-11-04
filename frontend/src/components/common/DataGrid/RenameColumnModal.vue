<!--
  RenameColumnModal Component

  Reusable modal for renaming AG Grid column headers.
  Works in conjunction with ColumnManagementModal.

  Usage:
  <RenameColumnModal
    v-model:column-name="columnName"
    :column-field="columnField"
    @confirm="handleRename"
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
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" :id="`${modalId}Label`">
            <i class="bi bi-pencil me-2"></i>Rename Column
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label for="columnNewName" class="form-label">Column Name</label>
            <input
              type="text"
              id="columnNewName"
              class="form-control"
              v-model="localColumnName"
              :placeholder="placeholder"
              @keyup.enter="confirm"
              ref="inputRef"
            />
            <small class="text-muted">Field: {{ columnField }}</small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button
            type="button"
            class="btn btn-primary"
            @click="confirm"
            :disabled="!localColumnName || localColumnName.trim().length === 0"
          >
            <i class="bi bi-check-circle me-1"></i>Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import logger from '../../../utils/logger';

const props = defineProps({
  columnName: {
    type: String,
    default: ''
  },
  columnField: {
    type: String,
    default: ''
  },
  modalId: {
    type: String,
    default: 'renameColumnModal'
  },
  placeholder: {
    type: String,
    default: 'Enter column name...'
  }
});

const emit = defineEmits([
  'update:columnName',
  'confirm'
]);

// Local copy of column name for v-model
const localColumnName = ref(props.columnName);
const inputRef = ref(null);

// Watch for external changes to columnName prop
watch(() => props.columnName, (newName) => {
  localColumnName.value = newName;
  // Focus input when modal opens
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus();
      inputRef.value.select();
    }
  });
});

// Watch for changes to localColumnName and emit update
watch(localColumnName, (newName) => {
  emit('update:columnName', newName);
});

/**
 * Confirm rename action
 */
const confirm = () => {
  const trimmedName = localColumnName.value?.trim();

  if (!trimmedName || trimmedName.length === 0) {
    logger.warn('RenameColumnModal', 'Column name cannot be empty');
    return;
  }

  logger.debug('RenameColumnModal', `Confirm rename: ${props.columnField} -> ${trimmedName}`);
  emit('confirm', {
    field: props.columnField,
    newName: trimmedName
  });
};
</script>

<style scoped>
.form-control:focus {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.25);
}
</style>
