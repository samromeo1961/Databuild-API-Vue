<template>
  <div class="modal fade" id="notesEditModal" tabindex="-1" aria-labelledby="notesEditModalLabel" aria-hidden="true" ref="modalElement">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="notesEditModalLabel">
            <i class="bi bi-pencil-square me-2"></i>
            Edit Notes - {{ itemCode }}
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="modal-body">
          <div class="mb-3">
            <label for="notesTextarea" class="form-label">Notes</label>
            <textarea
              id="notesTextarea"
              class="form-control"
              v-model="noteText"
              rows="15"
              maxlength="1000"
              placeholder="Enter notes for this item..."
              ref="textareaRef"
            ></textarea>
            <div class="form-text text-end">
              {{ noteText.length }} / 1000 characters
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
            Cancel
          </button>
          <button type="button" class="btn btn-primary" @click="saveNote">
            <i class="bi bi-check-circle me-2"></i>
            Save Note
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, nextTick } from 'vue';
import { Modal } from 'bootstrap';

export default {
  name: 'NotesEditModal',
  emits: ['note-saved'],
  setup(props, { emit }) {
    const modalElement = ref(null);
    const textareaRef = ref(null);
    let modalInstance = null;

    const itemCode = ref('');
    const noteText = ref('');
    const originalNote = ref('');

    // Open modal
    const show = (code, currentNote) => {
      itemCode.value = code || '';
      noteText.value = currentNote || '';
      originalNote.value = currentNote || '';

      if (modalElement.value && !modalInstance) {
        modalInstance = new Modal(modalElement.value);
      }

      if (modalInstance) {
        modalInstance.show();

        // Focus textarea after modal is shown
        nextTick(() => {
          if (textareaRef.value) {
            textareaRef.value.focus();
            // Move cursor to end
            textareaRef.value.setSelectionRange(noteText.value.length, noteText.value.length);
          }
        });
      }
    };

    // Close modal
    const hide = () => {
      if (modalInstance) {
        modalInstance.hide();
      }
    };

    // Save note
    const saveNote = () => {
      emit('note-saved', {
        priceCode: itemCode.value,
        note: noteText.value
      });
      hide();
    };

    return {
      modalElement,
      textareaRef,
      itemCode,
      noteText,
      show,
      hide,
      saveNote
    };
  }
};
</script>

<style scoped>
/* Light Mode */
.modal-content {
  background-color: white;
  color: #212529;
}

.modal-header {
  background-color: white;
  border-bottom: 1px solid #dee2e6;
}

.modal-body {
  background-color: white;
}

.modal-footer {
  background-color: white;
  border-top: 1px solid #dee2e6;
}

.form-control {
  background-color: white;
  border-color: #dee2e6;
  color: #212529;
}

.form-control:focus {
  background-color: white;
  border-color: #0d6efd;
  color: #212529;
}

.form-label {
  color: #212529;
  font-weight: 500;
}

.form-text {
  color: #6c757d;
}

/* Dark Mode */
[data-theme="dark"] .modal-content {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

[data-theme="dark"] .modal-header {
  background-color: var(--bg-secondary);
  border-bottom-color: var(--border-color);
  color: var(--text-primary);
}

[data-theme="dark"] .modal-header .modal-title {
  color: var(--text-primary);
}

[data-theme="dark"] .modal-header .btn-close {
  filter: invert(1);
}

[data-theme="dark"] .modal-body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

[data-theme="dark"] .modal-footer {
  background-color: var(--bg-secondary);
  border-top-color: var(--border-color);
}

[data-theme="dark"] .form-control {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

[data-theme="dark"] .form-control:focus {
  background-color: var(--bg-secondary);
  border-color: #0d6efd;
  color: var(--text-primary);
}

[data-theme="dark"] .form-control::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

[data-theme="dark"] .form-label {
  color: var(--text-primary);
}

[data-theme="dark"] .form-text {
  color: var(--text-secondary);
}
</style>
